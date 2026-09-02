# Triangle Duel v1 implementation plan

## Outcome

Deliver a browser-first, local two-player Triangle Duel that is fully playable in portrait at 360 × 640 CSS pixels and larger. The application is a static client-side site: it generates and resolves matches locally, recovers the latest unfinished match on the same browser profile, and deploys through GitHub and Cloudflare Pages.

The canonical rules and vocabulary live in [`CONTEXT.md`](../../CONTEXT.md). This plan uses those terms directly; implementation names should do the same.

## v1 boundaries

### Included

- Local, untimed, head-to-head Triangle Duel
- Quick (20-dot), Standard (30-dot), and Extended (40-dot) match sizes
- Touch and mouse line drawing on a responsive portrait-first SVG dot field
- Exact line legality, quota feasibility, forfeited and incomplete turns, scoring triangles, multi-claims, board exhaustion, draws, and rematches
- One resumable match per browser profile
- Concise visual rules available from setup and an active match
- Local developer playtest diagnostics and JSON export
- Modern Chromium, WebKit/Safari, and Firefox support at Vite's default production baseline

### Excluded

- Online play, accounts, leaderboards, or any backend
- Native packaging, PWA installation, service workers, or guaranteed offline reloads
- Three.js, Canvas, or 3D presentation
- A generic multi-game engine before a second mode exists
- Keyboard operation of the dot field or a complete nonvisual board interaction model
- Remote analytics, sound, vibration, and user-visible board/share codes
- Legacy browser bundles and polyfills

## Technology baseline

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime and package manager | Node.js 24 LTS, npm | Pin the Node major and commit `package-lock.json` |
| Language | Strict TypeScript | No game-domain logic inside Svelte components |
| UI | Svelte | A single client-side application; no SvelteKit or router is required for v1 |
| Build | Vite | Emit host-neutral static assets |
| Dot field | SVG and Pointer Events | SVG projects authoritative logical geometry; it does not define legality |
| Styling | Tailwind CSS plus CSS custom properties | Use local component CSS/SVG attributes for geometry and board interaction |
| State | Pure TypeScript state machine | Discriminated states and commands; no external state-machine library |
| Persistence | Versioned JSON in `localStorage` | Validate before restoration; retain at most one unfinished match |
| Unit and component tests | Vitest | Include deterministic fixtures and focused Svelte interaction tests |
| Generative tests | fast-check | Exercise geometry invariants and command sequences with reproducible seeds |
| End-to-end tests | Playwright | Cover Chromium and WebKit, portrait touch emulation, and recovery |
| Static analysis | `svelte-check`, ESLint, Prettier | Run separately from Vite because Vite transpiles rather than type-checks |
| Source and CI | GitHub and GitHub Actions | Required checks on pull requests and the protected production branch |
| Hosting | Cloudflare Pages Git integration | Preview non-production branches; deploy the production branch after merge |

Dependencies should be installed at their current stable releases when the project is scaffolded and resolved versions committed in the lockfile. Avoid speculative runtime dependencies.

## Architectural boundaries

```text
src/
├── domain/triangle-duel/
│   ├── model.ts              # DotField, Turn, LineQuota, CommittedLine, claims
│   ├── state-machine.ts      # states, commands, transitions, invariants
│   ├── selectors.ts          # derived scores, active player, visible status
│   └── diagnostics.ts        # domain-safe playtest measurements
├── geometry/
│   ├── predicates.ts         # exact orientation and containment predicates
│   ├── legal-lines.ts        # candidate enumeration and legality
│   ├── quota-feasibility.ts  # depth-limited compatible-line search
│   └── scoring-triangles.ts  # final-side claims and multi-claim detection
├── generation/
│   ├── random.ts             # injected seeded board RNG and die RNG boundary
│   └── dot-field.ts          # match-size generation and validation
├── application/
│   ├── match-controller.ts   # connects state machine, persistence, and UI
│   ├── persistence.ts        # snapshot envelope, validation, replacement
│   └── playtest-export.ts    # developer-only JSON download/copy flow
├── components/
│   ├── DotField.svelte
│   ├── MatchSetup.svelte
│   ├── MatchStatus.svelte
│   ├── DieControl.svelte
│   ├── RulesView.svelte
│   └── MatchResult.svelte
├── App.svelte
└── main.ts

tests/
├── fixtures/                 # named dot fields and reproducible edge cases
├── e2e/                      # complete browser journeys
└── performance/              # solver and interaction benchmark harness
```

