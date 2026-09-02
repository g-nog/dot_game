<script lang="ts">
  import type { TriangleDuelMatch } from '../domain/triangle-duel/model';
  export let match: TriangleDuelMatch;
  export let status: string;
  export let onroll: () => void;
  export let onendturn: () => void;
</script>

<section class="turn-control" aria-label="Turn controls">
  <p aria-live="polite">{status}</p>
  {#if match.phase.kind === 'awaiting-roll'}
    <button class="primary die-button" onclick={onroll}
      ><span aria-hidden="true">⚄</span> Roll die</button
    >
  {:else if match.phase.kind === 'awaiting-end-turn'}
    <button class="primary" onclick={onendturn}>End turn</button>
  {:else if match.phase.kind === 'drawing-lines'}
    <div
      class="quota"
      aria-label={`${match.phase.committed} of ${match.phase.quota} lines committed`}
    >
      {#each Array(match.phase.quota) as slot, index (index)}<i
          class:filled={index < match.phase.committed}>{slot}</i
        >{/each}
    </div>
  {/if}
</section>
