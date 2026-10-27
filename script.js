
/* =========================
   CONFIGURARE
========================= */

const VALID_LOGIN = "Yonete";
const VALID_PASSWORD = "PicioareleLuiCezar!";
const STORAGE_KEY = "yoneteChampionBoard";

const CHAMPIONS_URL =
  "https://ddragon.leagueoflegends.com/cdn/16.18.1/data/en_US/champion.json";

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const state = loadState();

const prices = {
  troll: 50,
  priority: 25,
  simple: 10
};

const specialNames = [
  "ce vrei tu",
  "ce vreau eu",
  "secret"
];

/* =========================
   CONFIGURARE RULETA
========================= */

const ROULETTE_OPTIONS = [
  "ce vrei tu",
  "ce vreau eu"
];

const ROULETTE_DURATION = 10000;

const YASUO_PROBABILITY = 50;
const APHELIOS_PROBABILITY = 0.01;
const OTHER_CHAMPIONS_PROBABILITY = 49.99;

let championIndex = {};
let championNames = [];

/* =========================
   PREVIEW IMAGINI - CLICK
========================= */

let activePreview = null;

function showImagePreview(src, name) {
  if (!src) return;

  hideImagePreview();

  const overlay = document.createElement("div");
  overlay.className = "image-preview-overlay";
  overlay.id = "image-preview-overlay";

  const image = document.createElement("img");
  image.src = src;
  image.alt = name || "Imagine marita";
  image.className = "image-preview-full";

  const title = document.createElement("div");
  title.className = "image-preview-name";
  title.textContent = name || "";

  image.onerror = () => hideImagePreview();

  overlay.append(image, title);
  document.body.appendChild(overlay);

  activePreview = overlay;

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      hideImagePreview();
    }
  });
}

function hideImagePreview() {
  if (activePreview) {
    activePreview.remove();
    activePreview = null;
  }

  const existing = document.getElementById(
    "image-preview-overlay"
  );

  if (existing) existing.remove();
}

function setupImagePreview(img, name) {
  if (img.dataset.previewInitialized === "true") return;

  img.dataset.previewInitialized = "true";
  img.style.cursor = "pointer";

  img.addEventListener("click", event => {
    event.stopPropagation();

    if (
      !img.complete ||
      img.naturalWidth === 0 ||
      img.src.includes("placeholder.svg")
    ) {
      return;
    }

    showImagePreview(img.src, name);
  });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    hideImagePreview();
  }
});

/* =========================
   SECRET / SPECIAL
========================= */

function isSecret(name) {
  return specialNames.includes(
    String(name || "").trim().toLocaleLowerCase("ro")
  );
}

/* =========================
   LOCAL STORAGE
========================= */

