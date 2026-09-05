# 0002: One authoritative Durable Object per online room

Status: Accepted

## Context

Galaxy Duel needs private two-guest matches played simultaneously on separate devices, with invite links and reconnection but no accounts. Its existing TypeScript state machine and geometry code are independent of the Svelte interface.

## Decision

Keep the static Pages application and add a separately deployed Cloudflare Worker. Route each random room ID to one SQLite-backed Durable Object. The object persists a complete room snapshot, runs the existing rules, generates board seeds and dice results, and broadcasts state through hibernation-compatible WebSockets.

The first socket message authenticates a browser-generated random seat key. This key is saved before joining, retained separately from the public invite URL, and omitted from all public snapshots. A seat has at most one current connection. Only explicit configured browser origins may connect.

Serialize room events and persist accepted changes before broadcasting. Gameplay commands include the last observed board version; stale actions fail and receive a current snapshot. Clients never automatically retry an uncertain action. Transport request IDs clear pending controls; board versions prevent a repeated game action from applying twice.

Presence is checked on every action. Heartbeats and Durable Object alarms remove silent connections after 45 seconds. Either missing guest pauses gameplay. The two-minute grace period changes the waiting message, without forcing a loss or preventing later reconnection. Both guests must consent to a rematch. Inactive rooms are cleaned up after 24 hours.

## Consequences

The current local controller and browser saves remain independent. The online controller reuses rendering and rule-derived views, while authority and online persistence move to the server. Production requires deploying the Worker, configuring its exact permitted frontend origins, and setting the Pages build variable `VITE_MULTIPLAYER_URL`.

There is no cross-device identity recovery. A lost browser seat key cannot be replaced using only the invite link. Heartbeats introduce periodic work while a room is occupied; hibernation remains possible between messages. A public launch with substantial traffic should add account-level rate limits and monitor room creation and CPU usage.

References: [Cloudflare WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [Durable Objects setup](https://developers.cloudflare.com/durable-objects/get-started/).
