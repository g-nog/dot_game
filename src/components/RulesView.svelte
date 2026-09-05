<script lang="ts">
  export let onclose: () => void;
</script>

<div
  class="modal-backdrop"
  role="presentation"
  onclick={(event) => event.currentTarget === event.target && onclose()}
>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
    <button class="close" aria-label="Close rules" onclick={onclose}>×</button>
    <div class="eyebrow">How to play</div>
    <h2 id="rules-title">Three sides. One point.</h2>
    <ol>
      <li>
        <b>The die rolls automatically</b> at the start of your turn to reveal your exact line quota.
        If no compatible sequence can satisfy it, acknowledge a forfeited turn.
      </li>
      <li>
        <b>Drag</b> from a dot to a highlighted legal endpoint. Lines cannot cross, overlap, touch another
        line away from a shared endpoint, or pass through a dot.
      </li>
      <li>
        <b>Claim</b> every empty three-sided triangle completed by your line. A triangle containing another
        dot does not score.
      </li>
      <li>
        <b>Finish</b> the full quota. If your committed choices make the remainder impossible, those lines
        stay and the turn is incomplete.
      </li>
    </ol>
    <p>
      The match ends only when no legal lines remain. Most claimed triangles wins; equal scores are
      a draw.
    </p>
    <button class="primary" onclick={onclose}>Got it</button>
  </div>
</div>
