const state = {
  mode: null,
  difficulty: null,
  matchType: 'classic', 
  isHardcore: false,      
  isGameOver: false,
  isFirstRound: true,
  deckMode: 'preset',     
  activeDeck: [],
  deck: [],
  hand: [],
  queue: [],
  elixir: 10,
  score: 0,
  streak: 0,
  highScore: 0,
  highScoreHc: 0,         
  phase: 'menu',
  lastPlayedCard: null,
  previousPlayedCard: null, // NEW: Tracks the card before the current one for Hardcore mode
  matchTime: 0,
  matchDuration: 180000,
  elixirRate: 2800,
  currentMultiplier: 1,
  elixirProgress: 0,
  nextPlayTime: 0,
  cyclePending: false,
  nextCycleTime: 0,
  cycleSlotIndex: -1,
  lastFrameTime: 0,
  animationFrameId: null,
  sequenceSelection: [],
  sequenceTarget: 0,
  customDeckNames: [],
  selectedPresetIndex: 0, 
  sortDirection: 'asc',
  playsThisRound: 0,
  targetPlays: 0,
  botTargetHold: 0
};

let flowElixir = 0;
let flowMultiplier = 1;
let flowLastTime = 0;
let flowAnimId = null;
let lastElixirFloor = 0;

const $ = id => document.getElementById(id);

// Main Navigation Setup
const navItems = document.querySelectorAll('.nav-item');
const tabScreens = document.querySelectorAll('.tab-screen');
const mainTabsContainer = $('mainTabsContainer');

// Full Screens
const createDeckScreen = $('createDeckScreen'),
      presetDeckScreen = $('presetDeckScreen'),
      gameScreen = $('gameScreen'),
      gameOverScreen = $('gameOverScreen'),
      difficultyModal = $('difficultyModal'),
      deckPreviewModal = $('deckPreviewModal');

const currentDeckLabel = $('currentDeckLabel');

// Initialization
try {
  state.highScore = parseInt(localStorage.getItem('crHighScore')) || 0;
  state.highScoreHc = parseInt(localStorage.getItem('crHighScoreHc')) || 0;
} catch(e) {}

if (state.highScore > 0) {
  $('hsValue').innerText = state.highScore;
  $('highScoreBanner').style.display = 'block';
}
if (state.highScoreHc > 0) {
  $('hsValueHc').innerText = state.highScoreHc;
  $('highScoreBannerHc').style.display = 'block';
}

const themeCheckbox = $('themeCheckbox'),
      htmlElement = document.documentElement;
      
try {
  const savedTheme = localStorage.getItem('crTheme') || 'dark';
  if (savedTheme === 'light') {
    htmlElement.classList.add('light-mode');
    themeCheckbox.checked = false;
  } else {
    htmlElement.classList.remove('light-mode');
    themeCheckbox.checked = true;
  }
} catch(e) {
  themeCheckbox.checked = true;
}

themeCheckbox.addEventListener('change', function() {
  if (this.checked) {
    htmlElement.classList.remove('light-mode');
    try { localStorage.setItem('crTheme', 'dark'); } catch(e) {}
  } else {
    htmlElement.classList.add('light-mode');
    try { localStorage.setItem('crTheme', 'light'); } catch(e) {}
  }
});

// Set default deck on load
function setDefaultDeck() {
  const defaultDeck = PRESET_DECKS[state.selectedPresetIndex];
  state.activeDeck = defaultDeck.cards.map(name => MASTER_DECK.find(c => c.name === name));
  updateDeckLabels(defaultDeck.name);
}
setDefaultDeck();

function updateDeckLabels(name) {
  currentDeckLabel.innerText = "Current: " + name;
}

// ==========================================
// BOTTOM NAVIGATION LOGIC
// ==========================================
function switchTab(tabId) {
  navItems.forEach(nav => nav.classList.remove('active'));
  tabScreens.forEach(tab => tab.classList.remove('active'));

  document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');

  if(tabId === 'elixir') {
     startFlowVisualizer();
  } else {
     if(flowAnimId) cancelAnimationFrame(flowAnimId);
  }
}

navItems.forEach(nav => {
  nav.addEventListener('click', () => switchTab(nav.getAttribute('data-tab')));
});
// ==========================================

// Deck Tab Buttons
$('btnCreateDeck').addEventListener('click', () => {
  state.customDeckNames = [];
  renderCustomDeckSlots();
  renderCardPool();
  mainTabsContainer.classList.remove('active');
  createDeckScreen.classList.add('active');
});

$('btnSelectPreset').addEventListener('click', () => {
  state.selectedPresetIndex = -1;
  renderPresetDecks('');
  mainTabsContainer.classList.remove('active');
  presetDeckScreen.classList.add('active');
});

$('btnRandomDeck').addEventListener('click', () => {
  state.deckMode = 'random';
  const randomIndex = Math.floor(Math.random() * PRESET_DECKS.length);
  state.activeDeck = PRESET_DECKS[randomIndex].cards.map(name => MASTER_DECK.find(c => c.name === name));
  updateDeckLabels("Random Deck");
  switchTab('match'); 
});

$('btnBackCreate').addEventListener('click', () => {
  createDeckScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
});

