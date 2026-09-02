<script lang="ts">
  import type { MatchDiagnostics } from '../domain/triangle-duel/diagnostics';
  import type { TriangleDuelMatch } from '../domain/triangle-duel/model';
  export let match: TriangleDuelMatch;
  export let diagnostics: MatchDiagnostics;
  export let resultLabel: string;
  export let scores: readonly [number, number];
  export let onrematch: () => void;
  export let onnewsetup: () => void;
  export let ondownload: () => void;
  export let oncopy: () => void;
  const developer =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_PLAYTEST_DIAGNOSTICS === 'true';
</script>

<section class="card result">
  <div class="eyebrow">Board exhausted</div>
  <h1>{resultLabel}</h1>
  <div class="final-score">
    <strong>{scores[0]}</strong><span>—</span><strong>{scores[1]}</strong>
  </div>
  <p>{match.players[0].name} · {match.players[1].name}</p>
  <button class="primary" onclick={onrematch}>Rematch</button>
  <button class="secondary" onclick={onnewsetup}>New setup</button>
  {#if developer}
    <aside class="developer">
      <b>Local playtest export</b><small>No names or data are sent over the network.</small>
      <div>
        <button onclick={oncopy}>Copy JSON</button><button onclick={ondownload}
          >Download JSON</button
        >
      </div>
      <code>seed {diagnostics.boardSeed}</code>
    </aside>
  {/if}
</section>
