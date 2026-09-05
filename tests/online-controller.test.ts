import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnlineController } from '../src/online/controller';
import type { RoomView, ServerMessage } from '../src/online/protocol';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: (event: { code: number; reason: string }) => void;
  sent: string[] = [];
  constructor() {
    FakeSocket.instances.push(this);
  }
  send(message: string) {
    this.sent.push(message);
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: '' });
  }
  receive(message: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}
const lobby: RoomView = {
  size: 'quick',
  players: [null, null],
  connected: [true, false],
  version: 1,
  closed: false,
  rematchVotes: [],
};
let controller: OnlineController | undefined;
afterEach(() => {
  controller?.destroy();
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  FakeSocket.instances = [];
});
describe('online transport recovery', () => {
  it('persists the seat before joining and never replays an uncertain action', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    controller = new OnlineController();
    controller.enter({ name: 'Guest', color: '#e76f51' }, 'quick');
    const socket = FakeSocket.instances[0];
    const key = JSON.parse(localStorage.getItem(`galaxy:online:${controller.snapshot.roomId}`)!);
    expect(key.token).toBeTruthy();
    socket.onopen?.();
    expect(JSON.parse(socket.sent[0]).token).toBe(key.token);
    socket.receive({ type: 'snapshot', room: lobby, seat: 0 });
    controller.action({ type: 'LEAVE' });
    expect(controller.snapshot.pending).toBeTruthy();
    await vi.advanceTimersByTimeAsync(9500);
    const replacement = FakeSocket.instances[1];
    replacement.onopen?.();
    expect(replacement.sent.map((s) => JSON.parse(s).type)).toEqual(['hello']);
    expect(controller.snapshot.pending).toBeUndefined();
    expect(JSON.parse(replacement.sent[0]).create).toBe(false);
  });
  it('stops reconnecting after another tab takes the seat', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    controller = new OnlineController();
    controller.enter({ name: '', color: '#e76f51' }, 'quick');
    const socket = FakeSocket.instances[0];
    socket.onclose?.({ code: 4001, reason: 'Your seat is open in another tab' });
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(controller.snapshot.connection).toBe('error');
  });
});