Dependency direction is one-way: Svelte components call the application controller; the controller calls the Triangle Duel state machine; the state machine uses pure geometry and generation functions. Domain and geometry modules must not import Svelte, browser storage, SVG, or Tailwind.

Do not introduce generic `Game`, `Board`, or `Move` abstractions. Use the established names `TriangleDuelMatch`, `DotField`, `CommittedLine`, `LineQuota`, and `ClaimedTriangle`. Extract shared concepts only when another implemented mode proves they are shared.

## Authoritative models

### Geometry

- Represent every dot as an immutable ID and integer `(x, y)` coordinates within a fixed portrait-oriented logical rectangle.
- Keep coordinates and intermediate orientation products within JavaScript's exact safe-integer range.
- Store endpoint IDs on lines. Resolve geometry from the authoritative dot table rather than copying screen coordinates.
- Implement orientation, point-on-segment, segment intersection/touch/overlap, strict point-in-triangle, and collinearity as pure predicates.
- Treat shared endpoints as allowed. Reject any other intersection, touch, overlap, or passage through a third dot.
- Use [ADR 0001](../adr/0001-exact-logical-geometry.md) as the governing decision.
- Fit the logical rectangle uniformly into the SVG `viewBox`. Never stretch axes independently or regenerate dots after a resize or rotation.
- Convert pointer positions into the SVG coordinate system only to select an endpoint ID. Pointer coordinates never become game geometry.

### Match state machine

Use discriminated phases so invalid actions are unrepresentable or rejected explicitly:

1. `awaiting-roll`
2. `drawing-lines`, with the revealed line quota and committed count
3. `awaiting-end-turn`, with reason `quota-complete`, `forfeited`, or `incomplete`
4. `result`

Setup and recovery selection are application states outside the active match state machine.

Commands are explicit: `ROLL_DIE`, `COMMIT_LINE`, `END_TURN`, and `START_REMATCH`. Each accepted command returns a new state plus typed facts for presentation and diagnostics. Components must not mutate scores, lines, claims, quotas, or player order directly.

Transition rules:

- `ROLL_DIE` records the revealed quota immediately. If no compatible line sequence can satisfy it, enter `awaiting-end-turn: forfeited`.
- `COMMIT_LINE` accepts endpoint IDs only after the state machine revalidates legality; UI guidance is not an authority.
- After a committed line, detect and award every scoring triangle completed by that line before checking board exhaustion.
- If the board is exhausted, enter `result` immediately without an end-turn handoff.
- Otherwise, if the quota is complete, require end-turn acknowledgment.
- Otherwise, if no compatible continuation satisfies the remaining quota, enter `awaiting-end-turn: incomplete` and retain all committed lines and claims.
- `END_TURN` is valid only from `awaiting-end-turn`; it rotates the active player and returns to `awaiting-roll`.
- A rematch creates a fresh dot field, preserves setup options, and starts with the other player.

### Scoring

When a line `(a, b)` is committed:

1. Find dots connected directly to both `a` and `b`.
2. For each common neighbor, form the three-direct-line triangle.
3. Reject degenerate triangles and any triangle containing another dot strictly inside.
4. Deduplicate by a canonical sorted triple of dot IDs.
5. Claim every new valid triangle for the active player in the same transition.

Because committed lines are planar and a scoring triangle has exactly three direct sides and no interior dot, its interior cannot already contain a legal line. Keep regression fixtures for composite triangles, boundary cases, and multi-claims rather than relying on that inference silently.

### Randomness and dot-field generation

