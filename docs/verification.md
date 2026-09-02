# Triangle Duel v1 verification record

Local verification performed on 2026-08-31:

| Requirement | Evidence |
| --- | --- |
| Reproducible install | `npm ci` passed from the committed lockfile |
| Formatting and lint | `npm run format:check` and `npm run lint` passed |
| Strict TypeScript/Svelte | `npm run check` passed with zero errors and warnings |
| Examples and bounded properties | `npm test` passed, including exact geometry, scoring, state, generation, recovery, and complete generated matches |
| Static production output | `npm run build` passed with source maps disabled |
| Chromium portrait and desktop | All Playwright journeys passed |
| Mobile Safari/WebKit emulation | All Playwright WebKit journeys passed using the installed WPE browser |
| Quota solver harness | `npm run benchmark` measured a representative Extended mid-match quota-six mean of 2.44 ms on the development host |
| Minimum viewport | Playwright checks 360 × 640 with no horizontal overflow; CSS replaces the field below either supported dimension |
| Reduced motion | Browser coverage verifies the zero-duration reduced-motion tokens |
| Security/static hosting | `_headers`, `wrangler.toml`, CI, and a source-map-free `dist` build are present |

The WebKit run used temporary user-space copies of missing Ubuntu runtime libraries because this development host does not permit sudo. The application ran in the real Playwright WebKit/WPE browser; CI installs the same browser dependencies through the official Playwright installer.

## External evidence still outstanding

Repository automation cannot prove the following without the target accounts and devices:

- complete real-device matches on a supported iPhone and representative mid-range Android phone;
- the sub-50 ms Extended solver target on those physical devices;
- protected GitHub checks, Cloudflare preview/production deployment, production-domain headers, and provider rollback.

Do not mark these external release gates complete based only on emulation or repository configuration.
