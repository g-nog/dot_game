import { DurableObject } from 'cloudflare:workers';
import {
  CONNECTION_TIMEOUT_MS,
  type ClientMessage,
  type ServerMessage,
} from '../src/online/protocol';
import {
  applyAction,
  joinRoom,
  newRoom,
  profile,
  publicRoom,
  syncPresence,
  type RoomData,
} from './room';

interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  ALLOWED_ORIGINS: string;
}
type Attachment = { seat?: number; lastSeen: number };
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return new Response('ok');
    const roomId = /^\/api\/rooms\/([a-f0-9-]{36})$/.exec(url.pathname)?.[1];
    if (!roomId) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return new Response('WebSocket required', { status: 426 });
    const origin = request.headers.get('Origin');
    if (
      !origin ||
      !env.ALLOWED_ORIGINS.split(',')
        .map((s) => s.trim())
        .includes(origin)
    )
      return new Response('Origin not allowed', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(request);
  },
} satisfies ExportedHandler<Env>;

export class GameRoom extends DurableObject<Env> {
  private room?: RoomData;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = await ctx.storage.get<RoomData>('room');
    });
  }
  private attachment(ws: WebSocket): Attachment {
    return ws.deserializeAttachment() as Attachment;
  }
  private sockets(): WebSocket[] {
    const now = Date.now();
    return this.ctx
      .getWebSockets()
      .filter(
        (ws) =>
          ws.readyState === WebSocket.OPEN &&
          now - this.attachment(ws).lastSeen < CONNECTION_TIMEOUT_MS,
      );
  }
  private presence(): boolean[] {
    const sockets = this.sockets();
    return [0, 1].map((seat) => sockets.some((ws) => this.attachment(ws).seat === seat));
  }
  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      ws.close(1011, 'Reconnect to the room');
    }
  }
  private broadcast(requestId?: string): void {
    if (!this.room) return;
    const room = publicRoom(this.room, this.presence());
    for (const ws of this.sockets()) {
      const { seat } = this.attachment(ws);
      if (seat !== undefined) this.send(ws, { type: 'snapshot', room, seat, requestId });
    }
  }
  private async save(): Promise<void> {
    if (this.room) {
      syncPresence(this.room, this.presence(), Date.now());
      await this.ctx.storage.put('room', this.room);
    }
    const deadlines = this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === WebSocket.OPEN)
      .map((ws) => this.attachment(ws).lastSeen + CONNECTION_TIMEOUT_MS);
    if (this.room) deadlines.push(this.room.expiresAt);
    if (deadlines.length)
      await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...deadlines)));
  }
  async fetch(): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (this.ctx.getWebSockets().length >= 6)
        return new Response('Too many connections', { status: 429 });
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment({ lastSeen: Date.now() } satisfies Attachment);
      await this.save();
      return new Response(null, { status: 101, webSocket: pair[0] });
    });
  }
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      let requestId: string | undefined;
      try {
        if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Invalid message.');
        const message = JSON.parse(raw) as ClientMessage;
        if (!message || typeof message !== 'object') throw new Error('Invalid message.');
        const attached = this.attachment(ws);
        if (message.type === 'hello') {
          if (attached.seat !== undefined) throw new Error('Already joined.');
          if (typeof message.token !== 'string' || !/^[a-f0-9-]{36}$/.test(message.token))
            throw new Error('Invalid seat key.');
          if (!this.room) {
            if (message.create !== true)
              throw new Error('Room not found or expired. Ask for a new invite.');
            this.room = newRoom(message.size, Date.now());
          }
          if (this.room.expiresAt <= Date.now()) throw new Error('This room has expired.');
          const seat = joinRoom(this.room, message.token, profile(message.profile));
          for (const old of this.ctx.getWebSockets()) {
            if (old !== ws && this.attachment(old).seat === seat) {
              old.serializeAttachment({ lastSeen: 0 } satisfies Attachment);
              old.close(4001, 'Your seat is open in another tab');
            }
          }
          ws.serializeAttachment({ seat, lastSeen: Date.now() } satisfies Attachment);
          await this.save();
          this.broadcast();
        } else {
          if (attached.seat === undefined || !this.room) throw new Error('Join the room first.');
          // Expired connections must reauthenticate rather than revive an old seat.
          if (Date.now() - attached.lastSeen >= CONNECTION_TIMEOUT_MS) {
            ws.close(4000, 'Connection timed out');
            return;
          }
          attached.lastSeen = Date.now();
          ws.serializeAttachment(attached);
          if (message.type === 'ping') {
            const wasPaused = this.room.pausedAt;
            await this.save();
            this.send(ws, { type: 'pong' });
            if (wasPaused !== this.room.pausedAt) this.broadcast();
            return;
          }
          if (
            message.type !== 'action' ||
            typeof message.id !== 'string' ||
            message.id.length > 80 ||
            !Number.isSafeInteger(message.version) ||
            !message.action ||
            typeof message.action !== 'object'
          )
            throw new Error('Invalid action.');
          requestId = message.id;
          applyAction(
            this.room,
            attached.seat,
            message.version,
            message.action,
            this.presence(),
            Date.now(),
          );
          await this.save();
          this.broadcast(requestId);
        }
      } catch (error) {
        const fatal = this.attachment(ws).seat === undefined;
        this.send(ws, {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to apply action.',
          fatal,
          requestId,
        });
        if (fatal) ws.close(4003, 'Unable to join');
        else {
          await this.save();
          this.broadcast();
        }
      }
    });
  }
  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      ws.serializeAttachment({ lastSeen: 0 } satisfies Attachment);
      ws.close(1000, 'Disconnected');
      await this.save();
      this.broadcast();
    });
  }
  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
  async alarm(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      if (this.room && this.room.expiresAt <= now) {
        for (const ws of this.ctx.getWebSockets()) ws.close(4004, 'Room expired');
        this.room = undefined;
        await this.ctx.storage.deleteAll();
        return;
      }
      for (const ws of this.ctx.getWebSockets()) {
        if (now - this.attachment(ws).lastSeen >= CONNECTION_TIMEOUT_MS) {
          ws.serializeAttachment({ lastSeen: 0 } satisfies Attachment);
          ws.close(4000, 'Connection timed out');
        }
      }
      await this.save();
      this.broadcast();
    });
  }
}
