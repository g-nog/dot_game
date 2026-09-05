# Galaxy Duel

A local and online two-player strategy game: roll the die, connect stars, and claim triangles. The rules and canonical language are in [`CONTEXT.md`](CONTEXT.md).

## Develop

Use Node 24 LTS and npm:

```sh
npm ci
npm run dev
```

For online play, also run `npm run dev:server` in a second terminal. Vite proxies `/api` WebSockets to the local Cloudflare runtime on port 8787. Open `http://localhost:5173`, choose **Play online**, and share the invite with another browser profile. Two tabs in the same profile intentionally share a seat, so use a private window to simulate the opponent. Local play works without the server.

Quality gates are `npm run format:check`, `npm run lint`, `npm run check`, `npm test`, `npm run build`, `npm run build:server`, and `npm run test:e2e`. Run `npm run benchmark` before physical-device playtests. Development builds show manual, local-only diagnostics copy/download on the result view. Set `VITE_ENABLE_PLAYTEST_DIAGNOSTICS=true` explicitly when a playtest production build needs those controls; ordinary production builds omit them. The export contains player IDs but no names and sends nothing over the network.

## Play

Open `/` to play Galaxy Duel directly. The game supports tap, drag, and keyboard controls, saved-match recovery, selectable space backgrounds, and a playable SVG fallback when WebGL is unavailable. Existing Galaxy Duel saves are preserved.

Browser checks now exercise production output. Install Chromium and WebKit with `npx playwright install --with-deps chromium webkit`, then run `npm run test:e2e`. An optional `PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH` supports an externally prepared WebKit wrapper on hosts without system dependencies; ordinary installations do not need it.

## Deploy

Connect the repository to Cloudflare Pages, select Node 24, use `npm run build`, and publish `dist`. `wrangler.toml` and `public/_headers` carry the output-directory and static security configuration. Non-production Git branches should use preview deployments; protect the production branch with the checks in `.github/workflows/ci.yml`.

Before release, smoke-test all three match sizes on a real iPhone and a representative mid-range Android phone. Record Extended-field feasibility timing from the local diagnostics and confirm the maximum remains below 50 ms. Cloudflare branch protection, production-domain configuration, rollback, and physical-device evidence require the connected external accounts/devices and are intentionally not fabricated by the repository.

## Deploy online play

The existing `wrangler.toml` deploys the static Pages site. The separate `server/wrangler.toml` configures the multiplayer Worker and the SQLite Durable Object migration.

1. Set `ALLOWED_ORIGINS` in `server/wrangler.toml` to your exact frontend origin(s), separated by commas, for example `https://triangle-duel.pages.dev,https://your-game.example`. Include only origins you intend to use; preview domains must be added explicitly. `npm run dev:server` overrides the origin list for local testing.
2. Authenticate Wrangler to your Cloudflare account and run `npm run deploy:server`. Record the HTTPS Worker URL printed by the deployment.
3. Set the Pages build environment variable `VITE_MULTIPLAYER_URL` to that URL, for example `https://galaxy-duel-multiplayer.<your-subdomain>.workers.dev`, and rebuild/redeploy Pages. No Pages Functions or Durable Object binding on Pages is needed; the browser connects directly to the Worker via WSS. The existing CSP permits WSS connections.
4. Open the deployed site in two separate browser profiles or devices. Create an invite, join it, draw a line, refresh one device, and confirm the same match resumes. Verify leaving closes the room for both guests.

`npm run build:server` bundles the Worker as a **dry run**; it does not deploy anything. Browser tests start both the production frontend preview and local Worker automatically and exercise real WebSocket connections. The Worker stores guest names, colors, board state, and private seat keys within its room storage. Inactive rooms are deleted after 24 hours. Local-only diagnostics exports remain confined to local matches.

Production uses https://triangle-duel.pages.dev and the Worker URL saved in `.env.production`. For subsequent releases, run `npm run deploy:server` when backend code changes, then `npm run deploy:site` to build and upload the frontend to production. The Pages project uses direct uploads.
