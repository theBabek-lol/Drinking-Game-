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

    // --- Add classes for styling rules ---
    changeNamesBtn.classList.add('change-name-btn');
    nextBtn.classList.add('next-btn');

    // --- Game State ---
    let names = [];
    let couples = {}; 
    let questions = [];
    const weights = {"nhie":8,"pek":8,"rygg":6,"kat":7,"one_name":4,"two_name":4,"two_name_intim":4,"all":4};
    let deck = [];
    let ryggQuestion = null;
    let ryggNames = [];

    // --- Helper: attach mobile-friendly click events ---
    function addClickEvents(el, handler) {
        if (!el) return;
        el.addEventListener('click', handler);
        el.addEventListener('touchstart', (e) => {
            e.preventDefault(); // prevent duplicate click
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
            addClickEvents(b, () => {
                names = names.filter(x => x !== n);
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
            addClickEvents(b, () => selectName(n));
            namesDating.appendChild(b);
        });

        const seen = new Set();
        for (let n1 in couples) {
            const n2 = couples[n1];
            if (seen.has(n1) || seen.has(n2)) continue;
            const b = document.createElement('button');
            b.textContent = `${n1} ❤️ ${n2}`;
            addClickEvents(b, () => removeCouple(n1,n2));
            couplesDating.appendChild(b);
            seen.add(n1);
            seen.add(n2);
        }
    }

    function selectName(name) {
        if (selectedName === null) selectedName = name;
        else {
            if (name !== selectedName) {
                couples[selectedName] = name;
                couples[name] = selectedName;
            }
            selectedName = null;
            renderDating();
        }
    }

    function removeCouple(n1,n2) {
        delete couples[n1];
        delete couples[n2];
        renderDating();
    }

    // --- Deck Logic ---
    function buildDeck() {
        deck = [];
        if (!questions.length) {
            questions = [
                {type:'nhie', template:'Jag har aldrig…'},
                {type:'one_name', template:'{} tar en klunk'},
                {type:'two_name', template:'{} och {} byter plats'}
            ];
        }
        questions.forEach(q => {
            const w = weights[q.type] || 1;
            for (let i = 0; i < w; i++) deck.push({...q});
        });
        shuffle(deck);
    }

    function drawQuestion() {
        if (deck.length === 0) buildDeck();
        return deck.pop();
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Game Logic ---
    function nextChallenge() {
        const q = drawQuestion();
        if (!q) {
            card.textContent = 'Inga fler frågor!';
            return;
        }

        if (q.type === 'nhie') card.textContent = `Jag har aldrig\n${q.template}`;
        else if (q.type === 'one_name') card.textContent = q.template.replace('{}', randomName());
        else if (q.type === 'two_name') {
            const n1 = randomName();
            const n2 = randomName([n1]);
            card.textContent = q.template.replace('{}', n1).replace('{}', n2);
        }
        else if (q.type === 'rygg') {
            ryggNames = [randomName(), randomName()];
            ryggQuestion = q.template;
            card.textContent = `Rygg mot rygg\n${ryggNames[0]} & ${ryggNames[1]}`;
            nextBtn.textContent = 'Visa fråga';
            addClickEvents(nextBtn, showRygg);
            return;
        }
        else if (q.type === 'pek') card.textContent = `Pekleken!\n${q.template}`;
        else if (q.type === 'kat') card.textContent = `Kategori!\n${q.template.replace('{}', randomName())}`;
        else if (q.type === 'all') card.textContent = q.template;
        else if (q.type === 'two_name_intim') {
            let name1 = randomName();
            let name2 = couples[name1] || randomName([name1]);
            card.textContent = q.template.replace('{}', name1).replace('{}', name2);
        }

        nextBtn.textContent = 'Nästa';
        addClickEvents(nextBtn, nextChallenge);
    }

    function showRygg() {
        card.textContent = ryggQuestion;
        nextBtn.textContent = 'Nästa';
        addClickEvents(nextBtn, nextChallenge);
    }

    function randomName(exclude=[]) {
        const available = names.filter(n => !exclude.includes(n));
        return available[Math.floor(Math.random() * available.length)] || '(ingen)';
    }

    // --- Settings / Weights ---
    function renderWeights() {
        weightsList.innerHTML = '';
        const total = Object.values(weights).reduce((a,b)=>a+b,0);

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

            slider.oninput = () => {
                weights[type] = parseInt(slider.value,10);
                renderWeights();
            };

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
                {type:'two_name', template:'{} och {} byter plats'}
            ];
        }
    }

    // --- Attach main buttons ---
    addClickEvents(addNameBtn, addName);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(e); });
    addClickEvents(startDatingBtn, () => { renderDating(); showScreen('dating'); });
    addClickEvents(startGameBtn, () => { buildDeck(); showScreen('game'); nextChallenge(); });
    addClickEvents(changeNamesBtn, () => showScreen('names'));
    addClickEvents(settingsBtn, () => showScreen('settings'));
    addClickEvents(backNamesBtn, () => showScreen('names'));

    // --- Initialize ---
    await loadQuestions();
    showScreen('names');
});
