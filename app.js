// ------- State -------
let activeCategory = "Alle";
let searchTerm = "";
let currentGameId = null;
let proostTally = 0;

const CARD_NAMES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "B", "V", "H"];
const CARD_SUITS = ["♥", "♦", "♣", "♠"];

// ------- Init -------
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  buildFilters();
  renderGrid();
  updateProostLabel();
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();
});

// ------- Theme -------
function initTheme() {
  const saved = safeGet("kdk-theme");
  const theme = saved || "dark";
  applyTheme(theme);
}
function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    document.getElementById("themeToggle").textContent = "☀️";
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.getElementById("themeToggle").textContent = "🌙";
  }
  safeSet("kdk-theme", theme);
}
function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  applyTheme(isLight ? "dark" : "light");
}

// ------- Filters -------
function buildFilters() {
  const cats = ["Alle", ...new Set(GAMES.flatMap((g) => g.categorie))];
  const bar = document.getElementById("filterBar");
  bar.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    )
    .join("");
  bar.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      buildFilters();
      renderGrid();
    });
  });
}

function onSearch(value) {
  searchTerm = value.trim().toLowerCase();
  renderGrid();
}

function getFiltered() {
  return GAMES.filter((g) => {
    const matchCat = activeCategory === "Alle" || g.categorie.includes(activeCategory);
    const matchSearch =
      !searchTerm ||
      g.naam.toLowerCase().includes(searchTerm) ||
      g.tagline.toLowerCase().includes(searchTerm) ||
      g.categorie.join(" ").toLowerCase().includes(searchTerm);
    return matchCat && matchSearch;
  });
}

// ------- Grid rendering -------
function renderGrid() {
  const grid = document.getElementById("gamesGrid");
  const list = getFiltered();
  const favs = getFavorites();

  document.getElementById("emptyState").hidden = list.length !== 0;

  grid.innerHTML = list
    .map((g) => {
      const isFav = favs.includes(g.id);
      return `
      <div class="game-card" data-id="${g.id}">
        <div class="game-card-top">
          <span class="game-emoji">${g.emoji}</span>
          <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${g.id}" title="Favoriet">${isFav ? "⭐" : "☆"}</button>
        </div>
        <h3 class="game-name">${escapeHtml(g.naam)}</h3>
        <p class="game-tagline">${escapeHtml(g.tagline)}</p>
        <div class="game-meta">
          <span class="heat" title="Heftigheid">${"🍺".repeat(g.heat)}</span>
          <span class="tag-pill">${escapeHtml(g.spelers)} spelers</span>
        </div>
      </div>`;
    })
    .join("");

  grid.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".fav-btn")) return;
      openGame(card.dataset.id);
    });
  });
  grid.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.fav);
      renderGrid();
    });
  });
}

function scrollToGrid() {
  document.getElementById("gamesGrid").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------- Favorites (localStorage) -------
function getFavorites() {
  try {
    return JSON.parse(safeGet("kdk-favs") || "[]");
  } catch {
    return [];
  }
}
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  safeSet("kdk-favs", JSON.stringify(favs));
}

// ------- Detail view / routing -------
function routeFromHash() {
  const id = decodeURIComponent(location.hash.replace("#", ""));
  const game = GAMES.find((g) => g.id === id);
  if (game) {
    showDetail(game, false);
  } else {
    showHome(false);
  }
}

function openGame(id) {
  location.hash = id;
}

function showDetail(game, updateHash = true) {
  currentGameId = game.id;
  document.getElementById("homeView").hidden = true;
  document.getElementById("detailView").hidden = false;
  document.getElementById("detailCard").innerHTML = renderDetailHtml(game);
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (updateHash) location.hash = game.id;
  document.title = `${game.naam} — Kroeg der Kroegspelen 🍻`;
}

