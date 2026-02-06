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
let pendingMove = null;
let heartbeatInterval = null;
let idleTimer = null;

// DOM Elements
const menuOverlay = document.getElementById('menu-overlay');
const reconnectOverlay = document.getElementById('reconnect-overlay');
const gameContainer = document.getElementById('game-container');
const toast = document.getElementById('status-toast');
const pileATokens = document.getElementById('pile-a-tokens');
const pileBTokens = document.getElementById('pile-b-tokens');
const pileACount = document.getElementById('pile-a-count');
const pileBCount = document.getElementById('pile-b-count');
const gameStatus = document.getElementById('game-status');
const interactionStatus = document.getElementById('interaction-status');
const ghostHand = document.getElementById('ghost-hand');
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
const forceQuitBtn = document.getElementById('force-quit-btn');
const mpSection = document.getElementById('multiplayer');

// Initialization
async function run() {
    await init();
    setupEventListeners();
    handleInitialState();
    updateUI();
    startIdleTimer();
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

    amountInput.addEventListener('input', (e) => {
        amountDisplay.textContent = e.target.value;
        broadcastInteraction('slider', e.target.value);
        resetIdleTimer();
    });

    moveTypeSelect.addEventListener('change', () => {
        targetPileGroup.classList.toggle('hidden', moveTypeSelect.value === 'both');
        updateMaxAmount();
        broadcastInteraction('type', moveTypeSelect.value);
    });

    targetPileSelect.addEventListener('change', () => {
        updateMaxAmount();
        broadcastInteraction('target', targetPileSelect.value);
    });

    confirmBtn.addEventListener('click', handleMove);
    aiBtn.addEventListener('click', handleAiMove);
    resetBtn.addEventListener('click', resetGame);
    backToMenuBtn.addEventListener('click', exitToMenu);
    forceQuitBtn.addEventListener('click', exitToMenu);

    connectBtn.addEventListener('click', () => {
        const id = remoteIdInput.value.trim();
        if (id) connectToPeer(id);
    });

    shareLinkBtn.addEventListener('click', handleInviteFriend);

    // Global interaction monitoring
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('touchstart', resetIdleTimer);
}

