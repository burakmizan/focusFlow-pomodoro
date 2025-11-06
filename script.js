// ---------- State & Defaults ----------
const state = {
  mode: 'pomodoro',
  running: false,
  secsLeft: 25*60,
  cyclesDone: 0,                 // completed pomodoros in current set
  settings: {
    durations: { pomodoro: 25, short: 5, long: 15, testSec: 30 },
    sequence: true,              // 4× pomodoro -> long break
    notifyOnFinish: true,
    soundOnFinish: true,
    sound: 'bell',
    volume: 0.7,
    theme: 'seoul',
    spotifyVisible: true,
    spotifyUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4WYpdgoIcn6'
  }
};

let tick = null;

// ---------- DOM ----------
const bg = document.getElementById('bg');
const pills = document.querySelectorAll('.pill');
const timerEl = document.getElementById('timer');
const cyclesEl = document.getElementById('cycles');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');

const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const tabs = document.querySelectorAll('.tab');
const panes = document.querySelectorAll('.pane');

const themeSelect = document.getElementById('themeSelect');
const notifToggle = document.getElementById('notifToggle');
const sequenceToggle = document.getElementById('sequenceToggle');
const spotifyToggle = document.getElementById('spotifyToggle');
const spotifyUrl = document.getElementById('spotifyUrl');

const pomodoroMin = document.getElementById('pomodoroMin');
const shortMin = document.getElementById('shortMin');
const longMin = document.getElementById('longMin');
const testSec = document.getElementById('testSec');

const soundSelect = document.getElementById('soundSelect');
const soundToggle = document.getElementById('soundToggle');
const volume = document.getElementById('volume');

const saveBtn = document.getElementById('saveBtn');
const resetAll = document.getElementById('resetAll');

const finishSound = document.getElementById('finishSound');
const spotifyWrap = document.getElementById('spotifyWrap');
const spotifyFrame = document.getElementById('spotifyFrame');

// ---------- Utils ----------
const THEMES = {
  seoul:  "url('https://r.resimlink.com/yu7wiPaqcHEK.jpg')",
  tokyo:  "url('https://r.resimlink.com/acKrP.jpg')",
  arctic: "url('https://r.resimlink.com/z1PDjBNls.jpg')",
  forest: "url('https://r.resimlink.com/5S-J7IWLH.jpg')",
  aurora: "url('https://r.resimlink.com/XlyuisnOYa.jpg')",
  anime: "url('https://r.resimlink.com/JlyQjct_7.jpg')",
  aura: "url('https://r.resimlink.com/B6lxpkiPGg.jpg')",
  italy: "url('https://r.resimlink.com/O_Ck73JbR.jpg')",
  milky: "url('https://r.resimlink.com/Xv24z6ES3pi.jpg')",
  northern: "url('https://r.resimlink.com/dYRjmQAi5S.jpg')"
};

const SOUNDS = {
  bell:  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
  soft:  "https://actions.google.com/sounds/v1/alarms/radiation_meter.ogg",
  alert: "https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg"
};