$('btnBackPreset').addEventListener('click', () => {
  presetDeckScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
});

// Match Type Toggles (Syncs both screens)
function setMatchType(type) {
  state.matchType = type;
  $('btnTypeClassic').classList.remove('active');
  $('btnTypeRanked').classList.remove('active');
  $('btnTypeClassicHc').classList.remove('active');
  $('btnTypeRankedHc').classList.remove('active');
  $('matchTypeToggle').classList.remove('ranked');
  $('hardcoreTypeToggle').classList.remove('ranked');

  if(type === 'classic') {
    $('btnTypeClassic').classList.add('active');
    $('btnTypeClassicHc').classList.add('active');
  } else {
    $('btnTypeRanked').classList.add('active');
    $('btnTypeRankedHc').classList.add('active');
    $('matchTypeToggle').classList.add('ranked');
    $('hardcoreTypeToggle').classList.add('ranked');
  }
}

$('btnTypeClassic').addEventListener('click', () => setMatchType('classic'));
$('btnTypeRanked').addEventListener('click', () => setMatchType('ranked'));
$('btnTypeClassicHc').addEventListener('click', () => setMatchType('classic'));
$('btnTypeRankedHc').addEventListener('click', () => setMatchType('ranked'));

// Elixir Flow Tab Logic
$('btnSpeed1').addEventListener('click', () => { setFlowSpeed(1); });
$('btnSpeed2').addEventListener('click', () => { setFlowSpeed(2); });
$('btnSpeed3').addEventListener('click', () => { setFlowSpeed(3); });

function setFlowSpeed(mult) {
  flowMultiplier = mult;
  $('btnSpeed1').classList.remove('active');
  $('btnSpeed2').classList.remove('active');
  $('btnSpeed3').classList.remove('active');
  $(`btnSpeed${mult}`).classList.add('active');
  $('speedToggle').className = `speed-toggle x${mult}`;
}

function startFlowVisualizer() {
  flowElixir = 0;
  lastElixirFloor = 0;
  setFlowSpeed(1);
  flowLastTime = performance.now();
  if(flowAnimId) cancelAnimationFrame(flowAnimId);
  flowAnimId = requestAnimationFrame(flowLoop);
}

function flowLoop(now) {
  let delta = now - flowLastTime;
  flowLastTime = now;
  
  let rate = 2800; 
  if (flowMultiplier === 2) rate = 1400;
  if (flowMultiplier === 3) rate = 933;
  
  let addedElixir = delta / rate;
  flowElixir += addedElixir;
  
  if (flowElixir >= 10.1) {
    flowElixir = 0; 
    lastElixirFloor = 0;
  } else {
    let currentFloor = Math.floor(flowElixir);
    if (currentFloor > lastElixirFloor && currentFloor <= 10) {
      if(typeof playElixirTick === 'function') playElixirTick();
      lastElixirFloor = currentFloor;
      $('flowElixirText').classList.add('pulse');
      setTimeout(() => $('flowElixirText').classList.remove('pulse'), 150);
    }
  }
  $('flowElixirText').innerText = Math.min(10, Math.floor(flowElixir));
  $('flowElixirFill').style.width = (Math.min(10, flowElixir) * 10) + '%';
  flowAnimId = requestAnimationFrame(flowLoop);
}

// Deck Building Logic
$('deckSearch').addEventListener('input', (e) => renderPresetDecks(e.target.value));
$('sortElixirBtn').addEventListener('click', () => {
  if (state.sortDirection === 'asc') {
    state.sortDirection = 'desc';
    $('sortIcon').innerText = '▼';
  } else {
    state.sortDirection = 'asc';
    $('sortIcon').innerText = '▲';
  }
  renderCardPool();
});

$('btnStartCustom').addEventListener('click', () => {
  state.deckMode = 'custom';
  state.activeDeck = state.customDeckNames.map(name => MASTER_DECK.find(c => c.name === name));
  updateDeckLabels("Custom Deck");
  createDeckScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
  switchTab('match');
});

deckPreviewModal.addEventListener('click', (e) => {
  if (e.target === deckPreviewModal) deckPreviewModal.classList.remove('active');
});

difficultyModal.addEventListener('click', (e) => {
  if (e.target === difficultyModal) difficultyModal.classList.remove('active');
});

$('btnStartPreview').addEventListener('click', () => {
  deckPreviewModal.classList.remove('active');
  state.deckMode = 'preset';
  const selectedDeck = PRESET_DECKS[state.selectedPresetIndex];
  state.activeDeck = selectedDeck.cards.map(name => MASTER_DECK.find(c => c.name === name));
  updateDeckLabels(selectedDeck.name);
  presetDeckScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
  switchTab('match');
});

function showPresetPreview(index) {
  state.selectedPresetIndex = index;
  const deck = PRESET_DECKS[index];
  $('previewDeckName').innerText = deck.name;
  $('previewCardsGrid').innerHTML = '';
  deck.cards.forEach(cardName => {
    const card = MASTER_DECK.find(c => c.name === cardName);
    if (card) {
      const img = document.createElement('img');
      img.src = card.img;
      $('previewCardsGrid').appendChild(img);
    }
  });
  deckPreviewModal.classList.add('active');
}

