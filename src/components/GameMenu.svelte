<script lang="ts">
  const games = [
    {
      id: 'galaxy-duel',
      number: '03',
      name: 'Galaxy Duel',
      tag: 'YOUR NEXT MOVE IS WRITTEN IN THE STARS.',
      description:
        'The rules of Triangle Duel. A whole new universe. Connect luminous stars, trace glowing paths, and claim the sky together.',
      image: '/images/galaxy-duel.png',
      label: 'A luminous galaxy with stars connected into triangles',
      meta: '2 players · Dice & galaxies',
    },
    {
      id: 'constellations',
      number: '01',
      name: 'Constellations',
      tag: 'CONNECTION & INTERFERENCE',
      description:
        'A shared sky. Two rival astronomers. Trace your patterns among the stars, or draw a line through your opponent’s plans.',
      image: '/images/celestial-atlas.png',
      label: 'Celestial atlas with faint nebulae and engraved astronomical ornaments',
      meta: '2 players · Local rivalry',
    },
    {
      id: 'triangle-duel',
      number: '02',
      name: 'Triangle Duel',
      tag: 'A LITTLE LUCK. A CLEVER LINE.',
      description:
        'Roll the die, connect the dots, and claim the triangles. Every line opens a possibility. Every turn can change the picture.',
      image: '/images/triangle-duel.png',
      label: 'Geometric triangles in coral and teal connected by dots beside a die',
      meta: '2 players · Dice & strategy',
    },
  ];
</script>

