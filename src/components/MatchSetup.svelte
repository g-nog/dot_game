<script lang="ts">
  import type { MatchSize, Player } from '../domain/triangle-duel/model';
  import { PLAYER_COLORS } from '../domain/triangle-duel/model';

  export let onstart: (size: MatchSize, players: readonly [Player, Player]) => void;
  export let onrules: () => void;

  let size: MatchSize = 'standard';
  let firstName = '';
  let secondName = '';
  let firstColor: string = PLAYER_COLORS[0];
  let secondColor: string = PLAYER_COLORS[1];
  let error = '';

  function start() {
    if (firstColor === secondColor) {
      error = 'Choose a different color for each player.';
      return;
    }
    const players: readonly [Player, Player] = [
      { id: 'player-1', name: firstName.trim() || 'Player 1', color: firstColor },
      { id: 'player-2', name: secondName.trim() || 'Player 2', color: secondColor },
    ];
    onstart(size, players);
  }
</script>

<section class="card setup" aria-labelledby="setup-title">
  <div class="eyebrow">Local two-player</div>
  <h1 id="setup-title">Triangle Duel</h1>
  <p class="lede">Roll. Connect exact quotas. Claim every open triangular face you complete.</p>

  <fieldset>
    <legend>Match size</legend>
    <div class="segmented">
      {#each [['quick', 'Quick', '20 dots'], ['standard', 'Standard', '30 dots'], ['extended', 'Extended', '40 dots']] as option (option[0])}
        <label class:active={size === option[0]}>
          <input type="radio" bind:group={size} value={option[0]} />
          <span>{option[1]}<small>{option[2]}</small></span>
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="players">
    <label>Player 1 <input maxlength="16" bind:value={firstName} placeholder="Player 1" /></label>
    <label
      >Color
      <select bind:value={firstColor} aria-label="Player 1 color">
        {#each PLAYER_COLORS as color, index (color)}<option value={color}>Color {index + 1}</option
          >{/each}
      </select>
    </label>
    <label>Player 2 <input maxlength="16" bind:value={secondName} placeholder="Player 2" /></label>
    <label
      >Color
      <select bind:value={secondColor} aria-label="Player 2 color">
        {#each PLAYER_COLORS as color, index (color)}<option value={color}>Color {index + 1}</option
          >{/each}
      </select>
    </label>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button class="primary" onclick={start}>Start match</button>
  <button class="link" onclick={onrules}>How to play</button>
</section>
