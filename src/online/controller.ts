import { legalEndpoints } from '../geometry/legal-lines';
import type { MatchSize } from '../domain/galaxy-duel/model';
import {
  CONNECTION_TIMEOUT_MS,
  HEARTBEAT_MS,
  type ClientMessage,
  type GuestProfile,
  type OnlineAction,
  type RoomView,
  type ServerMessage,
} from './protocol';

type SeatKey = { token: string; profile: GuestProfile; size: MatchSize; create: boolean };
export type OnlineSnapshot = {
  roomId?: string;
  room?: RoomView;
  seat?: number;
  connection: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  pending?: string;
  error?: string;
};
export class OnlineController {
  snapshot: OnlineSnapshot = { connection: 'idle' };
  private listeners = new Set<(value: OnlineSnapshot) => void>();
  private socket?: WebSocket;
  private key?: SeatKey;
  private retry?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private stopped = false;
  private lastReceived = 0;

  constructor(roomId?: string) {
    if (!roomId) return;
    this.snapshot.roomId = roomId;
    try {
      const saved = localStorage.getItem(`galaxy:online:${roomId}`);
      if (saved) {
        const key = JSON.parse(saved) as SeatKey;
        if (typeof key.token === 'string' && key.profile && typeof key.profile.name === 'string') {
          this.key = key;
          this.connect();
        }
      }
    } catch {
      /* A guest can still enter the room manually. */
    }
  }
  subscribe(listener: (value: OnlineSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  private publish(update: Partial<OnlineSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
  private saveKey(): void {
    localStorage.setItem(`galaxy:online:${this.snapshot.roomId}`, JSON.stringify(this.key));
  }
  enter(profile: GuestProfile, size: MatchSize): void {
    const create = !this.snapshot.roomId;
    const roomId = this.snapshot.roomId ?? crypto.randomUUID();
    this.key = {
      token: this.key?.token ?? crypto.randomUUID(),
      profile,
      size,
      create: this.key?.create ?? create,
    };
    this.publish({ roomId, error: undefined });
    try {
      this.saveKey();
    } catch {
      this.publish({
        connection: 'error',
        error: 'Allow browser storage to keep your seat safe when refreshing.',
      });
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('room', roomId);
    history.replaceState(null, '', url);
    this.connect();
  }
  private send(message: ClientMessage): void {
    this.socket?.send(JSON.stringify(message));
  }
  private connect(): void {
    if (!this.key || !this.snapshot.roomId) return;
    if (!/^[a-f0-9-]{36}$/.test(this.snapshot.roomId)) {
      this.publish({
        connection: 'error',
        error: 'This invite link is invalid. Ask your friend for a new one.',
      });
      return;
    }
    this.stopped = false;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    this.socket?.close();
    this.publish({
      connection: this.snapshot.room ? 'reconnecting' : 'connecting',
      pending: undefined,
    });
    const base = import.meta.env.VITE_MULTIPLAYER_URL || location.origin;
    const url = new URL(`/api/rooms/${this.snapshot.roomId}`, base);
    url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(url);
    this.socket = ws;
    this.lastReceived = Date.now();
    // Also time out a handshake which never completes.
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.lastReceived > CONNECTION_TIMEOUT_MS) ws.close();
      else if (ws.readyState === WebSocket.OPEN) this.send({ type: 'ping' });
    }, HEARTBEAT_MS);
    ws.onopen = () => {
      if (this.socket !== ws || !this.key) return;
      this.send({ type: 'hello', ...this.key });
    };
    ws.onmessage = (event) => {
      if (this.socket !== ws) return;
      this.lastReceived = Date.now();
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        ws.close();
        return;
      }
      if (message.type === 'snapshot') {
        if (this.key) {
          this.key.create = false;
          try {
            this.saveKey();
          } catch {
            /* The original seat key was saved before joining. */
          }
        }
        this.publish({
          room: message.room,
          seat: message.seat,
          connection: 'connected',
          pending: message.requestId === this.snapshot.pending ? undefined : this.snapshot.pending,
        });
      } else if (message.type === 'error') {
        this.publish({
          error: message.message,
          pending: message.requestId === this.snapshot.pending ? undefined : this.snapshot.pending,
        });
        if (message.fatal) {
          this.stopped = true;
          clearInterval(this.heartbeat);
          this.publish({ connection: 'error' });
        }
      }
    };
    ws.onclose = (event) => {
      if (this.socket !== ws) return;
      clearInterval(this.heartbeat);
      if ([4001, 4003, 4004].includes(event.code)) {
        this.stopped = true;
        this.publish({
          connection: 'error',
          pending: undefined,
          error: this.snapshot.error || event.reason || 'This connection has ended.',
        });
      }
      if (this.stopped) return;
      this.publish({ connection: 'reconnecting', pending: undefined });
      this.retry = setTimeout(() => this.connect(), 1500);
    };
    ws.onerror = () => ws.close();
  }
  get canAct(): boolean {
    const { room, seat, connection, pending } = this.snapshot;
    return (
      connection === 'connected' &&
      !pending &&
      !!room?.match &&
      !room.closed &&
      room.connected.every(Boolean) &&
      room.match.activePlayerIndex === seat
    );
  }
  eligibleEndpoints(from: string): string[] {
    const match = this.snapshot.room?.match;
    return this.canAct && match?.phase.kind === 'drawing-lines'
      ? legalEndpoints(match.dotField, match.lines, from)
      : [];
  }
  action(action: OnlineAction): void {
    const { room, connection, pending } = this.snapshot;
    if (
      !room ||
      connection !== 'connected' ||
      pending ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const id = crypto.randomUUID();
    this.publish({ pending: id, error: undefined });
    this.send({ type: 'action', id, version: room.version, action });
    // Never replay an uncertain action. Reconnect to get the authoritative snapshot.
    clearTimeout(this.retry);
    this.retry = setTimeout(() => {
      if (this.snapshot.pending === id) this.socket?.close();
    }, 8000);
  }
  destroy(): void {
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    const ws = this.socket;
    this.socket = undefined;
    ws?.close();
    this.listeners.clear();
  }
}
