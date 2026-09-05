<script lang="ts">
  import { onDestroy } from 'svelte';
  import { MatchController, type ControllerSnapshot } from './application/match-controller';
  import { createMatchView } from './application/match-view';
  import { copyDiagnostics, downloadDiagnostics } from './application/playtest-export';
  import type { MatchSize, Player } from './domain/triangle-duel/model';
  import DieControl from './components/DieControl.svelte';
  import DotField from './components/DotField.svelte';
  import MatchResult from './components/MatchResult.svelte';
  import MatchSetup from './components/MatchSetup.svelte';
  import MatchStatus from './components/MatchStatus.svelte';
  import RulesView from './components/RulesView.svelte';

  import {
    GALAXY_BACKGROUNDS,
    BACKGROUND_STORAGE_KEY,
    readBackground,
    type GalaxyBackgroundId,
  } from './components/galaxy/backgrounds';
  import BackgroundPicker from './components/galaxy/BackgroundPicker.svelte';
  export let galaxy = false;
  let backgroundId: GalaxyBackgroundId = galaxy ? readBackground() : 'hubble';
  $: background = GALAXY_BACKGROUNDS.find((item) => item.id === backgroundId)!;
  function changeBackground(id: GalaxyBackgroundId) {
    backgroundId = id;
    try {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, id);
    } catch {
      /* The view still works without storage. */
    }
  }
  let resultVisible = false;
  let lastPhase: string | undefined;
  let resultTimer: ReturnType<typeof setTimeout> | undefined;
  function revealResult(phase: string | undefined) {
    if (phase === lastPhase) return;
    clearTimeout(resultTimer);
    if (
      galaxy &&
      phase === 'result' &&
      lastPhase &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      resultTimer = setTimeout(() => (resultVisible = true), 2800);
    } else resultVisible = phase === 'result';
    lastPhase = phase;
  }
  onDestroy(() => clearTimeout(resultTimer));
  const galaxyStorage: Storage = {
    get length() {
      return localStorage.length;
    },
    key: (index) => localStorage.key(index),
    clear: () => {
      throw new Error('Bulk clearing is unsupported');
    },
    getItem: (key) => localStorage.getItem(`galaxy:${key}`),
    setItem: (key, value) => localStorage.setItem(`galaxy:${key}`, value),
    removeItem: (key) => localStorage.removeItem(`galaxy:${key}`),
  };
  const controller = new MatchController(galaxy ? galaxyStorage : localStorage);
  let snapshot: ControllerSnapshot = controller.snapshot;
  let rulesOpen = false;
  let copyMessage = '';
  const unsubscribe = controller.subscribe((value) => (snapshot = value));
  $: revealResult(snapshot.match?.phase.kind);
  $: matchView = snapshot.match ? createMatchView(snapshot.match) : undefined;
  onDestroy(unsubscribe);

  function start(size: MatchSize, players: readonly [Player, Player]) {
    controller.start(size, players);
  }
  function chooseNew() {
    if (
      snapshot.restoration.kind === 'valid' &&
      !confirm('Replace the unfinished match with a new one?')
    )
      return;
    controller.discardUnrecoverable();
  }
  async function copy() {
    if (!snapshot.diagnostics) return;
    await copyDiagnostics(snapshot.diagnostics);
    copyMessage = 'Copied';
  }
</script>

<svelte:head>
  <title>{galaxy ? 'Galaxy Duel · A rivalry among stars' : 'Triangle Duel'}</title>
  {#if galaxy}<link rel="preload" as="image" href={background.image} />{/if}
</svelte:head>
{#if galaxy}<div
    class="universe-backdrop"
    class:playing={!!snapshot.match}
    style:background-image={`url("${background.image}")`}
    aria-hidden="true"
  ></div>{/if}
<main class:galaxy class:in-match={galaxy && !!snapshot.match}>
  {#if galaxy}<header class="galaxy-header">
      <a href="/index.html">✧ DOT GAMES</a><span>GALAXY DUEL <i>/</i> A RIVALRY AMONG STARS</span
      ><span class="galaxy-live">✦ LOCAL TWO-PLAYER</span>
    </header>{/if}
  {#if !galaxy}<a
      href="/index.html"
      style="display:inline-block;padding:12px 0;color:inherit;font-size:13px">← Game menu</a
    >{/if}
  <div class="unsupported" role="alert">
    <h1>A little more room, please</h1>
    <p>
      Triangle Duel supports screens at least 360 × 640 pixels. Rotate your device or use a larger
      window.
    </p>
  </div>
  <div class="supported">
    {#if snapshot.restoration.kind === 'valid' && !snapshot.match}
      <section class="card recovery">
        <div class="eyebrow">Unfinished match found</div>
        <h1>Continue the duel?</h1>
        <p>
          Saved {new Date(snapshot.restoration.envelope.savedAt).toLocaleString()} · {snapshot
            .restoration.envelope.match.size}
        </p>
        {#if galaxy}<BackgroundPicker value={backgroundId} onchange={changeBackground} />{/if}
        <button class="primary" onclick={() => controller.resume()}>Resume match</button>
        <button class="secondary" onclick={chooseNew}>New setup</button>
      </section>
    {:else if snapshot.restoration.kind === 'invalid' && !snapshot.match}
      <section class="card recovery">
        <div class="eyebrow">Recovery problem</div>
        <h1>This match can’t be resumed</h1>
        <p>{snapshot.restoration.reason} You can safely discard it and begin again.</p>
        <button class="primary" onclick={() => controller.discardUnrecoverable()}
          >Discard saved match</button
        >
      </section>
    {:else if !snapshot.match}
      <MatchSetup
        {galaxy}
        {backgroundId}
        onbackground={changeBackground}
        onstart={start}
        onrules={() => (rulesOpen = true)}
      />
    {:else if resultVisible && snapshot.diagnostics && matchView}
      <MatchResult
        match={snapshot.match}
        diagnostics={snapshot.diagnostics}
        resultLabel={matchView.resultLabel}
        scores={matchView.scores}
        onrematch={() => controller.rematch()}
        onnewsetup={() => controller.newSetup()}
        ondownload={() => snapshot.diagnostics && downloadDiagnostics(snapshot.diagnostics)}
        oncopy={copy}
      />
      {#if copyMessage}<div class="toast" role="status">{copyMessage}</div>{/if}
    {:else}
      <section class="game-shell">
        <MatchStatus
          match={snapshot.match}
          scores={matchView?.scores ?? [0, 0]}
          status={matchView?.status ?? ''}
        />
        <button class="rules-button" onclick={() => (rulesOpen = true)}>Rules</button>
        {#if galaxy}<p class="star-guide">
            Connect the stars with cyan rings. Close triangles to claim them.
          </p>{/if}
        <DotField
          {galaxy}
          match={snapshot.match}
          eligibleEndpoints={(from) => controller.eligibleEndpoints(from)}
          oncommit={(a, b) => controller.dispatch({ type: 'COMMIT_LINE', a, b })}
        />
        <DieControl
          match={snapshot.match}
          status={matchView?.status ?? ''}
          onroll={() => controller.roll()}
          onendturn={() => controller.dispatch({ type: 'END_TURN' })}
        />
      </section>
    {/if}
    {#if rulesOpen}<RulesView onclose={() => (rulesOpen = false)} />{/if}
  </div>
  {#if galaxy}
    <footer class="galaxy-credit">
      <a href={background.source} target="_blank" rel="noreferrer">{background.credit}</a>
    </footer>
  {/if}
</main>
