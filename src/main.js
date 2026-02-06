import init, { validate_move, ai_move } from '../pkg/wythoff_wasm.js';
import { Peer } from 'peerjs';

// Game Constants
const MODES = {
    MENU: 'menu',
    VS_COMPUTER: 'vs_computer',
    MULTIPLAYER: 'multiplayer'
};

// State Management
let pileA = 20;
let pileB = 25;
let myTurn = true;
let gameMode = MODES.MENU;
let isHost = false;
let peer = null;
let conn = null;
let pendingMove = null; // For ACK protocol

// DOM Elements
const menuOverlay = document.getElementById('menu-overlay');
const gameContainer = document.getElementById('game-container');
const toast = document.getElementById('status-toast');
const pileATokens = document.getElementById('pile-a-tokens');
const pileBTokens = document.getElementById('pile-b-tokens');
const pileACount = document.getElementById('pile-a-count');
const pileBCount = document.getElementById('pile-b-count');
const gameStatus = document.getElementById('game-status');
const modeIndicator = document.getElementById('mode-indicator');
const amountInput = document.getElementById('token-amount');
const amountDisplay = document.getElementById('amount-display');
const moveTypeSelect = document.getElementById('move-type');
const targetPileSelect = document.getElementById('target-pile');
const targetPileGroup = document.getElementById('target-pile-group');
const confirmBtn = document.getElementById('confirm-move');
const aiBtn = document.getElementById('ai-move-btn');
const resetBtn = document.getElementById('reset-game');
const myIdDisplay = document.getElementById('my-id');
const remoteIdInput = document.getElementById('remote-id');
const connectBtn = document.getElementById('connect-btn');
const shareLinkBtn = document.getElementById('share-link-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const mpSection = document.getElementById('multiplayer');

// Initialization
async function run() {
    await init();
    setupEventListeners();
    handleInitialState();
    updateUI();
}

function setupEventListeners() {
    document.getElementById('vs-computer-btn').addEventListener('click', () => {
        randomizePiles();
        startGame(MODES.VS_COMPUTER);
    });
    document.getElementById('multiplayer-menu-btn').addEventListener('click', () => {
        randomizePiles();
        startGame(MODES.MULTIPLAYER);
    });

    amountInput.addEventListener('input', (e) => amountDisplay.textContent = e.target.value);
    moveTypeSelect.addEventListener('change', () => {
        targetPileGroup.classList.toggle('hidden', moveTypeSelect.value === 'both');
        updateMaxAmount();
    });
    targetPileSelect.addEventListener('change', updateMaxAmount);

    confirmBtn.addEventListener('click', handleMove);
    aiBtn.addEventListener('click', handleAiMove);
    resetBtn.addEventListener('click', resetGame);
    backToMenuBtn.addEventListener('click', exitToMenu);

    connectBtn.addEventListener('click', () => {
        const id = remoteIdInput.value.trim();
        if (id) connectToPeer(id);
    });

    shareLinkBtn.addEventListener('click', () => {
        const url = `${window.location.origin}${window.location.pathname}#state=${pileA}-${pileB}&mode=${gameMode}`;
        navigator.clipboard.writeText(url).then(() => showToast('Challenge link copied!'));
    });
}

function handleInitialState() {
    const hash = window.location.hash;
    if (hash.includes('state=')) {
        const params = new URLSearchParams(hash.substring(1));
        const state = params.get('state');
        const mode = params.get('mode') || MODES.VS_COMPUTER;

        if (state) {
            const parts = state.split('-');
            pileA = parseInt(parts[0]) || 20;
            pileB = parseInt(parts[1]) || 25;
            startGame(mode, true);
            return;
        }
    }
    exitToMenu();
}

function startGame(mode, skipRandomize = false) {
    gameMode = mode;
    menuOverlay.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    if (mode === MODES.MULTIPLAYER) {
        setupPeer();
        isHost = !skipRandomize;
        mpSection.classList.remove('hidden');
        aiBtn.classList.add('hidden');
        modeIndicator.textContent = "Multiplayer Mode";
    } else {
        mpSection.classList.add('hidden');
        aiBtn.classList.remove('hidden');
        modeIndicator.textContent = "Vs Computer";
    }

    updateUI();
}

function exitToMenu() {
    gameMode = MODES.MENU;
    window.location.hash = '';
    menuOverlay.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    if (conn) conn.close();
    if (peer) peer.destroy();
    peer = null;
    conn = null;
    pendingMove = null;
}

function randomizePiles() {
    pileA = Math.floor(Math.random() * 18) + 12;
    pileB = Math.floor(Math.random() * 18) + 12;
    if (Math.abs(pileA - pileB) < 2) pileB += 5;
    myTurn = true;
}

function handleMove() {
    if (!myTurn || pendingMove) return;
    
    const amount = parseInt(amountInput.value);
    const type = moveTypeSelect.value;
    let nextA = pileA;
    let nextB = pileB;
    
    if (type === 'one') {
        if (targetPileSelect.value === 'a') nextA -= amount;
        else nextB -= amount;
    } else {
        nextA -= amount;
        nextB -= amount;
    }
    
    if (validate_move(pileA, pileB, nextA, nextB)) {
        const oldA = pileA;
        const oldB = pileB;
        pileA = nextA;
        pileB = nextB;
        
        if (gameMode === MODES.MULTIPLAYER) {
            // Multiplayer Handshake: Enter pending state
            pendingMove = { pileA, pileB };
            myTurn = false;
            updateUI();
            sendState('move', pileA, pileB);
            showToast('Syncing with opponent...');
        } else {
            // Single Player: Immediate update
            myTurn = false;
            updateUI();
            updateUrl();
            if (pileA > 0 || pileB > 0) {
                setTimeout(handleAiMove, 600); // Faster AI for Strategists
            }
        }
    } else {
        showToast('Invalid Move!');
    }
}

function handleAiMove() {
    if (gameMode !== MODES.VS_COMPUTER) return;
    const result = ai_move(pileA, pileB);
    pileA = result[0];
    pileB = result[1];
    myTurn = true;
    updateUI();
    updateUrl();
    showToast('AI played');
}

function updateUI() {
    renderTokens(pileATokens, pileA);
    renderTokens(pileBTokens, pileB);
    pileACount.textContent = `${pileA} tokens`;
    pileBCount.textContent = `${pileB} tokens`;
    
    updateMaxAmount();
    
    const appContainer = document.getElementById('app');
    const controls = document.querySelectorAll('#controls input, #controls select, #confirm-move');
    
    if (myTurn && !pendingMove) {
        appContainer.classList.add('my-turn');
        controls.forEach(c => c.disabled = false);
        gameStatus.textContent = "Your Turn";
    } else {
        appContainer.classList.remove('my-turn');
        controls.forEach(c => c.disabled = true);
        gameStatus.textContent = pendingMove ? "Syncing..." : "Opponent's Turn...";
    }

    if (pileA === 0 && pileB === 0) {
        gameStatus.textContent = myTurn ? "Game Over! You lost." : "Victory! You won!";
        confirmBtn.disabled = true;
    }
}

function renderTokens(container, count) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < Math.min(count, 100); i++) {
        const token = document.createElement('div');
        token.className = 'token';
        fragment.appendChild(token);
    }
    container.appendChild(fragment);
}

