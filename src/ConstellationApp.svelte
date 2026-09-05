<script lang="ts">
  import { tick } from 'svelte';
  import { ConstellationController } from './application/constellation-controller';
  import type { Command, Match, Seat } from './domain/constellation/model';
  import { PATTERNS, SEQUENCES } from './domain/constellation/patterns';
  import { score, target, unfinished } from './domain/constellation/selectors';
  import StarMap from './components/constellation/StarMap.svelte';
  import PatternDiagram from './components/constellation/PatternDiagram.svelte';
  const controller = new ConstellationController();
  let match: Match | null = null;
  let names = ['Vega', 'Nova'];
  let colors = ['#79d9e8', '#ffbe83'];
  let rules = false;
  let relocation: string | null = null;
  let relocating = false;
  let choice = 0;
  $: active = match?.players[match.active];
  $: options = match?.phase.kind === 'selection' ? match.phase.candidates : [];
  $: highlight = options[choice]?.edgeIds ?? (relocation ? [relocation] : []);
  function scrollToGame() {
    void tick().then(() => window.scrollTo(0, 0));
  }
  function start() {
    match = controller.start([
      { name: names[0].trim() || 'Vega', color: colors[0] },
      { name: names[1].trim() || 'Nova', color: colors[1] },
    ]);
    relocation = null;
    relocating = false;
    choice = 0;
    scrollToGame();
  }
  function send(command: Command) {
    const previous = match;
    match = controller.dispatch(command);
    if (match !== previous) {
      relocation = null;
      relocating = false;
      choice = 0;
    }
  }
  function connect(a: string, b: string) {
    send(relocation ? { type: 'relocate', id: relocation, a, b } : { type: 'draw', a, b });
  }
  function newSetup() {
    controller.reset();
    match = null;
    relocation = null;
    relocating = false;
    scrollToGame();
  }
</script>