function fmt(secs){
  const m = Math.floor(secs/60);
  const s = secs%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setMode(mode, keepRunning=false){
  state.mode = mode;
  pills.forEach(p=>p.classList.toggle('active', p.dataset.mode===mode));
  const mins = (mode==='pomodoro') ? state.settings.durations.pomodoro
             : (mode==='short')    ? state.settings.durations.short
             :                       state.settings.durations.long;
  state.secsLeft = Math.round(mins*60);
  renderTimer();
  if(!keepRunning) stop();
}

function renderTimer(){
  timerEl.textContent = fmt(state.secsLeft);
  document.title = (state.running? '⏱️ ':'') + fmt(state.secsLeft);
  renderDots();
}

function renderDots(){
  cyclesEl.innerHTML = '';
  for(let i=0;i<4;i++){
    const d = document.createElement('div');
    d.className = 'dot'+(i<state.cyclesDone?' done':'');
    cyclesEl.appendChild(d);
  }
}

function start(){
  if(state.running) return;
  state.running = true;
  startBtn.textContent = 'pause';
  tick = setInterval(()=>{
    state.secsLeft--;
    renderTimer();
    if(state.secsLeft<=0){
      stop();
      onFinish();
    }
  },1000);
}

function stop(){
  state.running = false;
  startBtn.textContent = 'start';
  clearInterval(tick);
}

function reset(){
  setMode(state.mode);
}

function onFinish(){
  // sound
  if(state.settings.soundOnFinish){
    finishSound.src = SOUNDS[state.settings.sound];
    finishSound.volume = state.settings.volume;
    finishSound.currentTime = 0;
    finishSound.play().catch(()=>{});
  }
  // notification
  if(state.settings.notifyOnFinish && 'Notification' in window){
    if(Notification.permission==='granted'){
      new Notification('FocusFlow', { body: 'Timer finished!', icon: '/favicon.ico' });
    }
  }
  // sequence logic
  if(state.settings.sequence){
    if(state.mode==='pomodoro'){
      state.cyclesDone++;
      if(state.cyclesDone>=4){ setMode('long'); state.cyclesDone=0; }
      else { setMode('short'); }
    }else{
      setMode('pomodoro');
    }
  }
}

function applyTheme(){
  bg.style.backgroundImage = THEMES[state.settings.theme] || THEMES.seoul;
}

function applySpotify(){
  spotifyWrap.style.display = state.settings.spotifyVisible ? 'block' : 'none';
  if(state.settings.spotifyVisible && state.settings.spotifyUrl){
    const u = state.settings.spotifyUrl;
    // Accept both full and embed; normalize to /embed/...
    const embed = u.includes('/embed/') ? u : u.replace('open.spotify.com/','open.spotify.com/embed/');
    spotifyFrame.src = embed;
  }
}

// ---------- Persist ----------
function load(){
  try{
    const raw = localStorage.getItem('focusflow_v2');
    if(raw){
      const saved = JSON.parse(raw);
      Object.assign(state.settings, saved.settings||{});
      state.cyclesDone = saved.cyclesDone||0;
    }
  }catch{}
  // init UI
  themeSelect.value = state.settings.theme;
  notifToggle.checked = state.settings.notifyOnFinish;
  sequenceToggle.checked = state.settings.sequence;
  spotifyToggle.checked = state.settings.spotifyVisible;
  spotifyUrl.value = state.settings.spotifyUrl;

  pomodoroMin.value = state.settings.durations.pomodoro;
  shortMin.value    = state.settings.durations.short;
  longMin.value     = state.settings.durations.long;
  testSec.value     = state.settings.durations.testSec;

  soundSelect.value = state.settings.sound;
  soundToggle.checked = state.settings.soundOnFinish;
  volume.value = state.settings.volume;

  applyTheme();
  applySpotify();
  setMode('pomodoro');
}

function save(){
  // read UI back
  state.settings.theme            = themeSelect.value;
  state.settings.notifyOnFinish   = notifToggle.checked;
  state.settings.sequence         = sequenceToggle.checked;
  state.settings.spotifyVisible   = spotifyToggle.checked;
  state.settings.spotifyUrl       = spotifyUrl.value || state.settings.spotifyUrl;

  state.settings.durations.pomodoro = clampNum(pomodoroMin.value,1,600);
  state.settings.durations.short    = clampNum(shortMin.value,1,120);
  state.settings.durations.long     = clampNum(longMin.value,1,240);
  state.settings.durations.testSec  = clampNum(testSec.value,5,3600);

  state.settings.sound          = soundSelect.value;
  state.settings.soundOnFinish  = soundToggle.checked;
  state.settings.volume         = Number(volume.value);

  localStorage.setItem('focusflow_v2', JSON.stringify({
    settings: state.settings, cyclesDone: state.cyclesDone
  }));

  applyTheme(); applySpotify(); setMode(state.mode);
}

function clampNum(v,min,max){ v=Number(v); if(isNaN(v)) v=min; return Math.min(Math.max(v,min),max); }

// ---------- Events ----------
pills.forEach(p=>p.addEventListener('click',()=>{
  pills.forEach(x=>x.classList.remove('active'));
  p.classList.add('active');
  setMode(p.dataset.mode);
}));

startBtn.addEventListener('click', ()=> state.running ? stop() : start());
resetBtn.addEventListener('click', reset);

settingsBtn.addEventListener('click', ()=> modal.classList.add('show'));
document.getElementById('closeModal').addEventListener('click', ()=> modal.classList.remove('show'));
modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.classList.remove('show'); });

tabs.forEach(t=>t.addEventListener('click', ()=>{
  tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
  panes.forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-'+t.dataset.tab).classList.add('active');
}));

saveBtn.addEventListener('click', ()=>{ save(); modal.classList.remove('show'); });
resetAll.addEventListener('click', ()=>{
  localStorage.removeItem('focusflow_v2'); location.reload();
});

// Keyboard: space start/pause, r reset, Shift+T -> test
window.addEventListener('keydown', (e)=>{
  if(e.code==='Space'){ e.preventDefault(); state.running?stop():start(); }
  if(e.key.toLowerCase()==='r') reset();
  if(e.shiftKey && e.key.toLowerCase()==='t'){ state.secsLeft = Number(state.settings.durations.testSec); renderTimer(); }
});

// Notifications permission
if('Notification' in window && Notification.permission==='default'){
  Notification.requestPermission().catch(()=>{});
}

// ---------- Boot ----------
load();
lucide.createIcons();