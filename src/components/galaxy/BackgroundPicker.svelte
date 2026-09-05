<script lang="ts">
  import { GALAXY_BACKGROUNDS, type GalaxyBackgroundId } from './backgrounds';
  export let value: GalaxyBackgroundId;
  export let onchange: (value: GalaxyBackgroundId) => void;
</script>

<fieldset class="background-picker">
  <legend>Your view of the universe</legend>
  <div class="background-options">
    {#each GALAXY_BACKGROUNDS as background (background.id)}
      <label class:chosen={value === background.id}>
        <input
          type="radio"
          name="galaxy-background"
          value={background.id}
          checked={value === background.id}
          onchange={() => onchange(background.id)}
        />
        <img src={background.image} alt="" />
        <span>{background.name}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .background-picker {
    margin: 20px 0;
  }
  .background-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  label {
    position: relative;
    overflow: hidden;
    border: 1px solid #ffffff30;
    border-radius: 6px;
    cursor: pointer;
    background: #040a13;
  }
  label.chosen {
    border-color: #8de7ff;
    box-shadow: 0 0 0 1px #8de7ff;
  }
  label:focus-within {
    outline: 2px solid #fff;
    outline-offset: 4px;
  }
  input {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 16px;
    height: 16px;
    min-height: 0;
    margin: 0;
    accent-color: #8de7ff;
  }
  img {
    display: block;
    width: 100%;
    height: 62px;
    object-fit: cover;
  }
  span {
    display: block;
    padding: 8px;
    font-size: 10px;
    color: #e4eef7;
    line-height: 1.4;
  }
</style>