<svelte:head><title>Constellations · Dot Games</title></svelte:head>
<div class="atlas-app">
  <header class="atlas-nav">
    <a href="/index.html" class="brand">✧ <span>DOT GAMES</span></a>
    <div class="nav-links">
      <span class="edition">THE CELESTIAL COLLECTION</span><button
        class="text-button"
        onclick={() => (rules = !rules)}
        aria-expanded={rules}>How to play <span aria-hidden="true">↗</span></button
      >
    </div>
  </header>
  {#if rules}
    <section class="rules-panel" aria-label="Constellation rules">
      <div class="section-heading">
        <div>
          <span class="eyebrow">FIELD GUIDE</span>
          <h2>Read the stars. Change their course.</h2>
        </div>
        <button class="text-button" onclick={() => (rules = false)}>Close rules ×</button>
      </div>
      <div class="rule-columns">
        <p>
          <strong>One turn, one connection.</strong> Draw between two stars, or relocate one of your own
          unfinished connections anywhere, moving both endpoints. Crossing, duplicate connections and
          passing through stars are forbidden. Canceling a preview is free.
        </p>
        <p>
          <strong>Structure is everything.</strong> Build your three targets in order using your own connections.
          Angles, lengths, extra branches and stars inside loops do not matter. All stars stay shared.
          Completed edges are reserved forever, marked with diamonds.
        </p>
        <p>
          <strong>Race or interfere.</strong> Spend a turn blocking an opponent’s route. Recover by relocating
          unfinished work. Choose which edges to claim when several matches exist. Only one target can
          score per turn, even if the next is ready. Then select End turn.
        </p>
        <p>
          <strong>Three constellations wins.</strong> Otherwise compare totals after 20 turns each. No
          legal draw or relocation means an automatic pass that may score a prepared target. If neither
          can act or score, compare totals immediately. Ties are draws. Rematches cycle through both sequences
          and both starting positions over four matches.
        </p>
      </div>
      <div class="rules-patterns">
        {#each ['A', 'B'] as sequence (sequence)}<div>
            <h3>Sequence {sequence}</h3>
            <div class="pattern-row">
              {#each SEQUENCES[sequence as 'A' | 'B'] as id (id)}<div>
                  <PatternDiagram {id} /><strong>{PATTERNS[id].name}</strong><small
                    >{PATTERNS[id].description}</small
                  >
                </div>{/each}
            </div>
          </div>{/each}
      </div>
      <p class="muted">
        A match lives in this open page. Refreshing or leaving starts fresh. Rematches keep names
        and colors; New setup resets the cycle.
      </p>
    </section>
  {/if}
  {#if !match}
    <main class="constellation-setup">
      <div class="setup-story">
        <span class="eyebrow">A GAME OF CONNECTION & INTERFERENCE</span>
        <h1>Constellations<span class="gold">.</span></h1>
        <p class="intro">The sky is shared.<br />The next constellation is yours.</p>
        <p class="muted setup-description">
          Trace luminous paths, complete ancient patterns, and make your rival rethink the stars. A
          quiet battle of possibilities for two.
        </p>
        <div class="setup-meta">
          <span>2 PLAYERS</span><span>ONE SHARED DEVICE</span><span>NO TIMER</span>
        </div>
        <div class="setup-patterns">
          {#each ['thread', 'beacon', 'halo'] as id (id)}<PatternDiagram
              id={id as 'thread' | 'beacon' | 'halo'}
            />{/each}
        </div>
      </div>
      <form
        class="setup-card"
        onsubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <span class="eyebrow">PREPARE THE OBSERVATORY</span>
        <h2>Who’s watching the sky?</h2>
        <p class="muted">Two astronomers. Two different paths.</p>
        {#each [0, 1] as i (i)}<div class="player-setup">
            <label for={`name-${i}`}>Astronomer {i + 1}</label>
            <div class="name-color">
              <span class="player-swatch" style={`--player-color:${colors[i]}`}
                >{i === 0 ? '✦' : '◆'}</span
              ><input
                id={`name-${i}`}
                bind:value={names[i]}
                maxlength="20"
                placeholder={i === 0 ? 'Vega' : 'Nova'}
                aria-label={`Player ${i + 1} name`}
              />
            </div>
            <label class="color-label" for={`color-${i}`}>Star color</label><select
              id={`color-${i}`}
              bind:value={colors[i]}
              aria-label={`Player ${i + 1} color`}
              >{#each [['#79d9e8', 'Glacier'], ['#ffbe83', 'Amber'], ['#c4a7ff', 'Iris'], ['#f0da89', 'Starlight']] as [value, label] (value)}<option
                  {value}
                  disabled={colors[1 - i] === value}>{label}</option
                >{/each}</select
            >
          </div>{/each}
        <button class="primary" type="submit" disabled={colors[0] === colors[1]}
          >Open the star map <span aria-hidden="true">↗</span></button
        >
        <p class="fine-print">
          Sequence and first player are drawn independently.<br />Progress lasts while this page is
          open.
        </p>
      </form>
    </main>
  {:else}
    <main
      class="match-shell"
      data-phase={match.phase.kind}
      data-active={match.active}
      data-cycle={match.cycle}
    >
      <div class="match-heading">
        <div>
          <span class="eyebrow">MERIDIAN · THE FIRST ATLAS</span>
          <h1>Constellations<span class="gold">.</span></h1>
        </div>
        <span class="match-number">MATCHUP {match.cycle + 1} / 4</span>
      </div>
      <div class="mobile-targets" aria-label="Current targets and scores">
        {#each [0, 1] as seat (seat)}
          {@const current = target(match, seat as Seat)}
          <div style={`--player-color:${match.players[seat].color}`}>
            {#if current}<PatternDiagram id={current} />{/if}
            <span
              ><strong>{match.players[seat].name} · {score(match, seat as Seat)}/3</strong><small
                >{current ? PATTERNS[current].name : 'Sequence complete'}</small
              ></span
            >
          </div>
        {/each}
      </div>
      <div class="match-layout">
        <section class="board-column" aria-label="Star map and turn controls">
          <div class="turn-banner" style={`--player-color:${active!.color}`}>
            <span class="player-swatch">{match.active === 0 ? '✦' : '◆'}</span>
            <div>
              <strong>{active!.name}{match.phase.kind === 'result' ? '' : '’s turn'}</strong><span
                >{match.phase.kind === 'action'
                  ? 'Connect, complete, or change the course.'
                  : match.phase.kind === 'selection'
                    ? 'Choose which constellation to preserve.'
                    : match.phase.kind === 'handoff'
                      ? 'Your action is complete. Pass the sky.'
                      : 'The atlas is complete.'}</span
              >
            </div>
            <span class="turn-count">{match.turns[match.active]}<small> / 20 turns</small></span>
          </div>
          <StarMap {match} {relocation} {highlight} onconnect={connect} />
          <div class="board-toolbar">
            {#if match.phase.kind === 'action'}
              <div class="action-tabs">
                <button
                  class:chosen={!relocating}
                  onclick={() => {
                    relocating = false;
                    relocation = null;
                  }}>Draw connection</button
                ><button
                  class:chosen={relocating}
                  disabled={!unfinished(match, match.active).length}
                  onclick={() => {
                    relocating = !relocating;
                    relocation = null;
                  }}>Relocate</button
                >
              </div>
              <p class="muted">
                {relocation
                  ? 'Select any two stars for the replacement. The original stays until you commit.'
                  : relocating
                    ? 'Choose one of your unfinished connections below.'
                    : 'Tap two stars, or drag between them. Rings show legal endpoints.'}
              </p>
              {#if relocating}<div class="relocation-list" aria-label="Unfinished connections">
                  {#each unfinished(match, match.active) as edge (edge.id)}<button
                      class:chosen={relocation === edge.id}
                      onclick={() => (relocation = edge.id)}
                      >Move {edge.a.slice(1)}–{edge.b.slice(1)}</button
                    >{/each}<button
                    onclick={() => {
                      relocation = null;
                      relocating = false;
                    }}>Cancel relocation</button
                  >
                </div>{/if}
            {:else if match.phase.kind === 'selection'}
              <p class="action-notice">
                {options.length} possible constellations. Preview and claim one.
              </p>
              <div class="choice-controls">
                <button
                  disabled={choice === 0}
                  onclick={() => choice--}
                  aria-label="Previous constellation">←</button
                ><span>Option {choice + 1} of {options.length}</span><button
                  disabled={choice === options.length - 1}
                  onclick={() => choice++}
                  aria-label="Next constellation">→</button
                ><button class="primary" onclick={() => send({ type: 'claim', index: choice })}
                  >Claim this constellation</button
                >
              </div>
            {:else if match.phase.kind === 'handoff'}
              <p class="action-notice" role="status">{match.notice}</p>
              <button class="primary" onclick={() => send({ type: 'end' })}
                >End turn · Pass to {match.players[match.active === 0 ? 1 : 0].name}
                <span aria-hidden="true">→</span></button
              >
            {:else}
              <section class="result-panel" aria-label="Match result">
                <span class="eyebrow"
                  >{match.phase.reason === 'three'
                    ? 'THREE CONSTELLATIONS'
                    : match.phase.reason === 'limit'
                      ? '20 TURNS EACH'
                      : 'NO ACTIONS OR TARGETS REMAIN'}</span
                >
                <h2>
                  {match.phase.winner === null
                    ? 'A sky shared equally.'
                    : `${match.players[match.phase.winner].name} wins the sky.`}
                </h2>
                <p>
                  {match.players[0].name}
                  {score(match, 0)} — {score(match, 1)}
                  {match.players[1].name}
                </p>
                <div class="result-actions">
                  <button
                    class="primary"
                    onclick={() => {
                      match = controller.rematch();
                      choice = 0;
                      scrollToGame();
                    }}>Rematch · Matchup {((match.cycle + 1) % 4) + 1} ↗</button
                  ><button onclick={newSetup}>New setup</button>
                </div>
              </section>
            {/if}
          </div>
          <div class="board-legend">
            <span>✦ / ◆ Player identity</span><span>◇ Reserved connection</span><span
              >◯ Legal endpoint</span
            >
          </div>
        </section>
        <aside class="sequence-column" aria-label="Public target sequences">
          <div class="sequence-heading">
            <span class="eyebrow">TWO PATHS THROUGH THE SKY</span>
            <p>Complete your patterns in order.</p>
          </div>
          {#each [0, 1] as seat (seat)}{@const player = match.players[seat]}{@const total = score(
              match,
              seat as Seat,
            )}
            <section
              class="sequence-card"
              class:active-player={seat === match.active}
              style={`--player-color:${player.color}`}
              data-sequence={match.sequences[seat]}
              data-seat={seat}
            >
              <div class="sequence-player">
                <span class="player-swatch">{seat === 0 ? '✦' : '◆'}</span>
                <div>
                  <h2>{player.name}</h2>
                  <span>SEQUENCE {match.sequences[seat]} · {match.turns[seat]} / 20 TURNS</span>
                </div>
                <strong class="score">{total}<small>/3</small></strong>
              </div>
              <ol class="target-list">
                {#each SEQUENCES[match.sequences[seat]] as id, i (id)}<li
                    class:current={i === total}
                    class:completed={i < total}
                  >
                    <PatternDiagram {id} />
                    <div>
                      <span class="target-state"
                        >{i < total
                          ? '✓ COMPLETED'
                          : i === total
                            ? 'CURRENT TARGET'
                            : `THEN · ${i + 3} CONNECTIONS`}</span
                      >
                      <h3>{PATTERNS[id].name}</h3>
                      <p>{PATTERNS[id].description}</p>
                    </div>
                  </li>{/each}
              </ol>
            </section>{/each}
          <p class="sequence-note">
            Same structure, any shape.<br />Angles and distances are yours to imagine.
          </p>
        </aside>
      </div>
      <p class="visually-hidden" aria-live="polite">
        {active?.name}. {match.notice}
        {match.phase.kind === 'action'
          ? `Current target: ${PATTERNS[target(match, match.active)].name}`
          : ''}
      </p>
    </main>
  {/if}
  <footer class="atlas-footer">
    <span>DOT GAMES / CELESTIAL ATLAS</span><span>Built for a little friendly rivalry.</span>
  </footer>
</div>