<svelte:head><title>Dot Games · A little friendly rivalry</title></svelte:head>
<div class="gallery">
  <header>
    <a class="brand" href="/index.html">✧ <span>DOT GAMES</span></a><span class="header-note"
      >SMALL GAMES. SHARED MOMENTS.</span
    >
  </header>
  <main>
    <div class="gallery-intro">
      <span class="eyebrow">THE COLLECTION / THREE WAYS TO CONNECT</span>
      <h1>A little friendly<br /><em>rivalry.</em></h1>
      <p>
        One screen. Two minds. A world of possibilities.<br />Pick a game, pull up a chair, and see
        where the lines lead.
      </p>
    </div>
    <div class="game-grid">
      {#each games as game (game.id)}<article class={game.id}>
          <a class="game-image" href={`/${game.id}/index.html`} aria-label={`Play ${game.name}`}
            ><img src={game.image} alt={game.label} /><span class="plate">PLATE {game.number}</span
            >{#if game.id === 'constellations'}<svg viewBox="0 0 600 300" aria-hidden="true"
                ><defs><filter id="glow"><feGaussianBlur stdDeviation="3" /></filter></defs><path
                  d="M 166 186 L 250 81 L 379 113 L 431 213 L 295 241 Z"
                  stroke="#86dbed"
                  stroke-width="6"
                  opacity=".3"
                  fill="none"
                  filter="url(#glow)"
                /><path
                  d="M 166 186 L 250 81 L 379 113 L 431 213 L 295 241 Z"
                  stroke="#96d8e6"
                  stroke-width="1.1"
                  fill="none"
                />{#each [[166, 186], [250, 81], [379, 113], [431, 213], [295, 241]] as [x, y] (x)}<circle
                    cx={x}
                    cy={y}
                    r="9"
                    fill="#a8e1ff"
                    opacity=".08"
                  /><circle cx={x} cy={y} r="3" fill="#f3eedd" />{/each}</svg
              >{/if}</a
          >
          <div class="game-info">
            <span class="eyebrow">{game.tag}</span>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
            <div class="card-footer">
              <span>{game.meta}</span><a class="play" href={`/${game.id}/index.html`}
                >Play <span aria-hidden="true">↗</span></a
              >
            </div>
          </div>
        </article>{/each}
    </div>
    <div class="gallery-note">
      <span>✧</span>
      <p>
        Simple rules. Interesting choices.<br /><small
          >Made to be played together, on the same device.</small
        >
      </p>
    </div>
  </main>
  <footer>
    <span>DOT GAMES / THE COLLECTION</span><span>Good company. Better competition.</span>
  </footer>
</div>

<style>
  .gallery {
    color: #e7e6df;
    background: radial-gradient(ellipse at 50% 0, #182c3c55, transparent 65%), #0a1321;
    min-height: 100vh;
  }
  .gallery header,
  .gallery footer {
    max-width: 1320px;
    margin: auto;
    padding: 28px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #b2c5e21c;
  }
  .header-note,
  .eyebrow {
    font-size: 9px;
    letter-spacing: 2px;
    color: #aeb8c8;
  }
  .gallery main {
    max-width: 1200px;
    margin: auto;
    padding: 66px 40px 10px;
  }
  .gallery-intro {
    position: relative;
    margin-bottom: 55px;
  }
  .gallery-intro > .eyebrow {
    color: #bea57e;
  }
  .gallery h1 {
    font-family: Georgia, serif;
    font-weight: 400;
    font-size: clamp(50px, 7vw, 84px);
    line-height: 1.04;
    letter-spacing: -2px;
    margin: 25px 0;
  }
  .gallery h1 em {
    font-weight: 400;
    color: #d8bc8b;
  }
  .gallery-intro > p {
    position: absolute;
    right: 0;
    bottom: 5px;
    color: #a8b5c8;
    font-size: 14px;
    line-height: 1.9;
  }
  .game-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .game-grid article {
    border: 1px solid #b2c5e226;
    border-radius: 8px;
    overflow: hidden;
    background: #101d2bc9;
    transition: border-color 0.2s;
  }
  .game-grid article:hover {
    border-color: #d0b78688;
  }
  .game-image {
    position: relative;
    display: block;
    aspect-ratio: 1.8;
    overflow: hidden;
  }
  .game-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s;
  }
  .game-image:hover img {
    transform: scale(1.025);
  }
  .game-image svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .plate {
    position: absolute;
    top: 19px;
    left: 21px;
    font-size: 8px;
    letter-spacing: 2px;
    color: #d1c1a3;
  }
  .game-info {
    padding: 27px;
  }
  .game-info .eyebrow {
    font-size: 8px;
    color: #afbcce;
  }
  .game-info h2 {
    font-family: Georgia, serif;
    font-size: 34px;
    font-weight: 400;
    letter-spacing: -0.7px;
    margin: 13px 0;
  }
  .game-info > p {
    color: #a7b6ca;
    font-size: 13px;
    line-height: 1.85;
    max-width: 390px;
    min-height: 70px;
  }
  .card-footer {
    margin-top: 25px;
    padding-top: 22px;
    border-top: 1px solid #b2c5e218;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-footer > span {
    font-size: 10px;
    color: #9aacc3;
  }
  .play {
    display: flex;
    justify-content: space-between;
    gap: 35px;
    background: #e0cba4;
    color: #132032;
    border-radius: 4px;
    padding: 13px 19px;
    font-size: 12px;
    min-height: 44px;
  }
  .play:hover {
    background: #f5dfb8;
  }
  .gallery-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: #b8a17c;
    margin: 40px 0;
  }
  .gallery-note > span {
    font-size: 35px;
  }
  .gallery-note p {
    font-family: Georgia, serif;
    font-size: 18px;
    line-height: 1.6;
  }
  .gallery-note small {
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #95a6bc;
  }
  .gallery footer {
    border-top: 1px solid #b2c5e21c;
    border-bottom: 0;
    font-size: 9px;
    color: #8293ab;
    letter-spacing: 1px;
    gap: 20px;
  }
  @media (max-width: 800px) {
    .gallery-intro > p {
      position: static;
    }
    .gallery main {
      padding: 38px 24px 5px;
    }
    .game-grid {
      gap: 18px;
    }
    .game-info {
      padding: 22px;
    }
    .game-info h2 {
      font-size: 29px;
    }
    .game-info > p {
      min-height: 100px;
    }
    .card-footer > span {
      max-width: 85px;
      line-height: 1.6;
    }
  }
  @media (max-width: 580px) {
    .gallery header,
    .gallery footer {
      padding: 23px;
    }
    .header-note {
      font-size: 7px;
      letter-spacing: 1px;
      max-width: 95px;
      line-height: 1.8;
      text-align: right;
    }
    .gallery h1 {
      font-size: 61px;
    }
    .gallery-intro {
      margin-bottom: 32px;
    }
    .gallery-intro > .eyebrow {
      font-size: 8px;
      letter-spacing: 1.4px;
    }
    .gallery-intro > p {
      font-size: 12px;
    }
    .game-grid {
      grid-template-columns: 1fr;
      gap: 27px;
    }
    .game-info > p {
      min-height: 0;
    }
    .card-footer > span {
      max-width: none;
    }
    .gallery-note {
      gap: 14px;
    }
    .gallery-note p {
      font-size: 17px;
    }
    .gallery-note small {
      font-size: 10px;
    }
    .gallery footer {
      font-size: 8px;
      line-height: 1.7;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .game-image img,
    .game-grid article {
      transition: none;
    }
  }
</style>