function renderCardPool() {
  $('cardPoolGrid').innerHTML = '';
  let pool = [...MASTER_DECK].sort((a, b) => state.sortDirection === 'asc' ? (a.cost - b.cost || a.name.localeCompare(b.name)) : (b.cost - a.cost || b.name.localeCompare(a.name)));
  pool.forEach(card => {
    const item = document.createElement('div');
    item.className = 'card-pool-item';
    if (state.customDeckNames.includes(card.name)) item.classList.add('selected');
    if (state.customDeckNames.length >= 8 && !state.customDeckNames.includes(card.name)) item.classList.add('disabled');
    item.innerHTML = `<img src="${card.img}">`;
    item.addEventListener('click', () => toggleCustomCard(card.name));
    $('cardPoolGrid').appendChild(item);
  });
}

function toggleCustomCard(cardName) {
  const index = state.customDeckNames.indexOf(cardName);
  if (index > -1) state.customDeckNames.splice(index, 1);
  else if (state.customDeckNames.length < 8) state.customDeckNames.push(cardName);
  renderCustomDeckSlots();
  renderCardPool();
}

function renderCustomDeckSlots() {
  $('customDeckSlots').innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.className = 'custom-slot';
    if (state.customDeckNames[i]) {
      const card = MASTER_DECK.find(c => c.name === state.customDeckNames[i]);
      slot.innerHTML = `<img src="${card.img}">`;
      slot.addEventListener('click', () => toggleCustomCard(card.name));
    } else {
      slot.innerHTML = `<div class="empty-custom-slot">+</div>`;
    }
    $('customDeckSlots').appendChild(slot);
  }
  $('btnStartCustom').style.display = state.customDeckNames.length === 8 ? 'block' : 'none';
}

function renderPresetDecks(searchTerm) {
  $('presetDeckList').innerHTML = '';
  const filtered = PRESET_DECKS.filter(deck => deck.name.toLowerCase().includes(searchTerm.toLowerCase()));
  filtered.forEach((deck, index) => {
    const item = document.createElement('div');
    item.className = 'preset-deck-item';
    let cardsHtml = '';
    deck.cards.forEach(cardName => {
      const card = MASTER_DECK.find(c => c.name === cardName);
      if (card) cardsHtml += `<img src="${card.img}">`;
    });
    item.innerHTML = `<div class="preset-info"><h3>${deck.name}</h3><div class="preset-cards">${cardsHtml}</div></div>`;
    item.addEventListener('click', () => showPresetPreview(index));
    $('presetDeckList').appendChild(item);
  });
}

// MATCH MODE LISTENERS
$('btnMatchElixir').addEventListener('click', () => openDifficultyModal('elixir', false));
$('btnMatchHand').addEventListener('click', () => openDifficultyModal('hand', false));
$('btnMatchCombined').addEventListener('click', () => openDifficultyModal('combined', false));

// HARDCORE MODE LISTENERS
$('btnHardcoreElixir').addEventListener('click', () => openDifficultyModal('elixir', true));
$('btnHardcoreHand').addEventListener('click', () => openDifficultyModal('hand', true));
$('btnHardcoreCombined').addEventListener('click', () => openDifficultyModal('combined', true));

$('btnEasy').addEventListener('click', () => selectDifficulty('easy'));
$('btnNormal').addEventListener('click', () => selectDifficulty('normal'));
$('btnHard').addEventListener('click', () => selectDifficulty('hard'));
$('btnElite').addEventListener('click', () => selectDifficulty('elite'));
$('btnEndless').addEventListener('click', () => selectDifficulty('endless'));

function openDifficultyModal(mode, isHardcore) {
  state.mode = mode;
  state.isHardcore = isHardcore;
  
  const isHand = (mode === 'hand'), isElixir = (mode === 'elixir');
  
  $('diffModalTitle').innerText = isHardcore ? "Hardcore Difficulty" : "Select Difficulty";
  $('diffModalTitle').style.color = "inherit"; 
  
  $('btnEasy').style.display = isHand ? 'block' : 'none';
  $('btnElite').style.display = isHand ? 'block' : 'none';
  $('btnEndless').style.display = isElixir ? 'block' : 'none';
  
  if (isHand) {
    $('normalDesc').innerHTML = "Predict 2 Cards Sequence";
    $('hardDesc').innerHTML = "Predict 3 Cards Sequence";
  } else {
    $('normalDesc').innerHTML = "3 Minutes (1x → 2x)";
    $('hardDesc').innerHTML = "4 Minutes (1x → 2x → 3x)";
  }
  difficultyModal.classList.add('active');
}

function selectDifficulty(diff) {
  state.difficulty = diff;
  difficultyModal.classList.remove('active');
  startGame();
}

