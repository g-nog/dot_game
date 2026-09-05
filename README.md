# Dot Games

A gallery of three local, two-player strategy games: Triangle Duel, Constellations, and Galaxy Duel. The rules and canonical language are in [`CONTEXT.md`](CONTEXT.md).

## Develop

Use Node 24 LTS and npm:

```sh
npm ci
npm run dev
```

Quality gates are `npm run format:check`, `npm run lint`, `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e`. Run `npm run benchmark` before physical-device playtests. Development builds show manual, local-only diagnostics copy/download on the result view. Set `VITE_ENABLE_PLAYTEST_DIAGNOSTICS=true` explicitly when a playtest production build needs those controls; ordinary production builds omit them. The export contains player IDs but no names and sends nothing over the network.

## Play

- `/index.html` — the game gallery.
- `/triangle-duel/index.html` — the original dice-and-triangle game, including saved-match recovery and diagnostics.
- `/galaxy-duel/index.html` — Triangle Duel in a procedural Three.js galaxy: luminous stars, animated connections and triangle claims, tap/drag/keyboard controls, and a separate saved match.
- `/constellations/index.html` — the celestial atlas game: draw or relocate one owned connection per turn, complete three structural targets, and cycle through four rematch matchups. Matches stay in memory; reloading starts at setup.

Constellations uses a flat Three.js star scene with SVG input and a usable no-WebGL fallback. Generated artwork is in `public/images/`; prompts are in [the asset record](docs/playtests/imagegen-assets.md). The fixed map, reproducible routes, benchmark results, and balance limitations are in [the verification record](docs/playtests/constellation-verification.md).

Browser checks now exercise production output. Install Chromium and WebKit with `npx playwright install --with-deps chromium webkit`, then run `npm run test:e2e`. An optional `PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH` supports an externally prepared WebKit wrapper on hosts without system dependencies; ordinary installations do not need it.

## Deploy

Connect the repository to Cloudflare Pages, select Node 24, use `npm run build`, and publish `dist`. `wrangler.toml` and `public/_headers` carry the output-directory and static security configuration. Non-production Git branches should use preview deployments; protect the production branch with the checks in `.github/workflows/ci.yml`.

Before release, smoke-test all three match sizes on a real iPhone and a representative mid-range Android phone. Record Extended-field feasibility timing from the local diagnostics and confirm the maximum remains below 50 ms. Cloudflare branch protection, production-domain configuration, rollback, and physical-device evidence require the connected external accounts/devices and are intentionally not fabricated by the repository.
