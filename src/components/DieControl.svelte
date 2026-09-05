<script lang="ts">
  import { onMount } from 'svelte';
  import type { GalaxyDuelMatch } from '../domain/galaxy-duel/model';
  export let match: GalaxyDuelMatch;
  export let disabled = false;
  export let status: string;
  export let onroll: () => void;
  export let onendturn: () => void;

  const pips = [[], [5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];
  let mounted = false;
  let animatedFace = 1;
  let rollTimer: ReturnType<typeof setTimeout> | undefined;
  let faceTimer: ReturnType<typeof setInterval> | undefined;
  const endTurnDelay = 3000;
  let endTurnTimer: ReturnType<typeof setTimeout> | undefined;
  let countdownTimer: ReturnType<typeof setInterval> | undefined;
  let secondsLeft = 3;
  $: rolling = match.phase.kind === 'awaiting-roll';
  $: face = 'quota' in match.phase ? match.phase.quota : animatedFace;
  $: scheduleRoll(mounted && rolling && !disabled);
  $: endTurnKey =
    mounted && match.phase.kind === 'awaiting-end-turn' && !disabled
      ? `${match.id}:${match.turn}:${match.activePlayerIndex}`
      : undefined;
  $: scheduleEndTurn(endTurnKey);

  function clearEndTurnTimers() {
    clearTimeout(endTurnTimer);
    clearInterval(countdownTimer);
    endTurnTimer = undefined;
    countdownTimer = undefined;
  }

  function finishTurn() {
    clearEndTurnTimers();
    if (disabled || match.phase.kind !== 'awaiting-end-turn' || secondsLeft === 0) return;
    secondsLeft = 0;
    onendturn();
  }

  function scheduleEndTurn(key: string | undefined) {
    clearEndTurnTimers();
    secondsLeft = 3;
    if (!key) return;
    const deadline = Date.now() + endTurnDelay;
    countdownTimer = setInterval(() => {
      secondsLeft = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
    }, 100);
    endTurnTimer = setTimeout(finishTurn, endTurnDelay);
  }

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
    return () => {
      clearTimers();
      clearEndTurnTimers();
    };
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
      <button
        class="primary end-turn"
        disabled={disabled || secondsLeft === 0}
        onclick={finishTurn}
        aria-label="End turn"
        style:--countdown-duration={`${endTurnDelay}ms`}
      >
        {#if endTurnKey && secondsLeft > 0}
          {#key endTurnKey}<span class="countdown-fill" aria-hidden="true"></span>{/key}
        {/if}
        <span class="end-turn-label">End turn</span>
        {#if endTurnKey && secondsLeft > 0}
          <span class="countdown-label" aria-hidden="true">{secondsLeft}s</span>
          <span class="sr-only">Automatically ends after 3 seconds</span>
        {/if}
      </button>
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
      <small class="roll-hint"
        >{disabled ? 'Waiting for the active player…' : 'Getting your lines ready…'}</small
      >
    {/if}
  </div>
</section>

<style>
  .end-turn {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }
  .countdown-fill {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: #07131e26;
    transform-origin: left;
    animation: countdown var(--countdown-duration) linear forwards;
  }
  .countdown-label {
    position: absolute;
    right: 12px;
    font-variant-numeric: tabular-nums;
  }
  .end-turn-label {
    padding: 0 24px;
  }
  @keyframes countdown {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .countdown-fill {
      animation: none;
      display: none;
    }
  }
</style>
