
let names = [], couples = {}, deck = [], questions = [];
let weights = {"nhie":8,"pek":8,"rygg":6,"kat":7,"one_name":4,"two_name":4,"two_name_intim":4,"all":4};

const screens = {
    names: document.getElementById('screen-names'),
    dating: document.getElementById('screen-dating'),
    game: document.getElementById('screen-game'),
    settings: document.getElementById('screen-settings')
};

const nameInput = document.getElementById('name-input');
const namesList = document.getElementById('names-list');
document.getElementById('add-name-btn').onclick = addName;
nameInput.addEventListener('keypress', e => { if(e.key === 'Enter') addName(); });

document.getElementById('start-dating-btn').onclick = () => showScreen('dating');
document.getElementById('settings-btn').onclick = () => showScreen('settings');
document.getElementById('start-game-btn').onclick = () => {
    buildDeck();
    renderDeck();
    showScreen('game');
};
document.getElementById('back-names-btn').onclick = () => showScreen('names');
document.getElementById('next-btn').onclick = nextChallenge;
document.getElementById('change-names-btn').onclick = () => showScreen('names');

// ----------------------
// Load external JSON
// ----------------------
fetch('questions.json')
    .then(resp => resp.json())
    .then(data => { questions = data; buildDeck(); })
    .catch(err => {
        console.error("Failed to load JSON, using fallback", err);
        questions = [
            {type:"nhie", template:"Never have I ever…"},
            {type:"one_name", template:"{} must take a drink"},
            {type:"two_name", template:"{} and {} swap drinks"}
        ];
        buildDeck();
    });

// ----------------------
// Name input functions
// ----------------------
function addName() {
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
        b.onclick = () => { names = names.filter(x => x !== n); renderNames(); };
        namesList.appendChild(b);
    });
}

// ----------------------
// Screen navigation
// ----------------------
function showScreen(n) {
    for(let s in screens) screens[s].classList.add('hidden');
    screens[n].classList.remove('hidden');
}

// ----------------------
// Deck logic
// ----------------------
function buildDeck() {
    deck = [];
    questions.forEach(q => {
        let w = weights[q.type] || 1;
        for(let i=0;i<w;i++) deck.push(q);
    });
    shuffle(deck);
}

function shuffle(array) {
    for(let i=array.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [array[i], array[j]]=[array[j], array[i]];
    }
}

function drawQuestion() {
    if(deck.length === 0) buildDeck();
    return deck.pop();
}

// ----------------------
// Game logic
// ----------------------
function nextChallenge() {
    if(questions.length === 0) return;

    const q = drawQuestion();
    const card = document.getElementById('card');

    switch(q.type) {
        case "nhie":
            card.textContent = `Jag har aldrig\n${q.template}`;
            break;
        case "one_name":
            if(names.length === 0) { card.textContent = "För få namn"; break; }
            card.textContent = q.template.replace("{}", randomChoice(names));
            break;
        case "two_name":
            if(names.length < 2) { card.textContent = "För få namn"; break; }
            let [n1,n2] = randomSample(names,2);
            card.textContent = q.template.replace("{}", n1).replace("{}", n2);
            break;
        case "rygg":
            if(names.length < 2) { card.textContent = "För få namn"; break; }
            [n1,n2] = randomSample(names,2);
            card.textContent = `Rygg mot rygg\n${n1} & ${n2}`;
            break;
        case "pek":
            card.textContent = `Pekleken!\n${q.template}`;
            break;
        case "kat":
            if(names.length === 0) { card.textContent = "För få namn"; break; }
            card.textContent = `Kategori!\n${q.template.replace("{}", randomChoice(names))}`;
            break;
        case "all":
            card.textContent = q.template;
            break;
        case "two_name_intim":
            if(names.length < 2) { card.textContent = "För få namn"; break; }
            n1 = randomChoice(names);
            let n2;
            if(couples[n1]) n2 = couples[n1];
            else {
                let singles = names.filter(x => !couples[x] && x !== n1);
                n2 = singles.length >= 1 ? randomChoice(singles) : names.find(x => x!==n1);
            }
            card.textContent = q.template.replace("{}", n1).replace("{}", n2);
            break;
        default:
            card.textContent = `${q.type}\n${q.template}`;
    }
}

// ----------------------
// Helper functions
// ----------------------
function randomChoice(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

function randomSample(arr, n) {
    let copy = arr.slice(), out=[];
    for(let i=0;i<n;i++){
        let idx=Math.floor(Math.random()*copy.length);
        out.push(copy.splice(idx,1)[0]);
    }
    return out;
}
