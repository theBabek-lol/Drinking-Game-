document.addEventListener("DOMContentLoaded", async () => {
  const APP_VERSION = "2.4.2"; // bump version on deploy

  // -----------------------
  // Cache busting (same-origin only)
  // -----------------------
  document.querySelectorAll('link[rel="stylesheet"], script[src]').forEach((el) => {
    const attr = el.tagName === "LINK" ? "href" : "src";
    const raw = el.getAttribute(attr);
    if (!raw) return;

    const url = new URL(raw, location.href);
    if (url.origin !== location.origin) return;

    url.searchParams.set("v", APP_VERSION);
    el.setAttribute(attr, url.pathname + url.search);
  });

  // -----------------------
  // Version label
  // -----------------------
  const versionEl = document.createElement("div");
  versionEl.textContent = `v${APP_VERSION}`;
  Object.assign(versionEl.style, {
    position: "fixed",
    top: "5px",
    right: "10px",
    fontSize: "12px",
    opacity: "0.7",
    zIndex: "9999",
  });
  document.body.appendChild(versionEl);

  // -----------------------
  // DOM Elements
  // -----------------------
  const screens = {
    start: document.getElementById("screen-start"),
    names: document.getElementById("screen-names"),
    dating: document.getElementById("screen-dating"),
    game: document.getElementById("screen-game"),
    settings: document.getElementById("screen-settings"),
    rules: document.getElementById("screen-rules"),
  };

  const nameInput = document.getElementById("name-input");
  const namesList = document.getElementById("names-list");
  const addNameBtn = document.getElementById("add-name-btn");
  const continueBtn = document.getElementById("continue-btn");
  const startGameBtn = document.getElementById("start-game-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const backNamesBtn = document.getElementById("back-names-btn");
  const nextBtn = document.getElementById("next-btn");
  const changeNamesBtn = document.getElementById("change-names-btn");
  const namesDating = document.getElementById("names-dating");
  const couplesDating = document.getElementById("couples-dating");
  const weightsList = document.getElementById("weights-list");
  const gameHeader = document.getElementById("game-header");
  const rulesBtn = document.getElementById("rules-btn");
  const backNamesFromRulesBtn = document.getElementById("back-names-from-rules-btn");

  const newGameBtn = document.getElementById("new-game-btn");
  const continueGameBtn = document.getElementById("continue-game-btn");
  const newGameModal = document.getElementById("newgame-modal");
  const confirmNewGameBtn = document.getElementById("confirm-newgame");
  const cancelNewGameBtn = document.getElementById("cancel-newgame");

  const playersModal = document.getElementById("players-modal");
  const closePlayersModalBtn = document.getElementById("close-players-modal");

  const suggestModal = document.getElementById("suggest-modal");
  const openSuggestBtn = document.getElementById("open-suggest-btn");
  const submitSuggestBtn = document.getElementById("submit-suggest-btn");
  const cancelSuggestBtn = document.getElementById("cancel-suggest-btn");
  const suggestInput = document.getElementById("suggest-input");

  const cardStack = document.getElementById("card-stack");
  const cards = cardStack ? cardStack.querySelectorAll(".card") : [];
  const qrShare = document.getElementById("qr-share");
  const installBtn = document.getElementById("install-btn");
  const shareBtn = document.getElementById("share-btn");
    // --- iOS Add to Home Screen (library) ---
    const a2hs =
        typeof window.AddToHomeScreen === "function"
            ? window.AddToHomeScreen({
                appName: "Babek´s dryckesspel",
                appNameDisplay: "standalone",
                appIconUrl: "icons/icon-192.png",
                assetUrl: "vendor/add-to-homescreen/assets/img/",
                maxModalDisplayCount: -1,
                displayOptions: { showMobile: true, showDesktop: false },
                allowClose: true,
                showArrow: true,
            })
        : null;

  // -----------------------
  // Game State
  // -----------------------
  let names = [];
  let couples = {};
  let questions = [];

  const DEFAULT_WEIGHTS = {
    nhie: 8,
    pek: 8,
    rygg: 6,
    kat: 4,
    one_name: 3,
    two_name: 2,
    two_name_intim: 2,
    all: 3,
  };

  let weights = { ...DEFAULT_WEIGHTS };

  let questionPools = {};
  let ryggQuestion = null;
  let ryggNames = [];
  let waitingForRyggReveal = false;
  let deckBuilt = false;

  let activeCardIndex = 0;
  let isAnimating = false;

  let touchStartX = 0;

  let deferredPrompt = null;

  const weightLabels = {
    nhie: "Jag har aldrig",
    pek: "Pekleken",
    rygg: "Rygg mot rygg",
    kat: "Kategorier",
    one_name: "En person",
    two_name: "Två personer",
    two_name_intim: "Intima utmaningar",
    all: "Alla deltar",
  };

  // -----------------------
  // Persistence
  // -----------------------
  const SAVE_KEY = "dating-game:v1";

  function saveState() {
    const payload = { names, couples, questionPools, deckBuilt, weights };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      names = parsed.names || [];
      couples = parsed.couples || {};
      questionPools = parsed.questionPools || {};
      deckBuilt = !!parsed.deckBuilt;

      if (parsed.weights) weights = parsed.weights;
    } catch (e) {
      console.warn("No saved state", e);
    }
  }

  function resetState() {
    localStorage.removeItem(SAVE_KEY);
    names = [];
    couples = {};
    questionPools = {};
    deckBuilt = false;
    waitingForRyggReveal = false;
    weights = { ...DEFAULT_WEIGHTS };
  }

  // -----------------------
  // Helpers
  // -----------------------
  function onClick(el, handler) {
    if (!el) return;
    el.addEventListener("click", handler);
  }

  function setModalOpen(modalEl, isOpen) {
    if (!modalEl) return;
    modalEl.classList.toggle("hidden", !isOpen);
    modalEl.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  function showScreen(screenKey) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      const active = key === screenKey;
      el.classList.toggle("hidden", !active);
      el.classList.toggle("active", active);
      el.setAttribute("aria-hidden", active ? "false" : "true");
    });

    if (screenKey === "settings") renderWeights();
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function randomName(exclude = []) {
    const available = names.filter((n) => !exclude.includes(n));
    return available[Math.floor(Math.random() * available.length)] || "(ingen)";
  }

  function getSingles() {
    return names.filter((n) => !couples[n]);
  }

  function uniqueCouplePairs() {
    const pairs = [];
    const seen = new Set();

    for (const a in couples) {
      const b = couples[a];
      if (!b) continue;
      const k1 = `${a}|${b}`;
      const k2 = `${b}|${a}`;
      if (seen.has(k1) || seen.has(k2)) continue;
      pairs.push([a, b]);
      seen.add(k1);
      seen.add(k2);
    }
    return pairs;
  }

    function isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }   

    function trackInstallOnce() {
        if (!window.goatcounter) return;
        if (localStorage.getItem("gc_install_tracked")) return;

        window.goatcounter.count({
            path: "/event/app_installed",
            title: "App Installed",
            event: true,
        });

        localStorage.setItem("gc_install_tracked", "1");
    }

  // -----------------------
  // Names
  // -----------------------
  function addName(e) {
    e?.preventDefault?.();
    const n = (nameInput?.value || "").trim();
    if (n && !names.includes(n)) {
      names.push(n);
      renderNames();
      saveState();
      if (nameInput) nameInput.value = "";
    }
    nameInput?.focus?.();
  }

  function renderNames() {
    if (!namesList) return;
    namesList.innerHTML = "";

    names.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = n;
      b.classList.add("name-btn");

      onClick(b, () => {
        names = names.filter((x) => x !== n);
        if (couples[n]) {
          const partner = couples[n];
          delete couples[n];
          if (partner) delete couples[partner];
        }
        renderNames();
        renderDating();
        saveState();
      });

      namesList.appendChild(b);
    });
  }

  // -----------------------
  // Dating
  // -----------------------
  let selectedName = null;

  function renderDating() {
    if (!namesDating || !couplesDating) return;

    namesDating.innerHTML = "";
    couplesDating.innerHTML = "";

    names.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = n;
      b.classList.add("dating-btn");
      if (selectedName === n) b.classList.add("selected");
      onClick(b, () => selectName(n));
      namesDating.appendChild(b);
    });

    const seen = new Set();
    for (const n1 in couples) {
      const n2 = couples[n1];
      if (!n2 || seen.has(n1) || seen.has(n2)) continue;

      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${n1} ❤️ ${n2}`;
      b.classList.add("couple-btn");
      onClick(b, () => removeCouple(n1, n2));
      couplesDating.appendChild(b);

      seen.add(n1);
      seen.add(n2);
    }
  }

  function selectName(name) {
    if (selectedName === null) {
      selectedName = name;
    } else {
      if (name !== selectedName) {
        couples[selectedName] = name;
        couples[name] = selectedName;
      }
      selectedName = null;
    }

    renderDating();
    saveState();
  }

  function removeCouple(n1, n2) {
    delete couples[n1];
    delete couples[n2];
    renderDating();
    saveState();
  }

  // -----------------------
  // Deck / Questions
  // -----------------------
  function buildDeck() {
    if (deckBuilt) return;

    questionPools = {};
    questions.forEach((q) => {
      if (!questionPools[q.type]) questionPools[q.type] = { all: [], remaining: [] };
      questionPools[q.type].all.push(q);
    });

    for (const type in questionPools) {
      questionPools[type].remaining = shuffle([...questionPools[type].all]);
    }

    deckBuilt = true;
    waitingForRyggReveal = false;
    saveState();
  }

  function pickType() {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    if (totalWeight <= 0) {
      const types = Object.keys(questionPools);
      return types[Math.floor(Math.random() * types.length)];
    }

    let r = Math.random() * totalWeight;
    for (const type in weights) {
      r -= weights[type];
      if (r <= 0) return type;
    }
    return Object.keys(weights)[0];
  }

  function drawQuestion() {
    if (!deckBuilt) buildDeck();

    const type = pickType();
    const pool = questionPools[type];
    if (!pool) return null;

    if (pool.remaining.length === 0) pool.remaining = shuffle([...pool.all]);
    const picked = pool.remaining.pop();

    saveState();
    return picked;
  }

  async function loadQuestions() {
    try {
      const res = await fetch("questions.json", { cache: "no-store" });
      if (!res.ok) throw new Error("questions.json not found");
      questions = await res.json();
    } catch (err) {
      console.warn("Could not load questions.json, using fallback", err);
      questions = [
        { type: "nhie", template: "druckit någon annans drink" },
        { type: "one_name", template: "{} tar en klunk" },
        { type: "two_name", template: "{} och {} byter plats" },
        { type: "two_name_intim", template: "{} och {} får en intim fråga" },
        { type: "rygg", template: "Vem har flest …?" },
      ];
    }
  }

  // -----------------------
  // Cards (fixes: don't clear both cards on flip, ensure anim flag resets)
  // -----------------------
  function clearCard(cardEl) {
    if (!cardEl) return;
    const inner = cardEl.querySelector(".card-inner");
    const front = cardEl.querySelector(".card-front");
    const back = cardEl.querySelector(".card-back");
    inner?.classList.remove("flip");
    if (front) front.textContent = "";
    if (back) back.textContent = "";
  }

  function showCardText(text, { flip = false } = {}) {
    if (!cards.length) return;
    if (isAnimating) return;

    const current = cards[activeCardIndex];
    const nextIndex = (activeCardIndex + 1) % cards.length;
    const next = cards[nextIndex];

    if (flip) {
      // FIX: do NOT reset/clear all cards here; that caused flicker + blank backs.
      isAnimating = true;

      const inner = current.querySelector(".card-inner");
      const back = current.querySelector(".card-back");
      const front = current.querySelector(".card-front");

      if (front) front.textContent = "";
      if (back) back.textContent = text;

      if (!inner) {
        isAnimating = false;
        return;
      }

      inner.classList.add("flip");

      // FIX: ensure anim flag resets even if transition doesn't fire (rare)
      const done = () => {
        inner.removeEventListener("transitionend", done);
        isAnimating = false;
      };
      inner.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 900); // fallback
      return;
    }

    // Slide mode: prepare next card
    clearCard(next);
    const frontNext = next.querySelector(".card-front");
    if (frontNext) frontNext.textContent = text;

    isAnimating = true;

    // Slide out current
    current.classList.add("slide-out");
    current.addEventListener(
      "animationend",
      () => {
        current.classList.remove("slide-out", "active");
      },
      { once: true }
    );

    // Slide in next
    next.classList.add("slide-in");
    next.addEventListener(
      "animationend",
      () => {
        next.classList.remove("slide-in");
        next.classList.add("active");
        activeCardIndex = nextIndex;
        isAnimating = false;
      },
      { once: true }
    );
  }

  // -----------------------
  // Game Logic
  // -----------------------
  function showRygg() {
    // FIX: showRygg uses flip: ensure anim state handled properly
    if (!ryggQuestion) {
      waitingForRyggReveal = false;
      nextBtn && (nextBtn.textContent = "Nästa");
      return;
    }

    showCardText(ryggQuestion, { flip: true });

    if (nextBtn) nextBtn.textContent = "Nästa";
    waitingForRyggReveal = false;
  }

  function nextChallenge() {
    if (waitingForRyggReveal) {
      showRygg();
      return;
    }
    if (isAnimating) return;

    const q = drawQuestion();
    if (!q) {
      showCardText("Inga fler frågor!");
      return;
    }

    switch (q.type) {
      case "nhie":
        if (gameHeader) gameHeader.textContent = "Jag har aldrig";
        showCardText(`Jag har aldrig\n${q.template}`);
        break;

      case "one_name":
        if (gameHeader) gameHeader.textContent = "Utmaning";
        showCardText(q.template.replace("{}", randomName()));
        break;

      case "two_name": {
        if (gameHeader) gameHeader.textContent = "Utmaning";
        const n1 = randomName();
        const n2 = randomName([n1]);
        showCardText(q.template.replace("{}", n1).replace("{}", n2));
        break;
      }

      case "two_name_intim": {
        if (gameHeader) gameHeader.textContent = "Utmaning";

        const allNames = names.slice();
        if (allNames.length < 2) {
          showCardText("Behövs minst två spelare för denna fråga.");
          if (nextBtn) nextBtn.textContent = "Nästa";
          break;
        }

        const singles = getSingles();

        const n1 = randomName();
        let n2 = null;

        if (couples[n1]) {
          n2 = couples[n1];
        } else {
          const otherSingles = singles.filter((s) => s !== n1);
          if (otherSingles.length > 0) {
            n2 = otherSingles[Math.floor(Math.random() * otherSingles.length)];
          } else {
            const pairs = uniqueCouplePairs();
            if (pairs.length > 0) {
              const pick = pairs[Math.floor(Math.random() * pairs.length)];
              showCardText(q.template.replace("{}", pick[0]).replace("{}", pick[1]));
              if (nextBtn) nextBtn.textContent = "Nästa";
              break;
            } else {
              showCardText("Inget giltigt par finns för den här frågan.");
              if (nextBtn) nextBtn.textContent = "Nästa";
              break;
            }
          }
        }

        if (!n1 || !n2 || n1 === "(ingen)" || n2 === "(ingen)") {
          showCardText("Behövs två spelare för den här frågan.");
        } else {
          showCardText(q.template.replace("{}", n1).replace("{}", n2));
        }
        break;
      }

      case "rygg": {
        if (gameHeader) gameHeader.textContent = "Rygg mot rygg";

        const n1 = randomName();
        const n2 = randomName([n1]);

        if (!n1 || !n2 || n1 === "(ingen)" || n2 === "(ingen)") {
          showCardText("Behövs minst två spelare för rygg mot rygg.");
          break;
        }

        ryggNames = [n1, n2];
        ryggQuestion = q.template;

        showCardText(`Rygg mot rygg\n${ryggNames[0]} & ${ryggNames[1]}`);
        if (nextBtn) nextBtn.textContent = "Visa fråga";
        waitingForRyggReveal = true;
        return;
      }

      case "pek":
        if (gameHeader) gameHeader.textContent = "Pekleken";
        showCardText(`Pekleken!\n${q.template}`);
        break;

      case "kat":
        if (gameHeader) gameHeader.textContent = "Kategori";
        showCardText(`Kategori!\n${q.template.replace("{}", randomName())}`);
        break;

      case "all":
        if (gameHeader) gameHeader.textContent = "Alla";
        showCardText(q.template);
        break;

      default:
        showCardText(q.template || "Okänd fråga");
        break;
    }

    if (nextBtn) nextBtn.textContent = "Nästa";
  }

  // -----------------------
  // Settings
  // -----------------------
  function renderWeights() {
    if (!weightsList) return;
    weightsList.innerHTML = "";

    const total = Math.max(1, Object.values(weights).reduce((a, b) => a + b, 0));
    const types = Object.keys(weights);

    types.forEach((type) => {
      const row = document.createElement("div");
      row.className = "weight-row";

      const label = document.createElement("span");
      label.textContent = weightLabels[type] || type;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "20";
      slider.value = String(weights[type]);

      const value = document.createElement("span");
      value.className = "weight-value";
      value.textContent = String(weights[type]);

      const percent = document.createElement("span");
      percent.className = "weight-percent";
      percent.textContent = `(${((weights[type] / total) * 100).toFixed(0)}%)`;

      slider.addEventListener("input", () => {
        weights[type] = parseInt(slider.value, 10) || 0;

        const newTotal = Math.max(1, Object.values(weights).reduce((a, b) => a + b, 0));

        // Update all rows
        const rows = weightsList.querySelectorAll(".weight-row");
        rows.forEach((r, i) => {
          const t = types[i];
          const v = r.querySelector(".weight-value");
          const p = r.querySelector(".weight-percent");
          if (v) v.textContent = String(weights[t]);
          if (p) p.textContent = `(${((weights[t] / newTotal) * 100).toFixed(0)}%)`;
        });

        saveState();
      });

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(value);
      row.appendChild(percent);
      weightsList.appendChild(row);
    });
  }

  // -----------------------
  // Share / Install
  // -----------------------
  async function shareGame() {
    const shareData = {
      title: "Babek´s dryckesspel 🍻",
      text: "Spela Babek´s dryckesspel med oss!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled", err);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      alert("Länken kopierad!");
    } catch {
      alert(shareData.url);
    }
  }

  // Detect if already installed
    const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (isStandalone) {
        installBtn?.classList.add("hidden"); // never show when already installed
    } else {
        // Only show by default on iOS (Android will show it via beforeinstallprompt)
        if (isIOS()) installBtn?.classList.remove("hidden");
        else installBtn?.classList.add("hidden");
    }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;


    // FIX: show the install button when install becomes available (was hidden before)
    installBtn?.classList.remove("hidden");
  });

    installBtn?.addEventListener("click", async () => {
        // Android/Chrome native install prompt
        if (deferredPrompt) {
            deferredPrompt.prompt();

            const choice = await deferredPrompt.userChoice;

            // Only remove the button if the user actually installed
            if (choice && choice.outcome === "accepted") {
                installBtn.remove();
            }

            deferredPrompt = null;
            return;
        }
        // iOS/Safari: show "Add to Home Screen" instructions
        a2hs?.show("sv");
    });
    
    window.addEventListener("appinstalled", () => {
        trackInstallOnce();
    });

    if (
        (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true)
    ) {
        trackInstallOnce();
    }

  // -----------------------
  // Attach Buttons
  // -----------------------
  onClick(addNameBtn, addName);
  nameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addName(e);
  });

  onClick(continueBtn, () => {
    if (names.length < 2) {
      setModalOpen(playersModal, true);
      return;
    }
    renderDating();
    showScreen("dating");
  });

  onClick(startGameBtn, () => {
    if (!deckBuilt) buildDeck();
    showScreen("game");
    if (!waitingForRyggReveal) nextChallenge();
  });

  onClick(changeNamesBtn, () => showScreen("names"));
  onClick(settingsBtn, () => showScreen("settings"));
  onClick(backNamesBtn, () => showScreen("names"));

  onClick(nextBtn, () => {
    if (isAnimating) return;
    nextChallenge();
  });

  onClick(rulesBtn, () => showScreen("rules"));
  onClick(backNamesFromRulesBtn, () => showScreen("names"));

  onClick(continueGameBtn, () => {
    loadState();
    renderNames();
    renderDating();
    showScreen("names");
  });

  onClick(newGameBtn, () => setModalOpen(newGameModal, true));
  onClick(cancelNewGameBtn, () => setModalOpen(newGameModal, false));
  onClick(confirmNewGameBtn, () => {
    resetState();
    renderNames();
    renderDating();
    showScreen("names");
    setModalOpen(newGameModal, false);
  });

  onClick(closePlayersModalBtn, () => setModalOpen(playersModal, false));

  onClick(openSuggestBtn, () => setModalOpen(suggestModal, true));
  onClick(cancelSuggestBtn, () => {
    setModalOpen(suggestModal, false);
    if (suggestInput) suggestInput.value = "";
  });

  onClick(submitSuggestBtn, () => {
    const text = (suggestInput?.value || "").trim();
    if (!text) return;

    fetch(
      "https://docs.google.com/forms/d/e/1FAIpQLSce5442Wex6BmsNHoo7OAvZl0Sk8ymH5NjjhGIlP0uMlHysfw/formResponse",
      {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams({ "entry.973501385": text }),
      }
    );

    setModalOpen(suggestModal, false);
    if (suggestInput) suggestInput.value = "";
    alert("Tack! Din fråga har skickats.");
  });

  // Swipe left to next
  screens.game?.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  screens.game?.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (!isAnimating && touchStartX - touchEndX > 50) {
      nextChallenge();
    }
  });

  // QR share
  if (qrShare) {
    qrShare.addEventListener("click", shareGame);
    qrShare.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        shareGame();
      }
    });
  }

  // Share button
  shareBtn?.addEventListener("click", shareGame);

  // -----------------------
  // Initialize
  // -----------------------
  await loadQuestions();

  // FIX: Start screen should still have access to saved state for "continue"
  loadState();

  const rawSave = localStorage.getItem(SAVE_KEY);
  if (rawSave) {
    showScreen("start");
  } else {
    renderNames();
    renderDating();
    showScreen("names");
  }
});
