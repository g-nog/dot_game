# Game gallery and constellation PvP implementation plan

## Outcome and status

Build a game-selection gallery linking to the existing Triangle Duel and a separate local, two-player constellation game derived from it. Deliver a complete constellation match on one fixed star map with the agreed celestial-atlas presentation. Constellation matches live in memory while their page is open; saved sessions are not required.

Implementation and verification are recorded in [constellation-verification.md](../playtests/constellation-verification.md). This document preserves the original implementation scope. The accepted design is in [CONTEXT.md](../../CONTEXT.md). The earlier [Triangle Duel plan](2026-08-31-triangle-duel-v1.md) remains historical context for that game; its single-game exclusions do not prohibit the newly agreed gallery.

The first playable milestone must answer: does spending a turn blocking feel worthwhile, and can the opponent recover? Completing the interface alone does not establish game balance.

## Scope

- Gallery with distinct previews, descriptions, and Play links to separate game pages.
- Preserve Triangle Duel's rules, existing saved-match format, and diagnostics.
- Constellations: one fixed map, two fixed public target sequences, owned connections, drawing, relocation, completion selection, explicit handoff, results, and four-matchup rematches.
- Independent game pages; no constellation persistence, saved-session restoration, or shared session manager.
- Flat interactive star map with visual depth, luminous stars, player-colored connections, and brief completion illustrations.
- Local play on one shared device. Online play, solo campaigns, procedural maps, additional playable maps, and true 3D gameplay are deferred.
- No deployment, publishing, or removal of an existing game is part of this implementation plan.

## Existing code and intended boundaries

| Existing area | Planned use |
| --- | --- |
| `src/App.svelte` | Keep as the original Triangle Duel screen, mounted by its own page entry; add separate gallery and constellation roots. |
| `src/application/match-controller.ts`, `persistence.ts` | Leave with Triangle Duel; the constellation controller holds state in memory and has no persistence counterpart. |
| `src/domain/triangle-duel/` | Preserve the existing rule engine; add `src/domain/constellation/` alongside it. |
| `src/geometry/predicates.ts`, `legal-lines.ts` | Reuse exact segment legality; extract minimal coordinate/endpoint types from Triangle Duel dependencies where necessary. |
| `src/geometry/scoring-triangles.ts`, `quota-feasibility.ts` | Remain Triangle Duel-specific. Neither implements constellation matching or relocation feasibility. |
| `src/components/DotField.svelte` | Reuse its logical-coordinate and pointer-capture approach in a constellation-specific board. Avoid making triangle rendering a prerequisite for the new game. |
| `src/styles.css` | Separate shell/shared styling from game themes so the constellation styling does not alter Triangle Duel. |

Suggested new files: `domain/constellation/{model,patterns,matching,state-machine,selectors}.ts`, `maps/constellation.ts`, `application/constellation-controller.ts`, `components/GameMenu.svelte`, `ConstellationApp.svelte`, and `components/constellation/` for the match screen, star map, target sequence, completion picker, rules, and result. Add separate HTML and TypeScript page entries as described in milestone 4.

Use concrete game controllers and a small explicit game catalog. Do not build a plugin system or a universal rules engine for two games. Domain code remains independent of Svelte, storage, and rendering.

## Implementation defaults and interpretations

These are proposed implementation choices, distinct from playtested conclusions:

- Updated by the implementation request: use Three.js for the luminous flat star graph and surrounding visual depth, with SVG input, accessible targets, completion motifs, and a no-WebGL fallback. Keep rendering independent of rules and logical coordinates.
- Preserve integer logical geometry as described in [the existing geometry ADR](../adr/0001-exact-logical-geometry.md). Resize and decoration must not change legal moves.
- Start map authoring with approximately 24 stars, with adjustable coordinates and count before freezing a version. This is a tuning seed, not an accepted balance requirement.
- Randomize initial starter and initial sequence assignment independently, then retain that initial matchup as the anchor for the accepted four-matchup rematch cycle. A fresh setup resets the cycle; a rematch advances it.
- Retain distinct player names/colors and the existing minimum supported 360 × 640 viewport as the initial UI baseline.
- Retain straight connections, no duplicate endpoint pair, no passing through an intermediate star, and no interior intersection/touch/overlap. Shared endpoint stars remain legal.
- A completed loop prohibits crossing an edge. Because stars remain shared, players may connect through boundary stars using multiple legal connections. Do not accidentally implement territorial ownership or prohibit every inside-to-outside route.
- Reject relocation to the identical undirected endpoint pair as a no-op. Invalid or canceled relocation previews leave the original connection and turn intact.
- After a forced pass and any completion choice, show the reason and use the same explicit End turn handoff as ordinary turns. Terminal results need no handoff to a nonexistent next turn.