function startGame() {
  if (state.deckMode === 'random') {
    const randomIndex = Math.floor(Math.random() * PRESET_DECKS.length);
    state.activeDeck = PRESET_DECKS[randomIndex].cards.map(name => MASTER_DECK.find(c => c.name === name));
  }
  state.deck = [...state.activeDeck].sort(() => Math.random() - 0.5);
  state.hand = state.deck.slice(0, 4);
  state.queue = state.deck.slice(4);
  state.elixir = 10;
  state.elixirProgress = 0;
  state.score = 0;
  state.streak = 0;
  state.lastPlayedCard = null;
  state.previousPlayedCard = null; // Resets for hardcore
  
  state.isGameOver = false;
  state.isFirstRound = true;
  state.playsThisRound = 0;
  
  if (state.mode === 'hand') {
    state.targetPlays = Math.floor(Math.random() * 5) + 4; 
  } else {
    state.targetPlays = Math.floor(Math.random() * 3) + 4; 
  }
  
  state.botTargetHold = Math.floor(Math.random() * 5) + 4;
  
  state.matchTime = 0;
  state.matchDuration = 180000;
  state.currentMultiplier = 1;
  state.elixirRate = 2800;
  state.phase = 'playing';
  
  // UI Setup for Normal vs Hardcore
  $('hcCurrentSlot').innerHTML = '';
  
  if(state.isHardcore) {
    $('modeTitle').innerText = "Hardcore: " + (state.mode === 'elixir' ? "Elixir" : (state.mode === 'hand' ? "Hand" : "Combined"));
    $('modeTitle').style.color = "var(--text-main)";
    $('focusText').innerText = "Blind Tracking Active";
    
    $('handSlotsWrapper').style.display = 'none';
    $('hcCurrentWrapper').style.display = 'block';
    $('lastPlayedLabelText').innerText = "PREVIOUS PLAYED";
  } else {
    $('modeTitle').innerText = state.mode === 'elixir' ? "Elixir Mode" : (state.mode === 'hand' ? "Hand Mode" : "Combined");
    $('modeTitle').style.color = "var(--text-main)";
    $('focusText').innerText = "Watch the cards leave the hand";
    
    $('handSlotsWrapper').style.display = 'block';
    $('hcCurrentWrapper').style.display = 'none';
    $('lastPlayedLabelText').innerText = "LAST PLAYED";
  }

  mainTabsContainer.classList.remove('active');
  gameOverScreen.classList.remove('active');
  gameScreen.classList.add('active');
  
  const elixirWrapper = $('elixirWrapper');
  if (state.mode === 'hand' || state.difficulty === 'endless') {
    elixirWrapper.innerHTML = state.mode === 'hand' ? '' : `<div class="elixir-hidden-placeholder">Elixir is Hidden! Opponent starts at 10. Track mentally.</div>`;
    state.matchDuration = Infinity;
    $('phaseDisplay').innerText = "∞";
    $('phaseDisplay').style.color = "var(--text-main)";
  } else {
    elixirWrapper.innerHTML = (state.mode === 'elixir' || state.mode === 'combined') ? `<div class="elixir-hidden-placeholder">Elixir is Hidden! Opponent starts at 10. Track mentally.</div>` : getElixirBarHTML();
    state.matchDuration = state.difficulty === 'hard' ? 240000 : 180000;
  }
  
  $('actionTitle').innerText = 'Watch the opponent play...';
  $('choicesGrid').innerHTML = '';
  $('choicesGrid').style.display = 'none';
  $('choicesGridSeq').innerHTML = '';
  $('choicesGridSeq').style.display = 'none';
  $('seqResults').innerHTML = '';
  $('seqResults').style.display = 'none';
  $('btnNext').style.display = 'none';
  $('btnNext').innerText = 'Continue';
  
  $('lastPlayedWrapper').classList.remove('active');
  $('lastPlayedCardContainer').innerHTML = '';
  
  initHandSlots();
  updateStatsUI();
  
  state.lastFrameTime = performance.now();
  state.nextPlayTime = performance.now() + 1500;
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

$('btnExit').addEventListener('click', () => {
  gameScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
});

$('btnPlayAgain').addEventListener('click', () => {
  gameOverScreen.classList.remove('active');
  startGame();
});

$('btnGoMenu').addEventListener('click', () => {
  gameOverScreen.classList.remove('active');
  mainTabsContainer.classList.add('active');
});

$('btnNext').addEventListener('click', continueGame);

function initHandSlots() {
  const handRow = $('handRow');
  handRow.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slotEl = document.createElement('div');
    slotEl.className = 'card-slot';
    slotEl.id = `slot-${i}`;
    handRow.appendChild(slotEl);
    if (i < state.hand.length && !state.isHardcore) addCardToSlot(i, state.hand[i], false);
  }
}

function addCardToSlot(slotIndex, card, animateEntering = true) {
  const slot = $(`slot-${slotIndex}`);
  if (!slot) return;
  slot.innerHTML = '';
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  if (animateEntering) cardEl.classList.add('entering');
  cardEl.innerHTML = `<img src="${card.img}" class="card-img">`;
  slot.appendChild(cardEl);
  if (animateEntering) {
    void cardEl.offsetWidth;
    setTimeout(() => { cardEl.classList.remove('entering'); }, 50);
  }
}

