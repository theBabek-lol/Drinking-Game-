
// --- Dating Screen ---
const namesDating=document.getElementById('names-dating');
const couplesDating=document.getElementById('couples-dating');
let selectedName=null;

document.getElementById('start-dating-btn').onclick=()=>{
    renderDatingNames();
    renderDatingCouples();
    showScreen('dating');
};

document.getElementById('start-game-btn').onclick=()=>{
    showScreen('game');
};

// Render names for dating selection
function renderDatingNames(){
    namesDating.innerHTML='';
    names.forEach(n=>{
        const btn=document.createElement('button');
        btn.textContent=n;
        btn.onclick=()=>selectDatingName(n);
        namesDating.appendChild(btn);
    });
}

// Render current couples
function renderDatingCouples(){
    couplesDating.innerHTML='';
    const seen=new Set();
    for(let n1 in couples){
        const n2=couples[n1];
        if(seen.has(n1)||seen.has(n2)) continue;
        const btn=document.createElement('button');
        btn.textContent=`${n1} ❤️ ${n2}`;
        btn.onclick=()=>removeCouple(n1,n2);
        couplesDating.appendChild(btn);
        seen.add(n1); seen.add(n2);
    }
}

function selectDatingName(name){
    if(selectedName===null){
        selectedName=name;
    } else {
        if(selectedName!==name){
            couples[selectedName]=name;
            couples[name]=selectedName;
        }
        selectedName=null;
        renderDatingCouples();
    }
}

function removeCouple(n1,n2){
    delete couples[n1];
    delete couples[n2];
    renderDatingCouples();
}

// --- Game Screen ---
const card=document.getElementById('card');
document.getElementById('next-btn').onclick=nextChallenge;
document.getElementById('change-names-btn').onclick=()=>showScreen('names');

function buildDeck(){
    deck=[];
    questions.forEach(q=>{
        const type=q.type;
        const w=weights[type]||1;
        for(let i=0;i<w;i++) deck.push(q);
    });
    shuffle(deck);
}

function drawQuestion(){
    if(deck.length===0) buildDeck();
    return deck.pop();
}

// Simple shuffle
function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
}

function nextChallenge(){
    if(questions.length===0){card.textContent="Inga frågor"; return;}
    const q=drawQuestion();
    const t=q.type;
    const tpl=q.template;
    if(t==="nhie") card.textContent=`Jag har aldrig\n${tpl}`;
    else if(t==="one_name") card.textContent=tpl.replace("{}",randomName());
    else if(t==="two_name") card.textContent=tpl.replace("{}",randomName()).replace("{}",randomName());
    else if(t==="kat") card.textContent=`Kategori!\n${tpl.replace("{}",randomName())}`;
    else if(t==="rygg") card.textContent=`Rygg mot rygg\n${randomName()} & ${randomName()}`;
    else if(t==="all") card.textContent=tpl;
    else if(t==="two_name_intim") card.textContent=tpl.replace("{}",randomName()).replace("{}",randomName());
}

function randomName(){
    return names[Math.floor(Math.random()*names.length)];
}
