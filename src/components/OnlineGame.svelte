<script lang="ts">
  import { onDestroy } from 'svelte';
  import { OnlineController } from '../online/controller';
  import { RECONNECT_GRACE_MS } from '../online/protocol';
  import { PLAYER_COLORS, type MatchSize } from '../domain/galaxy-duel/model';
  import { createMatchView } from '../application/match-view';
  import DotField from './DotField.svelte';
  import DieControl from './DieControl.svelte';
  import MatchStatus from './MatchStatus.svelte';
  export let roomId: string | undefined = undefined;
  export let onexit: () => void;
  export let onrules: () => void;
  export let onplaying: (playing: boolean) => void;
  const controller = new OnlineController(roomId);
  let snapshot = controller.snapshot;
  const unsubscribe = controller.subscribe((value) => (snapshot = value));
  let name = '';
  let color: string = roomId ? PLAYER_COLORS[1] : PLAYER_COLORS[0];
  let size: MatchSize = 'standard';
  let copied = false;
  let metaHeight = 48;
  let now = Date.now();
  const clock = setInterval(() => (now = Date.now()), 1000);
  onDestroy(() => {
    unsubscribe();
    controller.destroy();
    clearInterval(clock);
  });
  $: room = snapshot.room;
  $: match = room?.match;
  $: view = match ? createMatchView(match) : undefined;
  $: onplaying(!!match && !room?.closed);
  $: canAct =
    snapshot.connection === 'connected' &&
    !snapshot.pending &&
    !!match &&
    !room?.closed &&
    !!room?.connected.every(Boolean) &&
    match.activePlayerIndex === snapshot.seat;
  $: paused = !!match && (snapshot.connection !== 'connected' || !room?.connected.every(Boolean));
  $: seconds = Math.max(0, Math.ceil(((room?.pausedAt ?? now) + RECONNECT_GRACE_MS - now) / 1000));
  $: invite = snapshot.roomId ? `${location.origin}/?room=${snapshot.roomId}` : '';
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite);
      copied = true;
    } catch {
      copied = false;
    }
  }
  function leave() {
    if (
      room &&
      !room.closed &&
      !confirm(
        snapshot.connection === 'connected'
          ? 'Leave this room? The duel will end for both players.'
          : 'Stop reconnecting and return to setup? Your friend can leave the paused room.',
      )
    )
      return;
    if (snapshot.connection === 'connected' && room && !room.closed)
      controller.action({ type: 'LEAVE' });
    else onexit();
  }
</script>