- Obtain an internal board seed from `crypto.getRandomValues` and pass an injected deterministic RNG into dot-field generation.
- Store both the seed and generated integer dots. Restoration uses stored dots, so a later generator revision cannot mutate an existing match.
- Generate within fixed logical margins and enforce a minimum dot separation appropriate to each match size.
- Reject duplicate points and collinear triples that would create ambiguous-looking layouts.
- Validate every generated field against the match-size count and geometry invariants before starting the match.
- Generate die results from an injected browser-crypto-backed source with unbiased values from one through six. Tests use deterministic fakes.
- Keep board seeds invisible in normal UI; include them only in developer diagnostics.

### Quota feasibility

- Enumerate lines that are legal against the current committed lines and dots.
- Search for a mutually compatible sequence whose length equals the remaining quota, which is never greater than six.
- Use deterministic ordering, candidate-count pruning, and incremental incompatibility filtering; stop at the first witness sequence.
- Do not expose the witness sequence to the player. Endpoint guidance continues to show current legality only, as required by `CONTEXT.md`.
- Cache only within a single state evaluation initially. Add cross-command memoization only if profiling demonstrates value.
- Target less than 50 ms per feasibility check on a representative mid-range physical phone. Keep the implementation synchronous unless measurements exceed the budget; a Web Worker is a measured fallback.

## Presentation and interaction

### Responsive shell

- Design at 360 × 640 CSS pixels first, then add wider breakpoints.
- Keep the active player's identity, both scores, revealed quota, and committed progress visible during a match.
- Preserve the SVG aspect ratio and accept surrounding empty space rather than distorting the dot field.
- If either viewport dimension falls below the supported minimum, replace the board with a clear larger-screen message; do not silently shrink hit targets below usability.

### SVG layers

Render stable layers in this order:

1. claimed-triangle fills
2. committed lines
3. current drag preview
4. dots and invisible touch targets
5. transient claim/status effects

Use visible dots independently from approximately 44 px touch targets. When eligible touch targets overlap, select the nearest eligible dot with a deterministic dot-ID tie-break. Use pointer capture during a drag and handle cancellation without changing quota progress.

### Styling and motion

- Use Tailwind for page structure, responsive placement, typography, dialogs, and controls.
- Use CSS custom properties for the curated player colors, surfaces, focus styles, and motion durations.
- Keep complex SVG selectors and geometry-dependent styles next to `DotField.svelte`.
- Use short CSS/Svelte transitions for die reveal, line commit, and claims. Transitions must not delay authoritative state changes or block input longer than their visible feedback requires.
- Honor `prefers-reduced-motion`; keep all status changes understandable without animation or color alone.
- Do not add an animation library, sound assets, or haptic APIs in v1.

## Persistence and recovery

Use one namespaced `localStorage` key containing a versioned envelope:

```ts
type StoredMatchEnvelope = {
  schemaVersion: 1;
  savedAt: string;
  match: TriangleDuelMatch;
  diagnostics: MatchDiagnostics;
};
```

- Persist after every accepted state-changing command, including die reveal, each committed line, end-turn handoff, and rematch creation.
- Write a complete snapshot, not a partially updated set of keys.
- Validate parsed JSON, the schema version, referenced dot/player IDs, phase-specific fields, and core match invariants before offering Resume match.
- Treat malformed or unsupported data as unrecoverable: explain that the unfinished match cannot be resumed, allow it to be discarded, and never crash startup.
- Starting a new match while a resumable match exists requires confirmation. Confirming atomically replaces the old snapshot.
- Completing a match removes the resumable-match offer but retains its in-memory diagnostics for the result view and optional developer export.
- Do not attempt cross-device sync, multi-match storage, or indefinite schema migrations in v1. Add a migration only if the schema changes before release.

## Playtest diagnostics

Collect locally without player identity or network transmission:

- schema/app version and internal board seed
- match size and duration
- starting player and winner/draw
- per-player roll histogram and cumulative roll total
- committed-line count, claimed-triangle count, and multi-claim count
- forfeited-turn and incomplete-turn counts
- turn count and board-exhaustion point
- maximum and sampled feasibility-check durations

Expose copy/download JSON only when a developer flag is enabled. Document that the export is manual and contains no names by default; use player IDs instead. This data exists to evaluate the roll-balance concern recorded in `CONTEXT.md`, not as a general analytics framework.