## Milestone 1 — Pattern matching, map, and reproducible examples

Represent patterns as small undirected graphs with distinct vertices, independent of silhouette. Define the exact roster:

| Stage | Sequence A | Sequence B |
| --- | --- | --- |
| 3 edges | Four vertices in a path | One center joined to three leaves |
| 4 edges | Four-vertex cycle | Three-vertex cycle plus a fourth vertex joined to one cycle vertex |
| 5 edges | Five-vertex cycle | Four-vertex cycle plus a fifth vertex joined to one cycle vertex |

Implement non-induced subgraph matching using only the active player's unreserved connections. Map distinct pattern vertices to distinct stars. Extra edges, interior stars, angles, and lengths do not invalidate a match. Deduplicate equivalent mappings by their sorted connection IDs so symmetric patterns do not produce repeated choices. Return every distinct eligible edge set in stable order; do not silently truncate choices.

Author a versioned fixed map with safe integer coordinates, touch spacing, and no unintended collinear triples. Include documented legal example routes for both complete sequences with disjoint claimed edge sets, plus an example of blocking and recovery. Empty-board feasibility alone is insufficient: construct representative interleaved positions with both players present. Revise density and chokepoints before committing to visual polish.

Verification: rotated/stretched patterns; extra branches and enclosed stars; opponent edges excluded; reserved edges excluded; shared vertices allowed; invalid vertex reuse rejected; symmetric mappings deduplicated; multiple alternative matches preserved. Check exact geometry remains unchanged for Triangle Duel.

Exit: all six patterns are recognized correctly, and the map has reproducible feasible builds and meaningful interference examples. Fairness remains a playtest question.

## Milestone 2 — Complete constellation rule engine

Store map ID/version and authoritative coordinates, players, immutable connection IDs/owners, completion records with reserved edge IDs, sequence assignments and indices, per-player turns used, active player, rematch-cycle anchor/index, and phase.

Use explicit phases for awaiting an action, choosing a completion, awaiting End turn, and result. Draw and relocate commands are atomic; relocating removes the original connection only if the replacement is legal against the remaining board. A player may draw solely to obstruct and may relocate only their own unreserved connection.

Turn resolution:

1. At turn entry, determine whether a draw or genuine relocation exists. If neither exists, consume the turn as a forced pass; otherwise accept one legal action and consume one turn.
2. Check only the active target using eligible unreserved connections. Zero matches proceeds to handoff; one resolves automatically; multiple matches require the player's choice before any handoff.
3. Reserve precisely the claimed edge set and advance the target index once. Never score the newly activated target again in the same turn.
4. Three completions wins immediately. Otherwise, when both players have used 20 turns, compare completed totals, with equality a draw. Resolve the final action's pending completion choice before that comparison.
5. If neither player can act and neither has a prepared active target, compare totals immediately. If a prepared target exists, retain ordinary turn order and forced passes, with the same one-completion limit and end conditions.
6. For a nonterminal turn, require End turn, then enter the opponent's turn. A forced pass cannot grant an optional extra action or skip a completion choice.

A built next target is eligible on its owner's next turn after drawing, relocating, or passing; it need not contain that turn's newly drawn connection. A pending completion choice is explicit in-memory domain state, not an animation callback.

Implement the four-rematch rotation with a stable player reference: A/start, B/second, B/start, A/second, relative to the opening assignment. Keep scores independent between matches.

Verification: exclusive ownership; atomic relocation and cancellation; completed-edge immutability; completion inside larger graphs; alternative claim selection; no cascades; illegal commands during handoff/selection; forced passes with and without prepared targets; blocked-board scoring order; final-turn scoring; first-to-three precedence; draws; all four rematches. Use small deterministic fixtures and bounded command-sequence properties checking geometry, reservations, scores, and turn limits.

Exit: complete matches reach correct results without browser code, including blocked boards and prepared-target edge cases.

## Milestone 3 — Playable standalone constellation screen

Build a functional SVG board before decorative effects. Show both ordered target sequences with current/completed/later states, player identities, completion totals, active player, and turns used out of 20.

- Draw: select/drag from a star, reveal legal endpoints, preview, commit only at a legal endpoint.
- Relocate: explicitly select an owned unfinished connection, preview its replacement with both endpoints movable, and preserve the original until the replacement commits. Canceling costs no action.
- Completion selection: preview each distinct candidate edge set on the board; allow choosing it without an extra turn. Reserved edges must remain distinguishable from unfinished edges without relying only on color.
- End turn: keep the action result visible until acknowledgment; show a clear opponent handoff.
- Rules/result: explain structural matching, blocking, shared stars, relocation, scoring, turn limit, and rematches with the actual pattern diagrams.