function gameLoop(now) {
  if (state.phase !== 'playing') return;
  let delta = now - state.lastFrameTime;
  state.lastFrameTime = now;
  
  if (state.mode !== 'hand') {
    state.matchTime += delta;
    if (state.difficulty !== 'endless') {
      let prevMultiplier = state.currentMultiplier;
      if (state.matchTime >= 180000 && state.difficulty === 'hard') {
        state.currentMultiplier = 3;
        state.elixirRate = 933;
      } else if (state.matchTime >= 120000) {
        state.currentMultiplier = 2;
        state.elixirRate = 1400;
      } else {
        state.currentMultiplier = 1;
        state.elixirRate = 2800;
      }
      if (prevMultiplier !== state.currentMultiplier) showTransition(state.currentMultiplier);
    }
    
    if (state.elixir < 10) {
      state.elixirProgress += delta;
      while (state.elixirProgress >= state.elixirRate && state.elixir < 10) {
        state.elixirProgress -= state.elixirRate;
        state.elixir++;
      }
      if (state.elixir === 10) state.elixirProgress = 0;
    } else {
      state.elixirProgress = 0;
    }
    if ($('elixirCount')) updateElixirUI();
  }
  
  if (state.cyclePending && now >= state.nextCycleTime) {
    if (state.queue.length > 0 && state.hand.length < 4) {
      let newCard = state.queue.shift();
      state.hand.splice(state.cycleSlotIndex, 0, newCard);
      // Normal mode visually replaces the slot when the cycle hits
      if (!state.isHardcore) {
        addCardToSlot(state.cycleSlotIndex, newCard, true);
      }
    }
    state.cyclePending = false;
  }
  
  if (!state.cyclePending && now >= state.nextPlayTime) playOpponentCard(now);
  
  updateStatsUI();
  if (state.matchTime >= state.matchDuration) {
    endGame();
    return;
  }
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

function playOpponentCard(now) {
  if (state.hand.length === 0) {
    state.nextPlayTime = now + 1000;
    return;
  }
  
  let canPlay = false;
  let affordable = [];
  let picked = null;
  
  if (state.mode === 'hand') {
    affordable = state.hand.map((c, i) => ({c, i}));
    canPlay = true; 
    picked = affordable[Math.floor(Math.random() * affordable.length)];
  } else {
    affordable = state.hand.map((c, i) => ({c, i})).filter(x => x.c.cost <= state.elixir);
    
    if (affordable.length > 0) {
      let cycleCards = affordable.filter(x => x.c.cost <= 2);
      
      if (state.elixir >= 9.5) {
        canPlay = true;
        picked = affordable[Math.floor(Math.random() * affordable.length)];
      } 
      else if (state.elixir >= state.botTargetHold) {
        canPlay = true;
        picked = affordable[Math.floor(Math.random() * affordable.length)];
      } 
      else if (cycleCards.length > 0 && Math.random() < 0.35 && state.elixir >= cycleCards[0].c.cost + 1) {
        canPlay = true;
        picked = cycleCards[Math.floor(Math.random() * cycleCards.length)];
      }
    } else {
      state.botTargetHold = Math.floor(Math.random() * 5) + 5; 
    }
  }
  
  if (canPlay && picked) {
    let playIdx = picked.i;
    let playedCard = picked.c;
    
    if (state.mode !== 'hand') state.elixir -= playedCard.cost;
    
    if (state.isHardcore) {
      // 1. Move currently viewed card to "Previous" block
      if (state.lastPlayedCard) {
        state.previousPlayedCard = state.lastPlayedCard;
        const lpContainer = $('lastPlayedCardContainer');
        lpContainer.innerHTML = '';
        setTimeout(() => {
            lpContainer.innerHTML = `<img src="${state.previousPlayedCard.img}" class="last-played-card">`;
            $('lastPlayedWrapper').classList.add('active');
        }, 10);
      }
      
      state.lastPlayedCard = playedCard;
      
      // 2. Animate out the old card in the main view
      const hcSlot = $('hcCurrentSlot');
      Array.from(hcSlot.children).forEach(child => {
          child.classList.add('played');
          setTimeout(() => child.remove(), 500);
      });
      
      // 3. Animate in the newly played card
      const cardEl = document.createElement('div');
      cardEl.className = 'card entering';
      cardEl.innerHTML = `<img src="${playedCard.img}" class="card-img">`;
      hcSlot.appendChild(cardEl);
      
      void cardEl.offsetWidth; 
      setTimeout(() => cardEl.classList.remove('entering'), 50);

    } else {
      // Normal Mode
      state.lastPlayedCard = playedCard;
      const lpContainer = $('lastPlayedCardContainer');
      lpContainer.innerHTML = '';
      setTimeout(() => {
          lpContainer.innerHTML = `<img src="${playedCard.img}" class="last-played-card">`;
          $('lastPlayedWrapper').classList.add('active');
      }, 10);
      
      const slot = $(`slot-${playIdx}`);
      if (slot && slot.firstChild) slot.firstChild.classList.add('played');
    }
    
    state.hand.splice(playIdx, 1);
    state.queue.push(playedCard);
    state.cyclePending = true;
    state.nextCycleTime = now + 350;
    state.cycleSlotIndex = playIdx;
    
    state.playsThisRound++;
    
    if (state.playsThisRound >= state.targetPlays) {
      state.nextPlayTime = Infinity; 
      setTimeout(() => {
        if (state.phase === 'playing') {
          state.phase = 'question';
          triggerQuestion();
        }
      }, 800 + Math.random() * 600);
      return;
    }
    
    if (state.mode === 'hand') {
      state.nextPlayTime = now + 1800 + Math.random() * 1500;
    } else {
      if (picked.c.cost <= 2 && state.elixir < 5) {
        state.nextPlayTime = now + 1800 + Math.random() * 1000;
      } 
      else if (Math.random() < 0.40 && state.elixir >= 3) {
        state.botTargetHold = 0; 
        state.nextPlayTime = now + 1200 + Math.random() * 600; 
      } 
      else {
        state.botTargetHold = Math.floor(Math.random() * 6) + 4; 
        state.nextPlayTime = now + 2000 + Math.random() * 1500;
      }
    }
  } else {
    state.nextPlayTime = now + 300;
  }
}

function showTransition(mult) {
  $('transitionText').innerText = mult === 2 ? "DOUBLE ELIXIR" : "TRIPLE ELIXIR";
  $('transitionOverlay').style.opacity = '1';
  setTimeout(() => { $('transitionOverlay').style.opacity = '0'; }, 1500);
}

function getElixirBarHTML() {
  return `
  <div class="elixir-wrapper" id="elixirContainer">
    <div class="elixir-info-row">
      <div class="elixir-drop-container">
        <svg class="elixir-drop-svg" viewBox="0 0 24 32">
          <path d="M12 0 C12 0 2 12 2 20 C2 26.6 6.5 32 12 32 C17.5 32 22 26.6 22 20 C22 12 12 0 12 0 Z" fill="url(#dropGrad)"/>
          <defs>
            <linearGradient id="dropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#d946ef"/>
              <stop offset="100%" stop-color="#7e22ce"/>
            </linearGradient>
          </defs>
        </svg>
        <span id="elixirCount" class="elixir-count-text">10</span>
      </div>
      <span class="elixir-max-text">Max: 10</span>
    </div>
    <div class="elixir-bar-bg">
      <div class="elixir-bar-fill" id="elixirFill" style="width: 100%;"></div>
      <div class="elixir-drops">
        <div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div>
        <div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div><div class="drop"></div>
      </div>
    </div>
  </div>`;
}

function updateElixirUI() {
  const elixirCountEl = $('elixirCount');
  if (!elixirCountEl) return;
  elixirCountEl.innerText = state.elixir;
  let progressPercent = (state.elixirProgress / state.elixirRate) * 10;
  let totalWidth = (state.elixir * 10) + (state.elixir < 10 ? progressPercent : 0);
  $('elixirFill').style.width = totalWidth + '%';
}

function updateStatsUI() {
  $('scoreDisplay').innerText = state.score;
  $('streakDisplay').innerText = '🔥 ' + state.streak;
  const phaseDisplay = $('phaseDisplay');
  if (state.mode === 'hand' || state.difficulty === 'endless') {
    phaseDisplay.innerText = "∞";
    phaseDisplay.style.color = "var(--text-main)";
    return;
  }
  let timeLeft, isOvertime = false;
  if (state.difficulty === 'hard') {
    if (state.matchTime < 180000) timeLeft = 180000 - state.matchTime;
    else {
      timeLeft = 240000 - state.matchTime;
      isOvertime = true;
    }
  } else {
    timeLeft = 180000 - state.matchTime;
  }
  if (timeLeft < 0) timeLeft = 0;
  let mins = Math.floor(timeLeft / 60000);
  let secs = Math.floor((timeLeft % 60000) / 1000);
  phaseDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  phaseDisplay.style.color = isOvertime ? "var(--error)" : "var(--text-main)";
}

function revealElixirBar() {
  $('elixirWrapper').innerHTML = getElixirBarHTML();
  updateElixirUI();
}

function triggerQuestion() {
  $('choicesGrid').innerHTML = '';
  $('choicesGrid').style.display = 'none';
  $('choicesGridSeq').innerHTML = '';
  $('choicesGridSeq').style.display = 'none';
  $('seqResults').innerHTML = '';
  $('seqResults').style.display = 'none';
  $('btnNext').style.display = 'none';
  
  let questionType = state.mode;
  if (state.mode === 'combined') {
    let rand = Math.random();
    if (rand < 0.33) questionType = 'elixir';
    else if (rand < 0.66) questionType = 'just_played';
    else questionType = 'next_cycle';
  }
  if (state.mode === 'hand') questionType = 'sequence';
  if (questionType === 'just_played' && !state.lastPlayedCard) questionType = 'next_cycle';
  if (questionType === 'next_cycle' && state.queue.length === 0) questionType = 'just_played';
  if (questionType === 'just_played' && !state.lastPlayedCard) questionType = 'elixir';
  
  if (questionType === 'elixir') {
    $('actionTitle').innerText = "How much elixir does the opponent have RIGHT NOW?";
    $('choicesGrid').style.display = 'grid';
    
    let exactElixir = state.elixir + (state.elixirProgress / state.elixirRate);
    let floorVal = Math.floor(exactElixir), ceilVal = Math.ceil(exactElixir), fraction = exactElixir - floorVal;
    
    let correctAnswers = new Set();
    if (Math.abs(fraction - 0.5) < 0.05) {
      correctAnswers.add(floorVal);
      correctAnswers.add(ceilVal);
    } else if (fraction < 0.5) {
      correctAnswers.add(floorVal);
    } else {
      correctAnswers.add(ceilVal);
    }
    
    let options = new Set(correctAnswers);
    while (options.size < 4) options.add(Math.floor(Math.random() * 11));
    
    Array.from(options).sort(() => Math.random() - 0.5).forEach(opt => {
      let btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerText = opt;
      btn.setAttribute('data-value', opt);
      btn.onclick = function() { handleAnswer(opt, correctAnswers, btn); };
      $('choicesGrid').appendChild(btn);
    });
    
  } else if (questionType === 'just_played') {
    $('actionTitle').innerText = "Which card did the opponent JUST PLAY?";
    $('choicesGrid').style.display = 'grid';
    let correctCard = state.lastPlayedCard;
    let correctAnswers = new Set([correctCard.name]);
    let options = new Set([correctCard]);
    while (options.size < 4) {
      let fakeCard = state.deck[Math.floor(Math.random() * state.deck.length)];
      options.add(fakeCard);
    }
    Array.from(options).sort(() => Math.random() - 0.5).forEach(opt => {
      let btn = document.createElement('button');
      btn.className = 'choice-btn-img';
      btn.innerHTML = `<img src="${opt.img}" alt="${opt.name}">`;
      btn.setAttribute('data-value', opt.name);
      btn.onclick = function() { handleAnswer(opt.name, correctAnswers, btn); };
      $('choicesGrid').appendChild(btn);
    });
    
  } else if (questionType === 'next_cycle') {
    $('actionTitle').innerText = "Which card is NEXT in the opponent's cycle?";
    $('choicesGrid').style.display = 'grid';
    let correctCard = state.queue[0];
    let correctAnswers = new Set([correctCard.name]);
    let options = new Set([correctCard]);
    while (options.size < 4) {
      let fakeCard = state.deck[Math.floor(Math.random() * state.deck.length)];
      options.add(fakeCard);
    }
    Array.from(options).sort(() => Math.random() - 0.5).forEach(opt => {
      let btn = document.createElement('button');
      btn.className = 'choice-btn-img';
      btn.innerHTML = `<img src="${opt.img}" alt="${opt.name}">`;
      btn.setAttribute('data-value', opt.name);
      btn.onclick = function() { handleAnswer(opt.name, correctAnswers, btn); };
      $('choicesGrid').appendChild(btn);
    });
    
  } else if (questionType === 'sequence') {
    let count = 1;
    if (state.difficulty === 'normal') count = 2;
    else if (state.difficulty === 'hard') count = 3;
    else if (state.difficulty === 'elite') count = 4;
    
    if (state.queue.length < count) count = state.queue.length;
    state.sequenceTarget = count;
    state.sequenceSelection = [];
    
    $('actionTitle').innerText = `Select the next ${count} card${count > 1 ? 's' : ''} in order:`;
    $('choicesGridSeq').style.display = 'grid';
    let shuffledQueue = [...state.queue].sort(() => Math.random() - 0.5);
    shuffledQueue.forEach(opt => {
      let btn = document.createElement('button');
      btn.className = 'choice-btn-seq';
      btn.innerHTML = `<img src="${opt.img}" alt="${opt.name}">`;
      btn.setAttribute('data-value', opt.name);
      btn.onclick = function() { toggleSequenceSelection(opt.name, btn); };
      $('choicesGridSeq').appendChild(btn);
    });
  }
}

function toggleSequenceSelection(cardName, btn) {
  if ($('btnNext').style.display === 'block') return;
  let idx = state.sequenceSelection.indexOf(cardName);
  if (idx > -1) {
    state.sequenceSelection.splice(idx, 1);
    btn.classList.remove('selected');
    let badge = btn.querySelector('.seq-badge');
    if (badge) badge.remove();
  } else {
    if (state.sequenceSelection.length < state.sequenceTarget) {
      state.sequenceSelection.push(cardName);
      btn.classList.add('selected');
      let badge = document.createElement('div');
      badge.className = 'seq-badge';
      badge.innerText = state.sequenceSelection.length;
      btn.appendChild(badge);
    }
  }
  document.querySelectorAll('.choice-btn-seq').forEach(b => {
    let name = b.getAttribute('data-value');
    let pos = state.sequenceSelection.indexOf(name);
    let badge = b.querySelector('.seq-badge');
    if (pos > -1) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'seq-badge';
        b.appendChild(badge);
      }
      badge.innerText = pos + 1;
    } else {
      if (badge) badge.remove();
    }
  });
  if (state.sequenceSelection.length === state.sequenceTarget) submitSequenceAnswer();
}