function updateMaxAmount() {
    const type = moveTypeSelect.value;
    let max = 1;
    if (type === 'one') {
        max = targetPileSelect.value === 'a' ? pileA : pileB;
    } else {
        max = Math.min(pileA, pileB);
    }
    // Dynamic Hardening: Physically limit the range input
    amountInput.max = Math.max(1, max);
    if (parseInt(amountInput.value) > max) {
        amountInput.value = max;
        amountDisplay.textContent = max;
    }
}

// Multiplayer Logic
function setupPeer() {
    if (peer) return;
    peer = new Peer();
    peer.on('open', (id) => {
        myIdDisplay.textContent = id;
    });
    
    peer.on('connection', (c) => {
        conn = c;
        setupConnection();
        isHost = true;
        showToast('Opponent Connected!');
        sendState('sync', pileA, pileB);
    });
}

function connectToPeer(id) {
    conn = peer.connect(id);
    isHost = false;
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        showToast('Connection Established!');
    });
    
    conn.on('data', (data) => {
        if (data.type === 'move') {
            pileA = data.pileA;
            pileB = data.pileB;
            myTurn = true;
            updateUI();
            updateUrl();
            sendState('ack'); // Respond with Acknowledgement
            showToast('Opponent moved!');
        } else if (data.type === 'ack') {
            pendingMove = null;
            updateUI();
            updateUrl();
        } else if (data.type === 'sync') {
            pileA = data.pileA;
            pileB = data.pileB;
            myTurn = !isHost; 
            updateUI();
            updateUrl();
        }
    });

    conn.on('close', () => {
        showToast('Opponent Disconnected');
        myTurn = false;
        updateUI();
    });
}

function sendState(type, a = pileA, b = pileB) {
    if (conn && conn.open) {
        conn.send({ type, pileA: a, pileB: b });
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

function resetGame() {
    randomizePiles();
    updateUI();
    updateUrl();
    if (gameMode === MODES.MULTIPLAYER) sendState('sync', pileA, pileB);
    showToast('Game Reset');
}

function updateUrl() {
    if (gameMode === MODES.MENU) return;
    const state = `state=${pileA}-${pileB}&mode=${gameMode}`;
    window.history.replaceState(null, '', `#${state}`);
}

run();