// User Friendliness: Native Share & Deep Link
async function handleInviteFriend() {
    const url = `${window.location.origin}${window.location.pathname}#state=${pileA}-${pileB}&mode=${gameMode}&join=${peer.id}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: "Wythoff's Game Challenge",
                text: "I'm challenging you to a game! Click the link to join me instantly.",
                url: url
            });
        } catch (err) {
            copyToClipboard(url);
        }
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(url) {
    navigator.clipboard.writeText(url).then(() => showToast('Invite link copied!'));
}

function handleInitialState() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const state = params.get('state');
    const mode = params.get('mode') || MODES.VS_COMPUTER;
    const joinId = params.get('join');

    if (state) {
        const parts = state.split('-');
        pileA = parseInt(parts[0]) || 20;
        pileB = parseInt(parts[1]) || 25;
        
        if (joinId) {
            // Auto-join if ID is in link
            startGame(MODES.MULTIPLAYER, true);
            setTimeout(() => connectToPeer(joinId), 1000);
        } else {
            startGame(mode, true);
        }
        return;
    }
    exitToMenu();
}

// User Friendliness: Ghost Hand Tutorial
function startIdleTimer() {
    idleTimer = setTimeout(() => {
        if (myTurn && gameMode !== MODES.MENU && pileA > 0 && pileB > 0) {
            showGhostHand();
        }
    }, 8000); // 8 seconds of inactivity
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    ghostHand.classList.add('hidden');
    startIdleTimer();
}

function showGhostHand() {
    const target = document.getElementById('pile-a-container');
    const rect = target.getBoundingClientRect();
    ghostHand.style.left = `${rect.left + rect.width / 2}px`;
    ghostHand.style.top = `${rect.top + rect.height / 2}px`;
    ghostHand.classList.remove('hidden');
}

// Presence & Interaction Cues
function broadcastInteraction(type, value) {
    if (gameMode === MODES.MULTIPLAYER && conn && conn.open) {
        conn.send({ type: 'presence', subType: type, value: value });
    }
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
    reconnectOverlay.classList.add('hidden');
    if (conn) conn.close();
    if (peer) peer.destroy();
    clearInterval(heartbeatInterval);
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
        const target = targetPileSelect.value;
        if (target === 'a') nextA -= amount;
        else nextB -= amount;
        showFloatingText(amount, target === 'a' ? 'pile-a-container' : 'pile-b-container');
    } else {
        nextA -= amount;
        nextB -= amount;
        showFloatingText(amount, 'pile-a-container');
        showFloatingText(amount, 'pile-b-container');
    }
    
    if (validate_move(pileA, pileB, nextA, nextB)) {
        pileA = nextA;
        pileB = nextB;
        
        if (gameMode === MODES.MULTIPLAYER) {
            pendingMove = { pileA, pileB };
            myTurn = false;
            updateUI();
            sendState('move', pileA, pileB);
        } else {
            myTurn = false;
            updateUI();
            updateUrl();
            if (pileA > 0 || pileB > 0) {
                setTimeout(handleAiMove, 600);
            }
        }
    } else {
        showToast('Invalid Move!');
    }
}

function handleAiMove() {
    if (gameMode !== MODES.VS_COMPUTER) return;
    const result = ai_move(pileA, pileB);
    const diffA = pileA - result[0];
    const diffB = pileB - result[1];
    if (diffA > 0) showFloatingText(diffA, 'pile-a-container');
    if (diffB > 0) showFloatingText(diffB, 'pile-b-container');
    pileA = result[0];
    pileB = result[1];
    myTurn = true;
    updateUI();
    updateUrl();
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
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);
    }
}

function renderTokens(container, count) {
    const currentCount = container.children.length;
    if (currentCount > count) {
        for (let i = 0; i < currentCount - count; i++) {
            const last = container.lastElementChild;
            if (last) { last.classList.add('token-removing'); setTimeout(() => last.remove(), 300); }
        }
    } else if (currentCount < count) {
        for (let i = 0; i < count - currentCount; i++) {
            const token = document.createElement('div');
            token.className = 'token';
            container.appendChild(token);
        }
    }
}

function showFloatingText(amount, containerId) {
    const container = document.getElementById(containerId);
    const rect = container.getBoundingClientRect();
    const text = document.createElement('div');
    text.className = 'floating-text';
    text.textContent = `-${amount}`;
    text.style.left = `${rect.left + rect.width/2}px`;
    text.style.top = `${rect.top}px`;
    document.body.appendChild(text);
    setTimeout(() => text.remove(), 800);
}

function updateMaxAmount() {
    const type = moveTypeSelect.value;
    let max = 1;
    if (type === 'one') max = targetPileSelect.value === 'a' ? pileA : pileB;
    else max = Math.min(pileA, pileB);
    amountInput.max = Math.max(1, max);
    if (parseInt(amountInput.value) > max) { amountInput.value = max; amountDisplay.textContent = max; }
}

function setupPeer() {
    if (peer) return;
    peer = new Peer();
    peer.on('open', (id) => { myIdDisplay.textContent = id; });
    peer.on('connection', (c) => { conn = c; setupConnection(); isHost = true; sendState('sync', pileA, pileB); });
}

function connectToPeer(id) { conn = peer.connect(id); isHost = false; setupConnection(); }

function setupConnection() {
    conn.on('open', () => { showToast('Connected!'); reconnectOverlay.classList.add('hidden'); startHeartbeat(); });
    conn.on('data', (data) => {
        if (data.type === 'move') {
            if (validate_move(pileA, pileB, data.pileA, data.pileB)) {
                pileA = data.pileA; pileB = data.pileB; myTurn = true; updateUI(); updateUrl(); sendState('ack'); showToast('Opponent moved!');
            } else { sendState('request_sync'); }
        } else if (data.type === 'ack') { pendingMove = null; updateUI(); updateUrl(); }
        else if (data.type === 'sync' || data.type === 'resync_resp') { pileA = data.pileA; pileB = data.pileB; myTurn = data.type === 'resync_resp' ? myTurn : !isHost; updateUI(); updateUrl(); }
        else if (data.type === 'request_sync') { sendState('resync_resp'); }
        else if (data.type === 'presence') { handlePresenceCue(data); }
        else if (data.type === 'heartbeat') {}
    });
    conn.on('close', () => handleDisconnect());
    conn.on('error', () => handleDisconnect());
}

function handlePresenceCue(data) {
    interactionStatus.classList.remove('hidden');
    if (data.subType === 'target') {
        const pile = document.getElementById(`pile-${data.value}-container`);
        pile.classList.add('pulse');
        setTimeout(() => pile.classList.remove('pulse'), 500);
    }
    setTimeout(() => interactionStatus.classList.add('hidden'), 2000);
}

function handleDisconnect() { reconnectOverlay.classList.remove('hidden'); clearInterval(heartbeatInterval); }

function startHeartbeat() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => { if (conn && conn.open) { sendState('heartbeat'); } }, 3000);
}

function sendState(type, a = pileA, b = pileB) { if (conn && conn.open) { conn.send({ type, pileA: a, pileB: b }); } }

function resetGame() { randomizePiles(); updateUI(); updateUrl(); if (gameMode === MODES.MULTIPLAYER) sendState('sync', pileA, pileB); showToast('Game Reset'); }

function updateUrl() { if (gameMode === MODES.MENU) return; const state = `state=${pileA}-${pileB}&mode=${gameMode}`; window.history.replaceState(null, '', `#${state}`); }

run();