function submitSequenceAnswer() {
  let correctSequence = state.queue.slice(0, state.sequenceTarget);
  let userSequence = state.sequenceSelection.map(name => state.deck.find(c => c.name === name));
  let isCorrect = true;
  for (let i = 0; i < state.sequenceTarget; i++) {
    if (userSequence[i].name !== correctSequence[i].name) {
      isCorrect = false;
      break;
    }
  }
  $('choicesGridSeq').style.display = 'none';
  let html = `<div class="seq-result-row correct"><div class="seq-result-cards">`;
  correctSequence.forEach((card, index) => {
    html += `<div class="seq-result-card"><img src="${card.img}"></div>`;
    if (index < correctSequence.length - 1) html += `<span class="seq-arrow">→</span>`;
  });
  html += `</div></div>`;
  
  if (!isCorrect) {
    html += `<div class="seq-result-row wrong"><div class="seq-result-cards">`;
    userSequence.forEach((card, index) => {
      html += `<div class="seq-result-card"><img src="${card.img}"></div>`;
      if (index < userSequence.length - 1) html += `<span class="seq-arrow">→</span>`;
    });
    html += `</div></div>`;
  }
  
  $('seqResults').innerHTML = html;
  $('seqResults').style.display = 'block';
  
  if (isCorrect) {
    state.score += 10 + (state.streak * 2);
    state.streak++;
    $('actionTitle').innerText = 'Perfect! You got the order right.';
    $('btnNext').innerText = 'Continue';
    $('btnNext').style.display = 'block';
  } else {
    state.streak = 0;
    if (state.matchType === 'ranked') {
      state.isGameOver = true;
      $('actionTitle').innerHTML = '<span style="color:var(--error);">Wrong order! Sudden Death.</span>';
      setTimeout(endGame, 1200);
    } else {
      $('actionTitle').innerText = 'Wrong order! Check the comparison below.';
      $('btnNext').innerText = 'Continue';
      $('btnNext').style.display = 'block';
    }
  }
  
  if (state.mode === 'combined') revealElixirBar();
  updateStatsUI();
}

