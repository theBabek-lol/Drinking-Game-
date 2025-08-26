
let names=[], couples={}, deck=[], questions=[];
let weights={"nhie":8,"pek":8,"rygg":6,"kat":7,"one_name":4,"two_name":4,"two_name_intim":4,"all":4};
const screens={names:document.getElementById('screen-names'),dating:document.getElementById('screen-dating'),game:document.getElementById('screen-game'),settings:document.getElementById('screen-settings')};
const nameInput=document.getElementById('name-input');
const namesList=document.getElementById('names-list');
document.getElementById('add-name-btn').onclick=addName;
nameInput.addEventListener('keypress', e=>{if(e.key==='Enter')addName();});
function addName(){const n=nameInput.value.trim();if(n&&!names.includes(n)){names.push(n);renderNames();nameInput.value='';nameInput.focus();}}
function renderNames(){namesList.innerHTML='';names.forEach(n=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>{names=names.filter(x=>x!==n);renderNames();};namesList.appendChild(b);});}
function showScreen(n){for(let s in screens)screens[s].classList.add('hidden');screens[n].classList.remove('hidden');}