{#if room?.closed}
  <section class="card setup online-lobby">
    <div class="eyebrow">Room closed</div>
    <h1>The duel has ended</h1>
    <p>A player left this room. Start a new duel to play again.</p>
    <button class="primary" onclick={onexit}>Back to setup</button>
  </section>
{:else if !room}
  <section class="card setup online-lobby">
    <div class="eyebrow">PRIVATE · TWO PLAYERS</div>
    <h1>{roomId ? 'Join the duel' : 'Invite a friend'}</h1>
    <p>Play together, each on your own device. No account needed.</p>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        controller.enter({ name, color }, size);
      }}
    >
      <label
        >Your name <input
          maxlength="16"
          bind:value={name}
          placeholder={roomId ? 'Player 2' : 'Player 1'}
        /></label
      >
      <label
        >Your color <select bind:value={color}>
          {#each PLAYER_COLORS as option, index (option)}<option value={option}
              >Color {index + 1}</option
            >{/each}
        </select></label
      >
      {#if !roomId}<label
          >Match size <select bind:value={size}>
            <option value="quick">Quick · 20 stars</option><option value="standard"
              >Standard · 30 stars</option
            >
            <option value="extended">Extended · 40 stars</option>
          </select></label
        >{/if}
      {#if snapshot.error}<p class="error" role="alert">{snapshot.error}</p>{/if}
      {#if snapshot.connection === 'connecting' || snapshot.connection === 'reconnecting'}
        <p role="status">Connecting to the room…</p>
      {/if}
      <button
        class="primary"
        disabled={snapshot.connection === 'connecting' || snapshot.connection === 'reconnecting'}
      >
        {roomId ? 'Join room' : 'Create invite link'}
      </button>
    </form>
    <button class="secondary" onclick={onexit}>Back to setup</button>
  </section>
{:else}
  <div class="online-session" style:--room-meta={`${metaHeight}px`}>
    <div bind:clientHeight={metaHeight}>
      <div class="online-presence" role="status">
        {#each room.players as player, index (index)}
          <span
            >{player?.name ?? 'Waiting for a friend'}{index === snapshot.seat ? ' (you)' : ''} ·
            {room.connected[index] && snapshot.connection === 'connected'
              ? 'Online'
              : 'Offline'}</span
          >
        {/each}
        <button class="link" disabled={!!snapshot.pending} onclick={leave} aria-label="Leave room"
          >Leave</button
        >
      </div>
      {#if snapshot.error}<p class="error" role="alert">{snapshot.error}</p>{/if}
      {#if paused}
        <div class="online-notice" role="status">
          <strong>Play paused</strong>
          {#if snapshot.connection !== 'connected'}
            <p>
              {snapshot.connection === 'error' ? snapshot.error : 'Reconnecting you to the room…'}
            </p>
          {:else if seconds > 0}
            <p>Waiting for your friend to reconnect · {seconds}s</p>
          {:else}
            <p>Your friend is still offline. Keep waiting, or leave the room without a penalty.</p>
          {/if}
        </div>
      {/if}
    </div>
    {#if !match}
      <section class="card setup online-lobby">
        <div class="eyebrow">Your room is ready</div>
        <h1>Send your invite</h1>
        <p>The duel begins when both players are connected. Keep this tab open.</p>
        <label
          >Invite link <input
            readonly
            value={invite}
            onclick={(event) => event.currentTarget.select()}
          /></label
        >
        <button class="primary" onclick={copyInvite}
          >{copied ? 'Copied!' : 'Copy invite link'}</button
        >
        {#if snapshot.connection !== 'connected'}<p role="status">Reconnecting to the room…</p>{/if}
      </section>
    {:else if match.phase.kind === 'result' && view}
      <section class="card result">
        <div class="eyebrow">Board exhausted</div>
        <h1>{view.resultLabel}</h1>
        <div class="final-score">
          <strong>{view.scores[0]}</strong><span>—</span><strong>{view.scores[1]}</strong>
        </div>
        <p>{match.players[0].name} · {match.players[1].name}</p>
        <button
          class="primary"
          disabled={paused || !!snapshot.pending || room.rematchVotes.includes(snapshot.seat ?? -1)}
          onclick={() => controller.action({ type: 'REMATCH' })}
        >
          {room.rematchVotes.includes(snapshot.seat ?? -1)
            ? 'Waiting for your friend…'
            : room.rematchVotes.length
              ? 'Accept rematch'
              : 'Rematch'}
        </button>
        <button class="secondary" disabled={!!snapshot.pending} onclick={leave}>Leave room</button>
      </section>
    {:else if view}
      <section class="game-shell">
        <MatchStatus {match} scores={view.scores} status={view.status} viewerSeat={snapshot.seat} />
        <button class="rules-button" onclick={onrules}>Rules</button>
        <p class="star-guide">
          {paused
            ? 'The board is saved. Play resumes when you are both online.'
            : match.activePlayerIndex === snapshot.seat
              ? 'Your turn · Connect stars to claim triangles.'
              : `${match.players[match.activePlayerIndex].name} is playing…`}
        </p>
        {#key match.id}<DotField
            {match}
            disabled={!canAct}
            eligibleEndpoints={(from) => controller.eligibleEndpoints(from)}
            oncommit={(a, b) => controller.action({ type: 'COMMIT_LINE', a, b })}
          />{/key}
        <DieControl
          {match}
          disabled={!canAct}
          status={view.status}
          onroll={() => controller.action({ type: 'ROLL_DIE' })}
          onendturn={() => controller.action({ type: 'END_TURN' })}
        />
      </section>
    {/if}
  </div>
{/if}

<style>
  .online-session {
    width: 100%;
    min-width: 0;
  }
  .online-lobby {
    margin: 24px auto;
  }
  form,
  .online-lobby label {
    display: grid;
    gap: 12px;
  }
  form {
    margin-top: 24px;
    gap: 20px;
  }
  .online-presence {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 10px;
    font-size: 11px;
    padding: 6px 8px;
  }
  .online-presence button {
    width: auto;
    padding: 4px 8px;
    min-height: 32px;
    font-size: 12px;
  }
  :global(.galaxy .online-session .game-shell) {
    height: max(360px, calc(100dvh - 104px - var(--room-meta)));
  }
  @media (max-width: 600px) {
    :global(.galaxy .online-session .game-shell) {
      height: max(360px, calc(100dvh - 98px - var(--room-meta)));
    }
  }
  .online-notice {
    max-width: 600px;
    margin: 12px auto;
    padding: 12px 20px;
    border: 1px solid #e9c46a88;
    border-radius: 8px;
    background: #17160eee;
  }
  .online-notice p {
    margin: 6px 0;
  }
</style>