## Automated verification

### Geometry and rule examples

Create named fixtures for at least:

- shared-endpoint lines, proper crossings, endpoint-on-interior touches, overlaps, and a line through a third dot
- a simple scoring triangle, a triangle with an interior dot, a composite triangle, and a multi-claim
- exact quota completion, an immediate forfeited turn, and an incomplete turn after one or more committed lines
- board exhaustion on a scoring line, a normal win, a draw, and rematch starting-player alternation
- refresh after die reveal, after each committed line, and while awaiting end-turn acknowledgment
- corrupt, unsupported, and internally inconsistent saved snapshots

### Property and model tests

Use fast-check with recorded failure seeds to assert:

- orientation and intersection predicates are symmetric where mathematically required
- generated dot fields contain the requested count, unique integer points, margins, and minimum spacing
- accepted lines never create a forbidden intersection or pass through another dot
- claimed triangle keys are unique and scores equal the number of claims per player
- any feasibility witness has exactly the requested length and remains legal when committed in order
- randomized accepted command sequences always preserve state invariants
- serializing and restoring a valid active match preserves its observable state

### Browser tests

Playwright must cover:

- setup through result and rematch
- drag commit and canceled drag using pointer input
- portrait view at 360 × 640 and at least one wider desktop viewport
- Mobile Safari/WebKit and Chromium projects
- resume, replace-confirmation, and corrupt-storage flows
- rules view from setup and during a match
- reduced-motion presentation and non-color status labels

Browser emulation validates viewport and touch behavior, not physical-device performance. Before release, run the solver benchmark and a complete Extended match smoke test on at least one representative mid-range phone and one real iPhone supported by the browser baseline.

## Delivery milestones

### Milestone 1 — Foundation and deployable shell

Tasks:

- Scaffold Svelte + strict TypeScript + Vite with Node 24 and npm metadata.
- Add Tailwind, CSS design tokens, ESLint, Prettier, `svelte-check`, Vitest, fast-check, and Playwright.
- Add scripts for `dev`, `check`, `lint`, `format:check`, `test`, `test:e2e`, and `build`.
- Build the responsive application shell and placeholder setup/match/result screens at 360 × 640 and desktop widths.
- Add GitHub Actions for install, static checks, unit tests, production build, and an initial Chromium/WebKit smoke test.
- Configure Cloudflare Pages for `npm run build` and Vite's output directory after the repository is connected.

Exit criteria:

- A static placeholder deploys successfully to a preview URL.
- All checks run from a clean clone with the committed lockfile.
- The shell has no horizontal overflow at the minimum viewport.

### Milestone 2 — Fixed-field playable tracer bullet

Tasks:

- Implement authoritative model types and exact geometry predicates test-first.
- Add legal-line enumeration and scoring-triangle detection with named fixtures.
- Implement the explicit match state machine with injected die results.
- Render one deterministic fixed dot field in SVG with claims, committed lines, previews, dots, and touch targets.
- Connect pointer drag/cancel behavior to authoritative `COMMIT_LINE` commands.
- Display active player, scores, quota progress, and end-turn acknowledgment.
- Drive a short deterministic match to a result in Playwright.

Exit criteria:

- A fixed match can be played end to end by touch or mouse.
- Illegal UI input cannot mutate match state.
- Geometry, scoring, multi-claim, and basic state transitions are covered by unit and property tests.

### Milestone 3 — Generated fields and complete rules

Tasks:

- Implement seeded dot-field generation for all three match sizes.
- Implement browser-crypto die rolls and deterministic test adapters.
- Implement compatible-line sequence search, forfeited turns, and incomplete turns.
- Complete board-exhaustion, win/draw, starting-player, rematch, and setup-option behavior.
- Add setup validation for distinct curated player colors and optional short names.
- Add the concise visual rules view from setup and active play.
- Instrument feasibility timings and build the benchmark harness.

Exit criteria:

