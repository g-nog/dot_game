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

  const controller = new MatchController();
  let snapshot: ControllerSnapshot = controller.snapshot;
  let rulesOpen = false;
  let copyMessage = '';
  const unsubscribe = controller.subscribe((value) => (snapshot = value));
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

<main>
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
      <MatchSetup onstart={start} onrules={() => (rulesOpen = true)} />
    {:else if snapshot.match.phase.kind === 'result' && snapshot.diagnostics && matchView}
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
        <DotField
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
</main>