function renderDetailHtml(g) {
  return `
    <div class="detail-header">
      <div class="detail-emoji">${g.emoji}</div>
      <div>
        <h2 class="detail-title">${escapeHtml(g.naam)}</h2>
      </div>
    </div>
    <p class="detail-tagline">${escapeHtml(g.tagline)}</p>

    <div class="detail-metas">
      <span class="meta-pill">👥 ${escapeHtml(g.spelers)} spelers</span>
      <span class="meta-pill">${"🍺".repeat(g.heat)} heftigheid</span>
      <span class="meta-pill">${g.categorie.map(escapeHtml).join(" · ")}</span>
    </div>

    <div class="detail-section">
      <h3>Wat heb je nodig</h3>
      <ul class="needed-list">${g.nodig.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
    </div>

    <div class="detail-section">
      <h3>Spelregels</h3>
      <ol class="rules-list">${g.regels.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ol>
    </div>

    ${
      g.tips && g.tips.length
        ? `<div class="detail-section">
            <h3>Pro tips</h3>
            <ul class="tips-list">${g.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
          </div>`
        : ""
    }
  `;
}

function showHome(updateHash = true) {
  currentGameId = null;
  document.getElementById("homeView").hidden = false;
  document.getElementById("detailView").hidden = true;
  document.title = "Kroeg der Kroegspelen 🍻";
  if (updateHash) history.pushState("", document.title, location.pathname + location.search);
}

function goHome() {
  showHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function prevGame() {
  navigateRelative(-1);
}
function nextGame() {
  navigateRelative(1);
}
function navigateRelative(delta) {
  const idx = GAMES.findIndex((g) => g.id === currentGameId);
  if (idx === -1) return;
  const next = GAMES[(idx + delta + GAMES.length) % GAMES.length];
  showDetail(next);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function randomGameFromDetail() {
  const other = GAMES.filter((g) => g.id !== currentGameId);
  const pick = other[Math.floor(Math.random() * other.length)];
  showDetail(pick);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ------- Spin de fles -------
function spinTheBottle() {
  const overlay = document.getElementById("bottleOverlay");
  const emojiEl = document.getElementById("bottleEmoji");
  const nameEl = document.getElementById("bottleName");
  const playBtn = document.getElementById("bottlePlayBtn");

  overlay.hidden = false;
  emojiEl.classList.add("spinning");
  nameEl.textContent = "…kiest een spel…";

  let ticks = 0;
  const maxTicks = 16;
  const spin = setInterval(() => {
    const g = GAMES[Math.floor(Math.random() * GAMES.length)];
    emojiEl.textContent = g.emoji;
    nameEl.textContent = g.naam;
    ticks++;
    if (ticks >= maxTicks) {
      clearInterval(spin);
      emojiEl.classList.remove("spinning");
      const chosen = GAMES[Math.floor(Math.random() * GAMES.length)];
      emojiEl.textContent = chosen.emoji;
      nameEl.textContent = chosen.naam;
      playBtn.onclick = () => {
        closeBottle();
        showDetail(chosen);
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    }
  }, 90);
}
function closeBottle() {
  document.getElementById("bottleOverlay").hidden = true;
}

// ------- Dice tray tools -------
function toggleDiceTray() {
  const tray = document.getElementById("diceTray");
  tray.hidden = !tray.hidden;
}
function rollDice() {
  const val = 1 + Math.floor(Math.random() * 6);
  const faces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  document.getElementById("diceResult").textContent = faces[val];
}
function drawCard() {
  const name = CARD_NAMES[Math.floor(Math.random() * CARD_NAMES.length)];
  const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
  document.getElementById("cardResult").textContent = `${name}${suit}`;
}
function flipCoin() {
  document.getElementById("coinResult").textContent = Math.random() < 0.5 ? "Kop 🙂" : "Munt 🔵";
}

// ------- Proost + confetti -------
function proost() {
  proostTally++;
  safeSet("kdk-proost", String(proostTally));
  updateProostLabel();
  launchConfetti();
}
function updateProostLabel() {
  const saved = parseInt(safeGet("kdk-proost") || "0", 10);
  proostTally = Math.max(proostTally, saved || 0);
  const label = document.getElementById("proostCount");
  if (proostTally > 0) {
    label.textContent = `Al ${proostTally}x geproost op deze site 🥳`;
  }
}

function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  const emojis = ["🍺", "🍻", "🥂", "🍷", "🎉"];
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    speed: 2 + Math.random() * 3,
    drift: (Math.random() - 0.5) * 2,
    size: 16 + Math.random() * 16,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.1,
  }));

  let frames = 0;
  const maxFrames = 140;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.y += p.speed;
      p.x += p.drift;
      p.rot += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px sans-serif`;
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });
    frames++;
    if (frames < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  tick();
}

// ------- Utils -------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore (private mode, quota, etc.) */
  }
}
