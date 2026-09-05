<script lang="ts">
  import { onMount } from 'svelte';
  import type { GalaxyDuelMatch } from '../domain/galaxy-duel/model';
  export let match: GalaxyDuelMatch;
  export let status: string;
  export let onroll: () => void;
  export let onendturn: () => void;

  const pips = [[], [5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];
  let mounted = false;
  let animatedFace = 1;
  let rollTimer: ReturnType<typeof setTimeout> | undefined;
  let faceTimer: ReturnType<typeof setInterval> | undefined;
  $: rolling = match.phase.kind === 'awaiting-roll';
  $: face = 'quota' in match.phase ? match.phase.quota : animatedFace;
  $: scheduleRoll(mounted && rolling);

  function clearTimers() {
    clearTimeout(rollTimer);
    clearInterval(faceTimer);
    rollTimer = undefined;
    faceTimer = undefined;
  }

  function scheduleRoll(shouldRoll: boolean) {
    clearTimers();
    if (!shouldRoll) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      faceTimer = setInterval(() => (animatedFace = (animatedFace % 6) + 1), 65);
    }
    rollTimer = setTimeout(
      () => {
        clearTimers();
        onroll();
      },
      reducedMotion ? 0 : 420,
    );
  }

  onMount(() => {
    mounted = true;
    return clearTimers;
  });
</script>

<section
  class="turn-control"
  aria-label="Turn controls"
  style:--player={match.players[match.activePlayerIndex].color}
>
  <div
    class="die"
    class:rolling
    role="img"
    aria-label={rolling ? 'Dice rolling' : `Die result: ${face}`}
  >
    {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as pip (pip)}
      <span class="pip" class:visible={pips[face].includes(pip)}></span>
    {/each}
  </div>
  <div class="turn-details">
    <p aria-live="polite">{status}</p>
    {#if match.phase.kind === 'awaiting-end-turn'}
      <button class="primary" onclick={onendturn}>End turn</button>
    {:else if match.phase.kind === 'drawing-lines'}
      <div
        class="quota"
        aria-label={`${match.phase.committed} of ${match.phase.quota} lines committed`}
      >
        {#each Array.from({ length: match.phase.quota }, (_, index) => index) as index (index)}
          <i class:filled={index < match.phase.committed}></i>
        {/each}
      </div>
    {:else if rolling}
      <small class="roll-hint">Getting your lines ready…</small>
    {/if}
  </div>
</section>
