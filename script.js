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
    const settingsBtn = document.getElementById('settings-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const nextBtn = document.getElementById('next-btn');
    const changeNamesBtn = document.getElementById('change-names-btn');
    const card = document.getElementById('card');
    const namesDating = document.getElementById('names-dating');
    const couplesDating = document.getElementById('couples-dating');

    // --- Game State ---
    let names = [];
    let couples = {}; // {name1: name2, name2: name1}
    let questions = [];
    let weights = {"nhie":8,"pek":8,"rygg":6,"kat":7,"one_name":4,"two_name":4,"two_name_intim":4,"all":4};
    let deck = [];
    let ryggQuestion = null;
    let ryggNames = [];

    // --- Screen Logic ---
    function showScreen(screen) {
        for(let s in screens) screens[s].classList.add('hidden');
        screens[screen].classList.remove('hidden');
    }

    // --- Names Management ---
    function addName(e) {
        if(e) e.preventDefault();
        const n = nameInput.value.trim();
        if(n && !names.includes(n)) {
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
            b.onclick = () => {
                names = names.filter(x=>x!==n);
                renderNames();
            };
            namesList.appendChild(b);
        });
    }

    addNameBtn.onclick = addName;
    nameInput.addEventListener('keypress', e => { if(e.key==='Enter') addName(e); });

    // --- Dating Screen ---
    let selectedName = null;

    function renderDating() {
        namesDating.innerHTML = '';
        couplesDating.innerHTML = '';
        names.forEach(n => {
            const b = document.createElement('button');
            b.textContent = n;
            b.onclick = () => selectName(n);
            namesDating.appendChild(b);
        });

        const seen = new Set();
        for(let n1 in couples) {
            const n2 = couples[n1];
            if(seen.has(n1) || seen.has(n2)) continue;
            const b = document.createElement('button');
            b.textContent = `${n1} ❤️ ${n2}`;
            b.onclick = () => removeCouple(n1,n2);
            couplesDating.appendChild(b);
            seen.add(n1);
            seen.add(n2);
        }
    }

    function selectName(name) {
        if(selectedName === null) selectedName = name;
        else {
            if(name !== selectedName) {
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

    startDatingBtn.onclick = () => {
        renderDating();
        showScreen('dating');
    };

    startGameBtn.onclick = () => {
        buildDeck();
        showScreen('game');
        nextChallenge();
    };

    changeNamesBtn.onclick = () => showScreen('names');

    settingsBtn.onclick = () => showScreen('settings');

    // --- Deck Logic ---
    function buildDeck() {
        deck = [];
        questions.forEach(q => {
            const w = weights[q.type] || 1;
            for(let i=0;i<w;i++) deck.push({...q});
        });
        shuffle(deck);
    }

    function drawQuestion() {
        if(deck.length===0) buildDeck();
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
        let q = drawQuestion();

        if(q.type==='nhie') card.textContent = `Jag har aldrig\n${q.template}`;
        else if(q.type==='one_name') card.textContent = q.template.replace('{}', randomName());
        else if(q.type==='two_name') card.textContent = q.template.replace('{}', randomName()).replace('{}', randomName());
        else if(q.type==='rygg') {
            ryggNames = [randomName(), randomName()];
            ryggQuestion = q.template;
            card.textContent = `Rygg mot rygg\n${ryggNames[0]} & ${ryggNames[1]}`;
            nextBtn.textContent = 'Visa Fråga';
            nextBtn.onclick = showRygg;
            return;
        }
        else if(q.type==='pek') card.textContent = `Pekleken!\n${q.template}`;
        else if(q.type==='kat') card.textContent = `Kategori!\n${q.template.replace('{}', randomName())}`;
        else if(q.type==='all') card.textContent = q.template;
        else if(q.type==='two_name_intim') {
            let name1 = randomName();
            let name2 = couples[name1] || randomName([name1]);
            card.textContent = q.template.replace('{}', name1).replace('{}', name2);
        }

        nextBtn.textContent = 'Nästa';
        nextBtn.onclick = nextChallenge;
    }

    function showRygg() {
        card.textContent = ryggQuestion;
        nextBtn.textContent = 'Nästa';
        nextBtn.onclick = nextChallenge;
    }

    function randomName(exclude=[]) {
        const available = names.filter(n => !exclude.includes(n));
        return available[Math.floor(Math.random() * available.length)];
    }

    // --- Load JSON Questions ---
    async function loadQuestions() {
        try {
            const res = await fetch('questions.json');
            if(!res.ok) throw new Error('File not found');
            questions = await res.json();
        } catch(err) {
            console.warn('Could not load questions.json, using fallback');
            questions = [
                {type:'nhie', template:'Never have I ever…'},
                {type:'one_name', template:'{} must take a drink'},
                {type:'two_name', template:'{} and {} swap drinks'}
            ];
        }
    }

    await loadQuestions();
    showScreen('names');
});