function handleAnswer(selected, correctAnswers, btn) {
  const buttons = document.querySelectorAll('.choice-btn, .choice-btn-img');
  buttons.forEach(b => b.style.pointerEvents = 'none');
  
  let isCorrect = correctAnswers.has(selected);
  
  if (isCorrect) {
    btn.classList.add('correct');
    state.score += 10 + (state.streak * 2);
    state.streak++;
    $('actionTitle').innerText = 'Correct!';
    $('btnNext').innerText = 'Continue';
    $('btnNext').style.display = 'block';
  } else {
    btn.classList.add('wrong');
    state.streak = 0;
    buttons.forEach(b => {
      let val = isNaN(Number(b.getAttribute('data-value'))) ? b.getAttribute('data-value') : Number(b.getAttribute('data-value'));
      if (correctAnswers.has(val)) b.classList.add('correct');
    });
    
    if (state.matchType === 'ranked') {
      state.isGameOver = true;
      $('actionTitle').innerHTML = '<span style="color:var(--error);">Wrong! Sudden Death.</span>';
      setTimeout(endGame, 1200); 
    } else {
      $('actionTitle').innerText = 'Wrong! Correct answer highlighted.';
      $('btnNext').innerText = 'Continue';
      $('btnNext').style.display = 'block';
    }
  }
  
  if (state.mode === 'elixir' || state.mode === 'combined') revealElixirBar();
  updateStatsUI();
}