- Every relationship in `CONTEXT.md` maps to at least one automated example or property test.
- Generated Quick, Standard, and Extended matches start and progress without invariant failures across a large seeded test sample.
- Feasibility checks satisfy the 50 ms physical-device target or produce profiling evidence for moving only that calculation to a worker.

### Milestone 4 — Resumable match

Tasks:

- Define and validate the versioned snapshot envelope.
- Save after every accepted state change and restore all match phases exactly.
- Add landing-screen Resume match and New setup paths.
- Add replacement confirmation and unrecoverable-snapshot handling.
- Verify reload cannot reroll a revealed quota or remove committed lines.

Exit criteria:

- Playwright reload tests pass at every persistence boundary.
- A corrupt snapshot cannot crash the app or enter an invalid match.
- Only the latest unfinished match is retained.

### Milestone 5 — Mobile polish and playtest evidence

Tasks:

- Tune dot generation, visible dot size, and hit-target resolution on real portrait phones.
- Add non-blocking die, line, and claim motion plus reduced-motion behavior.
- Finish status explanations for forfeited and incomplete turns.
- Add local diagnostic collection and developer-only JSON export.
- Run structured Quick, Standard, and Extended playtests and inspect roll/claim summaries.
- Record any resulting rule changes in `CONTEXT.md` immediately; create further ADRs only when the ADR criteria are met.

Exit criteria:

- All match sizes are usable at 360 × 640 without zoom or accidental page gestures.
- A playtester can understand every phase transition without developer explanation.
- Exported diagnostics are schema-versioned, contain no player names, and require no network.

### Milestone 6 — Release hardening

Tasks:

- Run the complete unit, property, Chromium, and WebKit suites in CI.
- Test the Vite browser baseline, real iPhone Safari, and a representative mid-range Android device.
- Profile Extended matches, especially late-game quota searches and dense SVG hit testing.
- Add static security headers appropriate to Cloudflare Pages and verify no source maps or diagnostics controls leak unintentionally in production.
- Configure branch protection, Cloudflare preview builds, production domain settings, and rollback procedure.
- Perform a clean-storage release smoke test from setup through rematch and recovery.

Exit criteria:

- Required GitHub checks are green and protect the production branch.
- The production build deploys as static assets and passes the release smoke tests.
- Known balance findings and deferred work are documented without silently changing the v1 rules.

## CI gates

Pull requests must pass:

1. reproducible `npm ci`
2. formatting and lint checks
3. `svelte-check` and TypeScript checks
4. Vitest example and bounded property suites
5. production build
6. Playwright Chromium and WebKit smoke journeys

Run larger seeded/property samples and the full end-to-end suite on the production branch or a scheduled workflow if pull-request duration becomes excessive. Never weaken invariant coverage merely to reduce CI time; move statistically broader runs to the scheduled tier.

## Principal risks and responses

| Risk | Early signal | Response |
| --- | --- | --- |
| Quota search grows combinatorially | Checks approach 50 ms late in Extended matches | Profile ordering/pruning; isolate only the search in a worker if still over budget |
| Dense portrait fields cause wrong endpoint selection | Mis-taps or overlapping targets in Extended playtests | Tune generation spacing and nearest-eligible selection using real-device recordings |
| Geometry differs across devices | A saved seed produces different legality or scoring | Keep integer logic authoritative and add the seed as a regression fixture |
| Saved data becomes incompatible | Startup fails after a schema change | Validate the envelope, preserve coordinates, and add explicit migrations or discard UX |
| Dice variance overwhelms tactics | Roll totals strongly predict outcomes in exports | Complete v1 playtests, then evaluate the documented equal-per-round-roll alternative |
| UI state bypasses domain rules | Scores or lines differ after recovery | Route every accepted action through the pure state machine and test round trips |

## Definition of done

Triangle Duel v1 is done when two players can complete and rematch all three match sizes by touch or mouse on supported portrait and desktop browsers; all rules in `CONTEXT.md` are enforced by the pure state machine; geometry remains exact and stable across resizing and recovery; an interrupted match resumes without rerolls or lost commits; automated checks pass in GitHub Actions; physical-device performance meets the agreed target; and the static production build is deployed through Cloudflare Pages.
