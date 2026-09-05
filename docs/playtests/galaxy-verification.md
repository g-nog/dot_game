# Galaxy Duel verification

Galaxy Duel is an additional gallery entry at `/galaxy-duel/index.html`, using the existing Triangle Duel engine unchanged. It includes a procedural animated Three.js galaxy, luminous star sprites, animated glowing connections, and colored triangle claims. The artwork is a capture of real gameplay, with no external image dependencies.

## Evidence

- Node 24 production build produces all four entry pages in `dist`.
- Type checking and ESLint pass; all 54 unit tests pass.
- The shared Triangle Duel browser suite runs against both editions: 24 Chromium desktop/mobile checks and 12 iPhone WebKit checks passed. It covers setup, rules, cancelled drags, line commits, each save boundary in a three-line turn, reload/resume, corrupt storage, final scoring, board exhaustion, and alternating rematch starters.
- Six additional Chromium desktop/mobile checks passed, covering real WebGL initialization, tap and keyboard commits, isolated original-game saves, WebGL unavailability, and context loss.
- Desktop (1440 × 1000) and mobile (360 × 640) setup and gameplay screenshots were inspected. SVG input and Three.js rendering share the same aspect-preserving logical board rectangle.
- A final production smoke check verified the gallery artwork loads, its Play link opens Galaxy Duel, WebGL initializes without page errors, and successive reduced-motion board screenshots are identical.
- Reduced motion disables continuous GPU animation; hidden documents suspend animation; resources and observers are released on unmount. Three.js is loaded on demand.

## Limits

Browser device profiles are emulation, not physical phone performance measurements. No deployment was requested or performed. The Three.js chunk still produces Vite's size advisory (approximately 131 KB gzip).
