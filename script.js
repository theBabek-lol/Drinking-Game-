document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const screens = {
        names: document.getElementById('screen-names'),
        dating: document.getElementById('screen-dating'),
        game: document.getElementById('screen-game'),
        settings: document.getElementById('screen-settings')
    };

    const nameInput = document.getElementById('name-input');
    const namesList = document.getElementById('names-list');
    const addNameBtn = document.getElementById('add-name-btn');
    const startDatingBtn = document.getElementById('start-dating-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backNamesBtn = document.getElementById('back-names-btn');
    const nextBtn = document.getElementById('next-btn');
    const changeNamesBtn = document.getElementById('change-names-btn');
    const card = document.getElementById('card');
    const namesDating = document.getElementById('names-dating');
    const couplesDating = document.getElementById('couples-dating');
    const weightsList = document.getElementById('weights-list');

    // --- Game State ---
    let names = [];
    let couples = {};
    let questions = [];
    const weights = {"nhie":8,"pek":8,"rygg":6,"kat":7,"one_name":3,"two_name":3,"two_name_intim":2,"all":4};

    let questionPools = {}; // grouped by type { type: { all:[], remaining:[] } }
    let ryggQuestion = null;
    let ryggNames = [];
    let waitingForRyggReveal = false; // flag for rygg flow

    // Important: buildDeck will only run once per page load/start session.
    let deckBuilt = false;

    // --- Helper: attach click (buttons ONLY) ---
    function addClickEvents(el, handler) {
        if (!el) return;
        el.addEventListener('click', handler);
        el.addEventListener('touchstart', (e) => {
            // prevent duplicate click/touch on mobile buttons
            // KEEP this only for buttons — do NOT use addClickEvents on sliders
            e.preventDefault();
            handler();
        }, { passive: false });
    }

    // --- Screen Logic ---
    function showScreen(screen) {
        for (const s in screens) screens[s].classList.add('hidden');
        screens[screen].classList.remove('hidden');
        if (screen === "settings") renderWeights();
    }

    // --- Names Management ---
    function addName(e) {
        if (e) e.preventDefault();
        const n = nameInput.value.trim();
        if (n && !names.includes(n)) {
            names.push(n);
            renderNames();
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
                // remove name and any couple association
                names = names.filter(x => x !== n);
                if (couples[n]) {
                    const partner = couples[n];
                    delete couples[n];
                    if (partner) delete couples[partner];
                }
                renderNames();
            });
            namesList.appendChild(b);

            // playful pop-in (if you have CSS for .pop-in)
            setTimeout(() => b.classList.add('pop-in'), 10);
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
    }

    function removeCouple(n1, n2) {
        delete couples[n1];
        delete couples[n2];
        renderDating();
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

    // --- Deck Logic (built only once) ---
    function buildDeck() {
        if (deckBuilt) return; // IMPORTANT: never rebuild once built
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
    }

    function pickType() {
        const totalWeight = Object.values(weights).reduce((a,b)=>a+b,0);
        // if totalWeight is 0, fallback to equal chance among existing types
        if (totalWeight <= 0) {
            const types = Object.keys(questionPools);
            return types[Math.floor(Math.random() * types.length)];
        }
        let r = Math.random() * totalWeight;
        for (let type in weights) {
            r -= weights[type];
            if (r <= 0) return type;
        }
        // fallback
        return Object.keys(weights)[0];
    }

    function drawQuestion() {
        // Do not auto-rebuild on subsequent calls — only build once at start
        if (!deckBuilt) buildDeck();

        const type = pickType();
        const pool = questionPools[type];
        if (!pool) return null;

        if (pool.remaining.length === 0) {
            // reshuffle this type's own list when it runs out (acceptable)
            pool.remaining = shuffle([...pool.all]);
        }

        return pool.remaining.pop();
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
            card.textContent = 'Inga fler frågor!';
            return;
        }

        // flip animation trigger (if CSS defined)
        card.classList.remove('flip');
        void card.offsetWidth;
        card.classList.add('flip');

        if (q.type === 'nhie') {
            card.textContent = `Jag har aldrig\n${q.template}`;
        } else if (q.type === 'one_name') {
            card.textContent = q.template.replace('{}', randomName());
        } else if (q.type === 'two_name') {
            const n1 = randomName();
            const n2 = randomName([n1]);
            card.textContent = q.template.replace('{}', n1).replace('{}', n2);
        } else if (q.type === 'rygg') {
            // pick two distinct names
            const n1 = randomName();
            const n2 = randomName([n1]);
            if (!n1 || !n2 || n1 === '(ingen)' || n2 === '(ingen)') {
                card.textContent = 'Behövs minst två spelare för rygg mot rygg.';
            } else {
                ryggNames = [n1, n2];
                ryggQuestion = q.template;
                card.textContent = `Rygg mot rygg\n${ryggNames[0]} & ${ryggNames[1]}`;
                nextBtn.textContent = 'Visa fråga';
                waitingForRyggReveal = true;
                return;
            }
        } else if (q.type === 'pek') {
            card.textContent = `Pekleken!\n${q.template}`;
        } else if (q.type === 'kat') {
            card.textContent = `Kategori!\n${q.template.replace('{}', randomName())}`;
        } else if (q.type === 'all') {
            card.textContent = q.template;
        } else if (q.type === 'two_name_intim') {
            // pairing rules:
            // - If chosen person is coupled -> pair with partner
            // - If chosen person is single -> pair with another single
            // - Never mix single with partnered person
            const singles = getSingles();
            const allNames = names.slice();
            if (allNames.length < 2) {
                card.textContent = 'Behövs minst två spelare för denna fråga.';
                nextBtn.textContent = 'Nästa';
                return;
            }

            // pick the first participant (try to avoid '(ingen)')
            const n1 = randomName();
            let n2 = null;

            if (couples[n1]) {
                // n1 is in relationship -> partner guaranteed exists
                n2 = couples[n1];
            } else {
                // n1 is single -> pick another single
                const otherSingles = singles.filter(s => s !== n1);
                if (otherSingles.length > 0) {
                    n2 = otherSingles[Math.floor(Math.random() * otherSingles.length)];
                } else {
                    // No other single available -> try to pick a random couple pair instead
                    const pairs = uniqueCouplePairs();
                    if (pairs.length > 0) {
                        const pick = pairs[Math.floor(Math.random() * pairs.length)];
                        card.textContent = q.template.replace('{}', pick[0]).replace('{}', pick[1]);
                        nextBtn.textContent = 'Nästa';
                        return;
                    } else {
                        card.textContent = 'Inget giltigt par finns för den här frågan.';
                        nextBtn.textContent = 'Nästa';
                        return;
                    }
                }
            }

            if (!n1 || !n2 || n1 === '(ingen)' || n2 === '(ingen)') {
                card.textContent = 'Behövs två spelare för den här frågan.';
            } else {
                card.textContent = q.template.replace('{}', n1).replace('{}', n2);
            }
        }

        nextBtn.textContent = 'Nästa';
    }

    function showRygg() {
        card.textContent = ryggQuestion;
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
        const total = Math.max(1, Object.values(weights).reduce((a,b)=>a+b,0));
        for (let type in weights) {
            const row = document.createElement('div');
            row.className = 'weight-row';

            const label = document.createElement('span');
            label.textContent = type;

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
            percent.textContent = `(${((weights[type]/total)*100).toFixed(0)}%)`;

            // update weights in place — this will affect pickType going forward,
            // but it will NOT rebuild or reshuffle the existing pools (per your request).
            slider.addEventListener('input', () => {
                weights[type] = parseInt(slider.value,10);
                value.textContent = weights[type];
                const newTotal = Math.max(1, Object.values(weights).reduce((a,b)=>a+b,0));
                percent.textContent = `(${((weights[type]/newTotal)*100).toFixed(0)}%)`;
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

    // --- Attach main buttons ---
    addClickEvents(addNameBtn, addName);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(e); });
    addClickEvents(startDatingBtn, () => { renderDating(); showScreen('dating'); });

    addClickEvents(startGameBtn, () => {
        // build deck only the first time; never rebuild after changes per request
        if (!deckBuilt) buildDeck();
        showScreen('game');
        if (!waitingForRyggReveal) nextChallenge();
    });

    addClickEvents(changeNamesBtn, () => showScreen('names'));
    addClickEvents(settingsBtn, () => showScreen('settings'));
    addClickEvents(backNamesBtn, () => showScreen('names'));
    addClickEvents(nextBtn, nextChallenge);

    // --- Initialize ---
    await loadQuestions();
    renderNames();
    showScreen('names');
});