function continueGame() {
  if (state.isGameOver) {
    endGame();
    return;
  }

  if (state.mode === 'elixir' || state.mode === 'combined') {
    $('elixirWrapper').innerHTML = `<div class="elixir-hidden-placeholder">Elixir is Hidden! Opponent starts at 10. Track mentally.</div>`;
  }
  
  $('choicesGrid').style.display = 'none';
  $('choicesGridSeq').style.display = 'none';
  $('seqResults').style.display = 'none';
  $('btnNext').style.display = 'none';
  $('actionTitle').innerText = 'Watch the opponent play...';
  
  $('lastPlayedWrapper').classList.remove('active');
  $('lastPlayedCardContainer').innerHTML = '';
  $('hcCurrentSlot').innerHTML = '';
  state.previousPlayedCard = null;
  state.lastPlayedCard = null;

  state.isFirstRound = false;
  state.playsThisRound = 0;
  
  if (state.mode === 'hand') {
    state.targetPlays = Math.floor(Math.random() * 7) + 2; 
  } else {
    state.targetPlays = Math.floor(Math.random() * 3) + 4; 
  }
  
  state.botTargetHold = Math.floor(Math.random() * 5) + 4;
  
  state.phase = 'playing';
  state.lastFrameTime = performance.now();
  state.nextPlayTime = performance.now() + 1000;
  state.animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
  state.phase = 'gameover';
  cancelAnimationFrame(state.animationFrameId);
  
  if (state.isHardcore) {
    $('goTitleText').innerText = "HARDCORE OVER";
    $('goTitleText').style.color = "var(--text-main)";
    if (state.score > state.highScoreHc) {
      state.highScoreHc = state.score;
      try { localStorage.setItem('crHighScoreHc', state.score); } catch(e) {}
    }
  } else {
    $('goTitleText').innerText = "MATCH OVER";
    $('goTitleText').style.color = "var(--text-main)";
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try { localStorage.setItem('crHighScore', state.score); } catch(e) {}
    }
  }
  
  $('goScore').innerText = state.score;
  gameScreen.classList.remove('active');
  gameOverScreen.classList.add('active');
}
