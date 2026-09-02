<script lang="ts">
  import type { TriangleDuelMatch } from '../domain/triangle-duel/model';
  export let match: TriangleDuelMatch;
  export let scores: readonly [number, number];
  export let status: string;

  $: activePlayer = match.players[match.activePlayerIndex];
</script>

<header class="match-status">
  <div
    class="score"
    class:active={match.activePlayerIndex === 0}
    style:--player={match.players[0].color}
  >
    <span>{match.players[0].name}</span><strong>{scores[0]}</strong>
  </div>
  <div class="turn-status" aria-live="polite">
    <span class="active-chip" style:--player={activePlayer.color}>{activePlayer.name}</span>
    {#if match.phase.kind === 'drawing-lines' || match.phase.kind === 'awaiting-end-turn'}
      <strong>{match.phase.committed}/{match.phase.quota}</strong><small>lines</small>
    {:else}<strong>—</strong><small>quota</small>{/if}
  </div>
  <div
    class="score right"
    class:active={match.activePlayerIndex === 1}
    style:--player={match.players[1].color}
  >
    <span>{match.players[1].name}</span><strong>{scores[1]}</strong>
  </div>
</header>
<p class="sr-only" aria-live="polite">{status}</p>
