document.addEventListener('DOMContentLoaded', async () => {
    const APP_VERSION = "1.5.10"; // bumpa när du deployar
    
    // --- Cache busting ---
    document.querySelectorAll('link[rel="stylesheet"], script[src]').forEach(el => {
        const srcAttr = el.tagName === "LINK" ? "href" : "src";
        const url = new URL(el.getAttribute(srcAttr), location.href);

        // Only bust for local files (not CDN)
        if (url.origin === location.origin) {
            url.searchParams.set("v", APP_VERSION);
            el.setAttribute(srcAttr, url.pathname + url.search);
        }
    });

    // --- Version label ---
    const versionEl = document.createElement("div");
    versionEl.textContent = `v${APP_VERSION}`;
    versionEl.style.position = "fixed";
    versionEl.style.top = "5px";
    versionEl.style.right = "10px";
    versionEl.style.fontSize = "12px";
    versionEl.style.opacity = "0.7";
    versionEl.style.zIndex = "9999";
    document.body.appendChild(versionEl);

    // --- DOM Elements ---
    const screens = {
        start: document.getElementById('screen-start'),
        names: document.getElementById('screen-names'),
        dating: document.getElementById('screen-dating'),
        game: document.getElementById('screen-game'),
        settings: document.getElementById('screen-settings'),
        rules: document.getElementById('screen-rules')
    };

    const nameInput = document.getElementById('name-input');
    const namesList = document.getElementById('names-list');
    const addNameBtn = document.getElementById('add-name-btn');
    const continueBtn = document.getElementById('continue-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backNamesBtn = document.getElementById('back-names-btn');
    const nextBtn = document.getElementById('next-btn');
    const changeNamesBtn = document.getElementById('change-names-btn');
    const namesDating = document.getElementById('names-dating');
    const couplesDating = document.getElementById('couples-dating');
    const weightsList = document.getElementById('weights-list');
    const gameHeader = document.getElementById('game-header');
    const rulesBtn = document.getElementById('rules-btn');
    const backNamesFromRulesBtn = document.getElementById('back-names-from-rules-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const continueGameBtn = document.getElementById('continue-game-btn');
    const newGameModal = document.getElementById('newgame-modal');
    const confirmNewGameBtn = document.getElementById('confirm-newgame');
    const cancelNewGameBtn = document.getElementById('cancel-newgame');
    const suggestModal = document.getElementById('suggest-modal');
    const openSuggestBtn = document.getElementById('open-suggest-btn');
    const submitSuggestBtn = document.getElementById('submit-suggest-btn');
    const cancelSuggestBtn = document.getElementById('cancel-suggest-btn');
    const suggestInput = document.getElementById('suggest-input');
    const cardStack = document.getElementById('card-stack');
    const cards = cardStack.querySelectorAll('.card');


    // --- Game State ---
    let names = [];
    let couples = {};
    let questions = [];
    const DEFAULT_WEIGHTS = {"nhie":8,"pek":8,"rygg":6,"kat":4,"one_name":3,"two_name":2,"two_name_intim":2,"all":3};
    let weights = {...DEFAULT_WEIGHTS};

    let questionPools = {};
    let ryggQuestion = null;
    let ryggNames = [];
    let waitingForRyggReveal = false;
    let deckBuilt = false;
    let activeCardIndex = 0;
    const weightLabels = {
          nhie: "Jag har aldrig",
          pek: "Pekleken",
          rygg: "Rygg mot rygg",
          kat: "Kategorier",
          one_name: "En person",
          two_name: "Två personer",
          two_name_intim: "Intima utmaingar",
          all: "Alla deltar"
    };

    // --- persistence --
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
            deckBuilt = parsed.deckBuilt || false;
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
        weights = {...DEFAULT_WEIGHTS};
    }

    // --- Helper: only click (fix for PC/mobile) ---
    function addClickEvents(el, handler) {
        if (!el) return;
        el.addEventListener('click', handler);
    }

    // --- Screen Logic ---
    function showScreen(screen) {
        for (const s in screens) {
            screens[s].classList.remove('active');
        }
        screens[screen].classList.add('active');
        if (screen === "settings") renderWeights();
    }

    // --- Names Management ---
    function addName(e) {
        if (e) e.preventDefault();
        const n = nameInput.value.trim();
        if (n && !names.includes(n)) {
            names.push(n);
            renderNames();
            saveState();
            nameInput.value = '';
        }
        nameInput.focus();
    }

    function renderNames() {
        namesList.innerHTML = '';
        names.forEach(n => {
            const b = document.createElement('button');
            b.textContent = n;
            b.classList.add('name-btn');
            addClickEvents(b, () => {
                names = names.filter(x => x !== n);
                if (couples[n]) {
                    const partner = couples[n];
                    delete couples[n];
                    if (partner) delete couples[partner];
                }
                renderNames();
            });
            namesList.appendChild(b);
        });
    }

    // --- Dating Screen ---
    let selectedName = null;

    function renderDating() {
        namesDating.innerHTML = '';
        couplesDating.innerHTML = '';

        names.forEach(n => {
            const b = document.createElement('button');
            b.textContent = n;
            b.classList.add('dating-btn');
            if (selectedName === n) b.classList.add('selected');
            addClickEvents(b, () => selectName(n));
            namesDating.appendChild(b);
        });

        const seen = new Set();
        for (let n1 in couples) {
            const n2 = couples[n1];
            if (!n2) continue;
            if (seen.has(n1) || seen.has(n2)) continue;
            const b = document.createElement('button');
            b.textContent = `${n1} ❤️ ${n2}`;
            b.classList.add('couple-btn');
            addClickEvents(b, () => removeCouple(n1, n2));
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

    function getSingles() {
        return names.filter(n => !couples[n]);
    }

    function uniqueCouplePairs() {
        const pairs = [];
        const seen = new Set();
        for (const a in couples) {
            const b = couples[a];
            if (!b) continue;
            const key1 = `${a}|${b}`;
            const key2 = `${b}|${a}`;
            if (seen.has(key1) || seen.has(key2)) continue;
            pairs.push([a, b]);
            seen.add(key1);
            seen.add(key2);
        }
        return pairs;
    }

    // --- Deck Logic ---
    function buildDeck() {
        if (deckBuilt) return;
        questionPools = {};
        questions.forEach(q => {
            if (!questionPools[q.type]) {
                questionPools[q.type] = { all: [], remaining: [] };
            }
            questionPools[q.type].all.push(q);
        });

        for (let type in questionPools) {
            questionPools[type].remaining = shuffle([...questionPools[type].all]);
        }

        deckBuilt = true;
        waitingForRyggReveal = false;
        saveState();
    }

    function pickType() {
        const totalWeight = Object.values(weights).reduce((a,b)=>a+b,0);
        if (totalWeight <= 0) {
            const types = Object.keys(questionPools);
            return types[Math.floor(Math.random() * types.length)];
        }
        let r = Math.random() * totalWeight;
        for (let type in weights) {
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
        if (pool.remaining.length === 0) {
            pool.remaining = shuffle([...pool.all]);
        }
        const picked = pool.remaining.pop();
        saveState();
        return picked;
    }

    function showCardText(text) {
        const current = cards[activeCardIndex];
        const nextIndex = (activeCardIndex + 1) % 2;
        const next = cards[nextIndex];

        // set new text on the hidden card
        next.textContent = text;

        // animate current out
        current.classList.add('slide-out');
        current.addEventListener('animationend', function handler() {
            current.classList.remove('slide-out', 'active');
            current.removeEventListener('animationend', handler);
        });

        // animate new card in
        next.classList.add('slide-in');
        next.addEventListener('animationend', function handler() {
            next.classList.remove('slide-in');
            next.classList.add('active');
            next.removeEventListener('animationend', handler);
        });

        activeCardIndex = nextIndex;
    }


    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Game Logic ---
   function nextChallenge() {
        if (waitingForRyggReveal) {
            showRygg();
            return;
        }

        const q = drawQuestion();
        if (!q) {
            showCardText('Inga fler frågor!');
            return;
        }

        if (q.type === 'nhie') {
            gameHeader.textContent = "Jag har aldrig";
            showCardText(`Jag har aldrig\n${q.template}`);
        } else if (q.type === 'one_name') {
            gameHeader.textContent = "Utmaning";
            showCardText(q.template.replace('{}', randomName()));
        } else if (q.type === 'two_name') {
            gameHeader.textContent = "Utmaning";
            const n1 = randomName();
            const n2 = randomName([n1]);
            showCardText(q.template.replace('{}', n1).replace('{}', n2));
        } else if (q.type === 'rygg') {
            gameHeader.textContent = "Rygg mot rygg";
            const n1 = randomName();
            const n2 = randomName([n1]);
            if (!n1 || !n2 || n1 === '(ingen)' || n2 === '(ingen)') {
                showCardText('Behövs minst två spelare för rygg mot rygg.');
            } else {
                ryggNames = [n1, n2];
                ryggQuestion = q.template;
                showCardText(`Rygg mot rygg\n${ryggNames[0]} & ${ryggNames[1]}`);
                nextBtn.textContent = 'Visa fråga';
                waitingForRyggReveal = true;
                return;
            }
        } else if (q.type === 'pek') {
            gameHeader.textContent = "Pekleken";
            showCardText(`Pekleken!\n${q.template}`);
        } else if (q.type === 'kat') {
            gameHeader.textContent = "Kategori";
            showCardText(`Kategori!\n${q.template.replace('{}', randomName())}`);
        } else if (q.type === 'all') {
            showCardText(q.template);
        } else if (q.type === 'two_name_intim') {
            gameHeader.textContent = "Utmaning";
            const singles = getSingles();
            const allNames = names.slice();
            if (allNames.length < 2) {
                showCardText('Behövs minst två spelare för denna fråga.');
                nextBtn.textContent = 'Nästa';
                return;
            }

            const n1 = randomName();
            let n2 = null;

            if (couples[n1]) {
                n2 = couples[n1];
            } else {
                const otherSingles = singles.filter(s => s !== n1);
                if (otherSingles.length > 0) {
                    n2 = otherSingles[Math.floor(Math.random() * otherSingles.length)];
                } else {
                    const pairs = uniqueCouplePairs();
                    if (pairs.length > 0) {
                        const pick = pairs[Math.floor(Math.random() * pairs.length)];
                        showCardText(q.template.replace('{}', pick[0]).replace('{}', pick[1]));
                        nextBtn.textContent = 'Nästa';
                        return;
                    } else {
                        showCardText('Inget giltigt par finns för den här frågan.');
                        nextBtn.textContent = 'Nästa';
                        return;
                    }
                }
            }

            if (!n1 || !n2 || n1 === '(ingen)' || n2 === '(ingen)') {
                showCardText('Behövs två spelare för den här frågan.');
            } else {
                showCardText(q.template.replace('{}', n1).replace('{}', n2));
            }
        }

        nextBtn.textContent = 'Nästa';
    }

    function showRygg() {
        showCardText(ryggQuestion);
        nextBtn.textContent = 'Nästa';
        waitingForRyggReveal = false;
    }


    function randomName(exclude = []) {
        const available = names.filter(n => !exclude.includes(n));
        return available[Math.floor(Math.random() * available.length)] || '(ingen)';
    }

    // --- Settings / Weights ---
    function renderWeights() {
        weightsList.innerHTML = '';
        const total = Math.max(1, Object.values(weights).reduce((a, b) => a + b, 0));

        for (let type in weights) {
            const row = document.createElement('div');
            row.className = 'weight-row';

            const label = document.createElement('span');
            label.textContent = weightLabels[type] || type;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 0;
            slider.max = 20;
            slider.value = weights[type];

            const value = document.createElement('span');
            value.className = 'weight-value';
            value.textContent = weights[type];

            const percent = document.createElement('span');
            percent.className = 'weight-percent';
            percent.textContent = `(${((weights[type] / total) * 100).toFixed(0)}%)`;

            slider.addEventListener('input', () => {
                weights[type] = parseInt(slider.value, 10);
                const newTotal = Math.max(1, Object.values(weights).reduce((a, b) => a + b, 0));

                weightsList.querySelectorAll('.weight-row').forEach((r, i) => {
                    const v = r.querySelector('.weight-value');
                    const p = r.querySelector('.weight-percent');
                    const t = Object.keys(weights)[i];
                    v.textContent = weights[t];
                    p.textContent = `(${((weights[t] / newTotal) * 100).toFixed(0)}%)`;
                });
                saveState();
            });

            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(value);
            row.appendChild(percent);
            weightsList.appendChild(row);
        }
    }

    // --- Load JSON Questions ---
    async function loadQuestions() {
        try {
            const res = await fetch('questions.json');
            if (!res.ok) throw new Error('File not found');
            questions = await res.json();
        } catch (err) {
            console.warn('Could not load questions.json, using fallback');
            questions = [
                {type:'nhie', template:'druckit någon annans drink'},
                {type:'one_name', template:'{} tar en klunk'},
                {type:'two_name', template:'{} och {} byter plats'},
                {type:'two_name_intim', template:'{} och {} får en intim fråga'},
                {type:'rygg', template:'Vem har flest …?'}
            ];
        }
    }

    // --- Attach buttons ---
    addClickEvents(addNameBtn, addName);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(e); });
    addClickEvents(continueBtn, () => {
        if (names.length < 2) {
            document.getElementById('players-modal').classList.remove('hidden');
            return;
        }
        renderDating(); showScreen('dating'); 
    });

    addClickEvents(startGameBtn, () => {
        if (!deckBuilt) buildDeck();
        showScreen('game');
        if (!waitingForRyggReveal) nextChallenge();
    });

    addClickEvents(changeNamesBtn, () => showScreen('names'));
    addClickEvents(settingsBtn, () => showScreen('settings'));
    addClickEvents(backNamesBtn, () => showScreen('names'));
    addClickEvents(nextBtn, nextChallenge);
    addClickEvents(rulesBtn, () => showScreen('rules'));
    addClickEvents(backNamesFromRulesBtn, () => showScreen('names'));
    
    addClickEvents(continueGameBtn, () => {
        loadState();         
        renderNames();
        renderDating();
        showScreen('names');
    });

    addClickEvents(newGameBtn, () => {
        newGameModal.classList.remove('hidden');
    });

    addClickEvents(cancelNewGameBtn, () => {
        newGameModal.classList.add('hidden');
    });

    addClickEvents(confirmNewGameBtn, () => {
        resetState();        
        renderNames();
        renderDating();
        showScreen('names');
        newGameModal.classList.add('hidden');
    });

    addClickEvents(document.getElementById('close-players-modal'), () => {
        document.getElementById('players-modal').classList.add('hidden');
    });

    addClickEvents(openSuggestBtn, () => {
        suggestModal.classList.remove('hidden');
    });

    addClickEvents(cancelSuggestBtn, () => {
        suggestModal.classList.add('hidden');
        suggestInput.value = '';
    });

    addClickEvents(submitSuggestBtn, () => {
        const text = suggestInput.value.trim();
        if (!text) return;

        fetch("https://docs.google.com/forms/d/e/1FAIpQLSce5442Wex6BmsNHoo7OAvZl0Sk8ymH5NjjhGIlP0uMlHysfw/formResponse", {
            method: "POST",
            mode: "no-cors",
            body: new URLSearchParams({
                "entry.973501385": text
            })
        });

        suggestModal.classList.add('hidden');
        suggestInput.value = '';
        alert("Tack! Din fråga har skickats.");
    });

    // --- Initialize ---
    await loadQuestions();
    const rawSave = localStorage.getItem(SAVE_KEY);
    if (rawSave) {
        showScreen('start');
    } else {
        loadState();
        renderNames();
        renderDating();
        showScreen('names');
    }

});