The constellation controller owns only in-memory match state. Reloading or reopening the page starts at setup; leaving the page has no save/resume guarantee. Do not add localStorage, sessionStorage, URL-serialized matches, or restoration dialogs for this game. Rematch rotation lasts within the open page; a fresh page starts a new cycle. Neither game reads or modifies the other's state.

Exit: a full local match, relocation, completion choice, and rematch work through the interface; refreshing starts fresh without writing a constellation session.

## Milestone 4 — Gallery and separate game pages

Use a small static multipage structure: `/index.html` for the gallery, `/triangle-duel/index.html` for the original game, and `/constellations/index.html` for the new game. Give each its own TypeScript entry and Svelte root. The Triangle Duel entry can continue mounting the existing App and styles. Configure Vite's build inputs for all three HTML entries using the installed toolchain; verify emitted paths and assets with the production preview.

Cards show game-specific previews, short descriptions, and ordinary Play links. Each game has a link back to the menu. The gallery does not instantiate game controllers, inspect saves, or coordinate game state. Use full page navigation instead of introducing a shared router or session manager. Additional games can be added as another page and card.

Keep the existing Triangle Duel storage key/envelope compatible inside its original page. Its results, recovery, rule view, diagnostics export, setup, dice, and rematches retain their original behavior. This is preservation of the original implementation, not a persistence requirement for the new game. Update existing browser journeys to open its new page or enter through the gallery rather than assuming it occupies the root screen.

Exit: the gallery links to both games; each page opens and refreshes directly; constellation refresh starts fresh; opening it does not modify Triangle Duel's existing storage. All three entry pages work in the production build without relying on an SPA fallback.

## Milestone 5 — Celestial-atlas presentation

Apply deep navy scenery, faint nebulae, luminous playable stars, crisp player-colored connections, and restrained background depth. Make decorative stars unmistakably different from playable stars. Scope the theme to constellations and its gallery preview.

Implement completion illustrations from the actual matched-star mapping, then fade to a subtle persistent treatment of the reserved edges. Prototype one illustration first: flexible graph geometry can produce shapes that do not resemble a fixed silhouette, so use adaptable motifs without implying extra matching rules. Give all six patterns a coherent visual treatment before calling presentation complete.

Effects must not obscure endpoint guidance, candidate selection, ownership, or connections inside completed loops. Respect reduced-motion preferences and keep the board fully usable with decorative animation disabled. Check touch hit areas, text contrast, player distinctions, and horizontal overflow at the existing minimum viewport.

Exit: the space presentation communicates completed versus unfinished work without changing legality or making tactical positions harder to read.

## Milestone 6 — Verification and balance review

Use the repository's Node 24 toolchain. After implementation, run the existing formatting, lint, type-check, unit/component, production-build, and browser checks: `npm run format:check`, `npm run lint`, `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e`. Prefix shell commands with `rtk` when available; this planning session found it unavailable.

Add browser journeys for independent page entry, gallery navigation, a complete constellation match, relocation, ambiguous completion selection, turn-limit results, rematch rotation, and fresh setup after constellation reload. Retain existing Triangle Duel recovery coverage on its own page. Reuse Chromium/WebKit and portrait coverage; record any unavailable browser/device checks explicitly. Measure pattern matching and relocation-availability enumeration on crowded legal fixtures before optimizing; the quota-feasibility benchmark does not measure these new algorithms.

Play through all four rematch matchups, repeating the cycle with different players where possible. Record local observations and concise traces: target completion turns, blocking-only actions, relocations, forced passes, outcomes, and which sequence started. No external telemetry is needed.

Judge whether players can predict threats, whether blocking earns a meaningful delay, whether recovery is understandable, whether loops excessively trap unfinished work, and whether sequence or first-move advantage dominates. Legal examples and four matches are exploratory evidence, not statistical proof of balance. Tune map layout first; any rule or roster change must be reflected in CONTEXT.md and relevant fixtures.

Exit: automated checks pass, real playtests expose no unresolved rule ambiguity, and findings distinguish verified behavior from balance judgments and device checks still outstanding.

## Delivery order and handoff

Implement milestones in order: graph rules/map → state machine → functional standalone screen → gallery and page entries → presentation → full verification and playtest review. Each milestone should leave a concrete reviewable result, with no dependence on speculative online infrastructure.

The final implementation handoff should include the playable gallery and both games, the fixed map and exact pattern definitions, passing check results, updated verification/playtest findings, and any remaining balance or device limitations. Deployment is a separate step.