function loadState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    return {
      troll: Array.isArray(saved?.troll)
        ? saved.troll
        : [],

      priority: Array.isArray(saved?.priority)
        ? saved.priority
        : [],

      simple: Array.isArray(saved?.simple)
        ? saved.simple
        : []
    };
  } catch {
    return {
      troll: [],
      priority: [],
      simple: []
    };
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

/* =========================
   NORMALIZE
========================= */

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("ro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/* =========================
   LOAD CHAMPIONS
========================= */

async function loadChampions() {
  try {
    const response = await fetch(
      CHAMPIONS_URL,
      { cache: "force-cache" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    championIndex = {};
    championNames = [];

    Object.values(json.data).forEach(champion => {
      const name = champion.name.trim();

      championIndex[normalize(name)] = {
        name,
        file: champion.image.full
      };

      championNames.push(name);
    });

    championNames.sort((a, b) => a.localeCompare(b));

    refreshAllSuggestions();
  } catch (error) {
    console.warn(
      "Lista campionilor Riot nu a putut fi incarcata:",
      error
    );

    refreshAllSuggestions();
  }

  Object.keys(state).forEach(renderCategory);
}

/* =========================
   AUTOCOMPLETE
========================= */

function getMatches(query) {
  const q = normalize(query);

  if (!q) return championNames.slice(0, 12);

  return championNames
    .map(name => ({
      name,
      value: normalize(name)
    }))
    .sort((a, b) => {
      const aStarts = a.value.startsWith(q) ? 0 : 1;
      const bStarts = b.value.startsWith(q) ? 0 : 1;

      if (aStarts !== bStarts) {
        return aStarts - bStarts;
      }

      return a.value.localeCompare(b.value);
    })
    .filter(item => item.value.includes(q))
    .slice(0, 10)
    .map(item => item.name);
}

function renderSuggestions(
  input,
  suggestions,
  forceShow = false
) {
  if (!suggestions) return;

  const matches = getMatches(input.value);
  suggestions.innerHTML = "";

  if (!forceShow && !input.value.trim()) {
    suggestions.classList.remove("open");
    return;
  }

  if (!matches.length) {
    suggestions.classList.remove("open");
    return;
  }

  matches.forEach(name => {
    const option = document.createElement("button");

    option.type = "button";
    option.className = "suggestion-option";
    option.textContent = name;

    option.addEventListener("mousedown", event => {
      event.preventDefault();

      input.value = name;
      suggestions.classList.remove("open");
      input.focus();
    });

    suggestions.appendChild(option);
  });

  suggestions.classList.add("open");
}

function refreshAllSuggestions() {
  document
    .querySelectorAll(".champion-autocomplete")
    .forEach(wrapper => {
      const input = wrapper.querySelector(".champion-name");
      const suggestions = wrapper.querySelector(".suggestions");

      if (
        input &&
        suggestions &&
        document.activeElement === input
      ) {
        renderSuggestions(input, suggestions, true);
      }
    });
}

/* =========================
   IMAGE PATH - JPG
========================= */

function imagePath(name) {
  const baseName = isSecret(name)
    ? "secret"
    : String(name || "").trim();

  return (
    "images/" +
    encodeURIComponent(baseName) +
    ".jpg"
  );
}

/* =========================
   RULETA - IDENTIFICARE
========================= */

function isRouletteOption(name) {
  return ROULETTE_OPTIONS.includes(normalize(name));
}

/* =========================
   RULETA - PROBABILITATI
========================= */

function getChampionProbability(name) {
  const key = normalize(name);

  if (key === "yasuo") return YASUO_PROBABILITY;
  if (key === "aphelios") return APHELIOS_PROBABILITY;

  const others = championNames.filter(champion => {
    const normalized = normalize(champion);

    return (
      normalized !== "yasuo" &&
      normalized !== "aphelios"
    );
  });

  return others.length
    ? OTHER_CHAMPIONS_PROBABILITY / others.length
    : 0;
}

function formatProbability(probability) {
  if (probability >= 1) {
    return probability.toLocaleString("ro-RO", {
      maximumFractionDigits: 2
    });
  }

  return probability.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

/* =========================
   RULETA - ALEGERE CAMPION
========================= */

function chooseRouletteChampion() {
  if (!championNames.length) return null;

  const yasuo = championNames.find(
    name => normalize(name) === "yasuo"
  );

  const aphelios = championNames.find(
    name => normalize(name) === "aphelios"
  );

  const others = championNames.filter(name => {
    const key = normalize(name);

    return key !== "yasuo" && key !== "aphelios";
  });

  const roll = Math.random() * 100;

  if (roll < YASUO_PROBABILITY && yasuo) {
    return yasuo;
  }

  if (
    roll < YASUO_PROBABILITY + APHELIOS_PROBABILITY &&
    aphelios
  ) {
    return aphelios;
  }

  if (others.length) {
    return others[
      Math.floor(Math.random() * others.length)
    ];
  }

  return yasuo || aphelios || championNames[0];
}

/* =========================
   RULETA - INTERFATA
========================= */

function createRoulette(entry, category) {
  const wrapper = document.createElement("div");
  wrapper.className = "roulette-wrapper";

  /* FEREASTRA RULETEI */

  const widget = document.createElement("div");
  widget.className = "roulette-widget";

  const stage = document.createElement("div");
  stage.className = "roulette-stage";

  const rouletteImage = document.createElement("img");

  rouletteImage.alt =
    entry.rouletteResult || "Ruleta campionilor";

  rouletteImage.loading = "lazy";
  rouletteImage.decoding = "async";

  rouletteImage.src = imagePath(
    entry.rouletteResult || "Yasuo"
  );

  rouletteImage.onerror = function () {
    if (!this.src.includes("placeholder.svg")) {
      this.src = "images/placeholder.svg";
    }
  };

  rouletteImage.addEventListener("click", event => {
    event.stopPropagation();

    if (
      !rouletteImage.complete ||
      rouletteImage.naturalWidth === 0 ||
      rouletteImage.src.includes("placeholder.svg")
    ) {
      return;
    }

    showImagePreview(
      rouletteImage.src,
      entry.rouletteResult || "Ruleta campionilor"
    );
  });

  stage.appendChild(rouletteImage);

  /* REZULTAT SI PROBABILITATE */

  const resultText = document.createElement("div");
  resultText.className = "roulette-result";

  const probabilityText = document.createElement("div");
  probabilityText.className = "roulette-probability";

  probabilityText.style.fontSize = "11px";
  probabilityText.style.color = "#72f4e8";
  probabilityText.style.marginTop = "3px";

  function updateFinalResult(name) {
    if (!name) {
      resultText.textContent = "Apasa SPIN pentru a incepe";
      probabilityText.textContent = "";
      return;
    }

    resultText.textContent = "Rezultat: " + name;

    probabilityText.textContent =
      "Sansa de aparitie: " +
      formatProbability(getChampionProbability(name)) +
      "%";
  }

  updateFinalResult(entry.rouletteResult);

  /* BUTOANELE RULETEI */

  const controls = document.createElement("div");
  controls.className = "roulette-buttons";

  const spinButton = document.createElement("button");
  spinButton.type = "button";
  spinButton.className = "roulette-spin";
  spinButton.textContent = "SPIN";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "roulette-add-button";
  saveButton.textContent = "SALVEAZA ALEGEREA";
  saveButton.disabled = !entry.rouletteResult;

  controls.append(spinButton, saveButton);

  widget.append(
    stage,
    resultText,
    probabilityText,
    controls
  );

  /* BUTONUL MIC DUPA SALVARE */

  const reopenButton = document.createElement("button");
  reopenButton.type = "button";
  reopenButton.className = "roulette-reopen";
  reopenButton.textContent = "SPIN";
  reopenButton.hidden = true;

  /* CONFIRMAREA - ASCUNSA INITIAL */

  const confirmation = document.createElement("div");
  confirmation.className = "roulette-confirm";
  confirmation.hidden = true;
  confirmation.style.display = "none";

  const question = document.createElement("span");
  question.className = "roulette-confirm-question";
  question.textContent = "ESTI SIGUR?";

  const yesButton = document.createElement("button");
  yesButton.type = "button";
  yesButton.className = "roulette-confirm-yes";
  yesButton.textContent = "DA";

  const noButton = document.createElement("button");
  noButton.type = "button";
  noButton.className = "roulette-confirm-no";
  noButton.textContent = "NU";

  confirmation.append(question, yesButton, noButton);

  let spinning = false;
  let animationTimer = null;

  /* ASCUNDE CONFIRMAREA */

  function hideConfirmation() {
    confirmation.hidden = true;
    confirmation.style.display = "none";
  }

  /* AFISEAZA CONFIRMAREA DOAR LA CERERE */

  function showConfirmation() {
    confirmation.hidden = false;
    confirmation.style.display = "flex";
  }

  /* MODUL DUPA SALVARE */

  function showSavedMode() {
    widget.hidden = true;
    reopenButton.hidden = false;
    hideConfirmation();
  }

  /* MODUL RULETA */

  function showRouletteMode() {
    hideConfirmation();

    widget.hidden = false;
    reopenButton.hidden = true;

    saveButton.textContent = "SALVEAZA ALEGEREA";

    updateFinalResult(entry.rouletteResult);
  }

  /* RESTAURARE STARE */

  if (entry.savedChampion) {
    widget.hidden = true;
    reopenButton.hidden = false;
  } else {
    widget.hidden = false;
    reopenButton.hidden = true;
  }

  hideConfirmation();

  /* BUTONUL MIC SPIN */

  reopenButton.addEventListener("click", () => {
    if (!entry.savedChampion || spinning) return;

    showConfirmation();
  });

  /* DA - REDESCHIDE RULETA */

  yesButton.addEventListener("click", () => {
    showRouletteMode();
  });

  /* NU - PASTREAZA ALEGEREA */

  noButton.addEventListener("click", () => {
    hideConfirmation();

    widget.hidden = true;
    reopenButton.hidden = false;
  });

  /* ROTIRE */

  spinButton.addEventListener("click", () => {
    if (spinning) return;

    if (!championNames.length) {
      resultText.textContent =
        "Lista campionilor nu este disponibila. Verifica conexiunea la internet.";

      probabilityText.textContent = "";
      return;
    }

    const winner = chooseRouletteChampion();

    if (!winner) {
      resultText.textContent =
        "Nu s-a putut selecta un campion.";

      probabilityText.textContent = "";
      return;
    }

    spinning = true;

    widget.classList.add("is-spinning");
    widget.classList.remove("is-winner");

    spinButton.disabled = true;
    saveButton.disabled = true;

    resultText.textContent = "Ruleta se invarte...";
    probabilityText.textContent = "";

    const startedAt = Date.now();

    function animateRoulette() {
      const elapsed = Date.now() - startedAt;

      const progress = Math.min(
        elapsed / ROULETTE_DURATION,
        1
      );

      /* ROTIRE TERMINATA */

      if (progress >= 1) {
        rouletteImage.src = imagePath(winner);
        rouletteImage.alt = winner;

        entry.rouletteResult = winner;

        /* SANSA APARE DOAR DUPA ROTIRE */

        updateFinalResult(winner);

        spinning = false;

        widget.classList.remove("is-spinning");
        widget.classList.add("is-winner");

        spinButton.disabled = false;
        saveButton.disabled = false;
        saveButton.textContent = "SALVEAZA ALEGEREA";

        saveState();
        return;
      }

      /* CAMPIONI IN TIMPUL ANIMATIEI */

      const randomChampion =
        championNames[
          Math.floor(Math.random() * championNames.length)
        ];

      rouletteImage.src = imagePath(randomChampion);
      rouletteImage.alt = randomChampion;

      resultText.textContent = "Ruleta se invarte...";
      probabilityText.textContent = "";

      const delay =
        35 + Math.pow(progress, 3) * 450;

      animationTimer = setTimeout(
        animateRoulette,
        delay
      );
    }

    if (animationTimer) {
      clearTimeout(animationTimer);
    }

    animateRoulette();
  });

  /* SALVARE ALEGERE */

  saveButton.addEventListener("click", () => {
    if (!entry.rouletteResult || spinning) return;

    entry.savedChampion = entry.rouletteResult;

    saveState();

    const card = wrapper.closest(".champion-entry");
    const mainImage = card?.querySelector(":scope > img");

    if (mainImage) {
      mainImage.src = imagePath(entry.savedChampion);
      mainImage.alt = entry.savedChampion;
    }

    showSavedMode();
  });

  wrapper.append(
    widget,
    reopenButton,
    confirmation
  );

  return wrapper;
}

/* =========================
   LOGIN
========================= */

function showApp() {
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

loginForm.addEventListener("submit", event => {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (
    username === VALID_LOGIN &&
    password === VALID_PASSWORD
  ) {
    loginError.textContent = "";

    sessionStorage.setItem("yoneteLoggedIn", "yes");

    showApp();
  } else {
    loginError.textContent =
      "Login sau parola incorecta. Incearca din nou.";
  }
});

/* =========================
   LOGOUT
========================= */

document
  .getElementById("logout-button")
  .addEventListener("click", () => {
    sessionStorage.removeItem("yoneteLoggedIn");

    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    document.getElementById("password").value = "";

    hideImagePreview();
  });

/* =========================
   CATEGORY PANELS
========================= */

document
  .querySelectorAll(".category-panel")
  .forEach(panel => {
    const category = panel.dataset.category;

    const form = panel.querySelector(".champion-form");
    const nameInput = panel.querySelector(".champion-name");
    const suggestions = panel.querySelector(".suggestions");

    /* AUTOCOMPLETE */

    nameInput.addEventListener("input", () => {
      renderSuggestions(nameInput, suggestions);
    });

    nameInput.addEventListener("focus", () => {
      renderSuggestions(nameInput, suggestions, true);
    });

    nameInput.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        suggestions.classList.remove("open");
      }
    });

    document.addEventListener("click", event => {
      const autocomplete = panel.querySelector(
        ".champion-autocomplete"
      );

      if (!autocomplete?.contains(event.target)) {
        suggestions.classList.remove("open");
      }
    });

    /* QUANTITY */

    const damageInput = panel.querySelector(".damage");
    const qtyOutput = panel.querySelector(".qty-value");

    let quantity = 1;

    panel
      .querySelector(".qty-minus")
      .addEventListener("click", () => {
        quantity = Math.max(1, quantity - 1);
        qtyOutput.textContent = quantity;
      });

    panel
      .querySelector(".qty-plus")
      .addEventListener("click", () => {
        quantity += 1;
        qtyOutput.textContent = quantity;
      });

    /* ADD CHAMPION */

    form.addEventListener("submit", event => {
      event.preventDefault();

      const typedName = nameInput.value.trim();

      if (!typedName) return;

      const official =
        championIndex[normalize(typedName)]?.name;

      const name = official || typedName;

      state[category].push({
        id: Date.now() + Math.random(),
        name,
        damage: damageInput.value,
        quantity
      });

      saveState();

      nameInput.value = "";
      suggestions.classList.remove("open");

      quantity = 1;
      qtyOutput.textContent = quantity;

      renderCategory(category);
    });
  });

/* =========================
   RENDER CATEGORY
========================= */

function renderCategory(category) {
  const panel = document.querySelector(
    `[data-category="${category}"]`
  );

  if (!panel) return;

  const list = panel.querySelector(".champion-list");
  list.innerHTML = "";

  if (state[category].length === 0) {
    const empty = document.createElement("div");

    empty.className = "empty-list";
    empty.textContent = "Niciun campion adaugat inca.";

    list.appendChild(empty);
    return;
  }

  state[category].forEach(entry => {
    const card = document.createElement("div");
    card.className = "champion-entry";

    /* IMAGINEA CARDULUI */

    const img = document.createElement("img");

    const displayedChampion =
      isRouletteOption(entry.name) && entry.savedChampion
        ? entry.savedChampion
        : entry.name;

    img.alt = displayedChampion;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    img.onerror = function () {
      img.onerror = null;
      img.src = "images/placeholder.svg";
    };

    img.src = imagePath(displayedChampion);

    setupImagePreview(img, displayedChampion);

    /* INFO */

    const info = document.createElement("div");

    const title = document.createElement("div");
    title.className = "champ-name";
    title.textContent = entry.name;

    /* META */

    const meta = document.createElement("div");
    meta.className = "champ-meta";

    const damage = document.createElement("span");
    damage.className = "pill " + entry.damage.toLowerCase();
    damage.textContent = entry.damage;

    const categoryPrice = document.createElement("span");
    categoryPrice.className = "pill price-pill";
    categoryPrice.textContent = prices[category] + " lei";

    meta.append(damage, categoryPrice);

    /* CONTROLS */

    const controls = document.createElement("div");
    controls.className = "entry-controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Scade cantitatea");

    minus.addEventListener("click", () => {
      entry.quantity = Math.max(1, entry.quantity - 1);

      saveState();
      renderCategory(category);
    });

    const count = document.createElement("span");
    count.textContent = "x" + entry.quantity;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Creste cantitatea");

    plus.addEventListener("click", () => {
      entry.quantity += 1;

      saveState();
      renderCategory(category);
    });

    controls.append(minus, count, plus);

    /* RULETA PENTRU OPTIUNILE SPECIALE */

    if (isRouletteOption(entry.name)) {
      const roulette = createRoulette(entry, category);

      info.append(
        title,
        roulette,
        meta,
        controls
      );
    } else {
      info.append(
        title,
        meta,
        controls
      );
    }

    /* REMOVE */

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-entry";
    remove.textContent = "×";
    remove.title = "Sterge campionul";

    remove.setAttribute(
      "aria-label",
      "Sterge " + entry.name
    );

    remove.addEventListener("click", () => {
      state[category] = state[category].filter(
        item => item.id !== entry.id
      );

      saveState();
      renderCategory(category);
    });

    card.append(img, info, remove);
    list.appendChild(card);
  });
}

/* =========================
   INITIALIZATION
========================= */

Object.keys(state).forEach(renderCategory);

if (
  sessionStorage.getItem("yoneteLoggedIn") === "yes"
) {
  showApp();
}

loadChampions();
