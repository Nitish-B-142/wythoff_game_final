import init, { validate_move, ai_move } from '../pkg/wythoff_wasm.js';
import { Peer } from 'peerjs';

let pileA = 20;
let pileB = 25;
let myTurn = true;
let peer = null;
let conn = null;

const pileATokens = document.getElementById('pile-a-tokens');
const pileBTokens = document.getElementById('pile-b-tokens');
const pileACount = document.getElementById('pile-a-count');
const pileBCount = document.getElementById('pile-b-count');
const gameStatus = document.getElementById('game-status');
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

async function run() {
    await init();
    loadStateFromUrl();
    setupPeer();
    updateUI();
    
    amountInput.addEventListener('input', (e) => {
        amountDisplay.textContent = e.target.value;
    });

    moveTypeSelect.addEventListener('change', () => {
        if (moveTypeSelect.value === 'both') {
            targetPileGroup.style.display = 'none';
        } else {
            targetPileGroup.style.display = 'flex';
        }
        updateMaxAmount();
    });

    confirmBtn.addEventListener('click', handleMove);
    aiBtn.addEventListener('click', handleAiMove);
    resetBtn.addEventListener('click', () => {
        pileA = 20;
        pileB = 25;
        myTurn = true;
        updateUI();
        sendState();
        updateUrl();
    });

    connectBtn.addEventListener('click', () => {
        const id = remoteIdInput.value.trim();
        if (id) {
            connectToPeer(id);
        }
    });

    shareLinkBtn.addEventListener('click', () => {
        const url = window.location.origin + window.location.pathname + `#state=${pileA}-${pileB}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Challenge link copied to clipboard!');
        });
    });
}

function updateUI() {
    renderTokens(pileATokens, pileA);
    renderTokens(pileBTokens, pileB);
    pileACount.textContent = `${pileA} tokens`;
    pileBCount.textContent = `${pileB} tokens`;
    
    updateMaxAmount();
    
    if (pileA === 0 && pileB === 0) {
        gameStatus.textContent = myTurn ? "Game Over! You lost." : "Game Over! You won!";
        confirmBtn.disabled = true;
        aiBtn.disabled = true;
    } else {
        gameStatus.textContent = myTurn ? "Your turn" : "Waiting for opponent...";
        confirmBtn.disabled = !myTurn;
        aiBtn.disabled = !myTurn;
    }

    // ARIA announcement
    gameStatus.setAttribute('aria-label', `${gameStatus.textContent}. Pile A: ${pileA}, Pile B: ${pileB}`);
}

function renderTokens(container, count) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const token = document.createElement('div');
        token.className = 'token';
        container.appendChild(token);
    }
}

function updateMaxAmount() {
    const type = moveTypeSelect.value;
    let max = 1;
    if (type === 'one') {
        const target = targetPileSelect.value;
        max = target === 'a' ? pileA : pileB;
    } else {
        max = Math.min(pileA, pileB);
    }
    amountInput.max = max;
    if (parseInt(amountInput.value) > max) {
        amountInput.value = max;
        amountDisplay.textContent = max;
    }
}

function handleMove() {
    console.log("handleMove triggered. Current state:", { pileA, pileB, myTurn });
    if (!myTurn) {
        console.warn("Move attempted but it's not the player's turn.");
        return;
    }
    
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
    
    console.log(`Validating move: (${pileA}, ${pileB}) -> (${nextA}, ${nextB})`);
    if (validate_move(pileA, pileB, nextA, nextB)) {
        console.log("Move validated successfully.");
        pileA = nextA;
        pileB = nextB;
        myTurn = false;
        updateUI();
        sendState();
        updateUrl();

        // Auto-AI move if not in multiplayer
        if (!conn || !conn.open) {
            console.log("Single-player mode: Triggering AI move in 1s...");
            setTimeout(() => {
                if (pileA > 0 || pileB > 0) {
                    const result = ai_move(pileA, pileB);
                    console.log("AI Auto-move result:", result);
                    pileA = result[0];
                    pileB = result[1];
                    myTurn = true;
                    updateUI();
                    updateUrl();
                }
            }, 1000);
        }
    } else {
        console.error("Invalid move according to Wasm logic.");
        alert("Invalid move!");
    }
}

function handleAiMove() {
    console.log("handleAiMove triggered. Current state:", { pileA, pileB, myTurn });
    if (!myTurn) {
        console.warn("AI move attempted but it's not the player's turn.");
        return;
    }
    const result = ai_move(pileA, pileB);
    console.log("AI result from Wasm:", result);
    pileA = result[0];
    pileB = result[1];
    myTurn = false;
    updateUI();
    sendState();
    updateUrl();
}

function setupPeer() {
    peer = new Peer();
    peer.on('open', (id) => {
        myIdDisplay.textContent = id;
    });
    
    peer.on('connection', (c) => {
        conn = c;
        setupConnection();
        gameStatus.textContent = "Opponent connected!";
    });
}

function connectToPeer(id) {
    conn = peer.connect(id);
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        gameStatus.textContent = "Connected to opponent!";
        sendState();
    });
    
    conn.on('data', (data) => {
        if (data.type === 'move') {
            pileA = data.pileA;
            pileB = data.pileB;
            myTurn = true;
            updateUI();
            updateUrl();
        }
    });
}

function sendState() {
    if (conn && conn.open) {
        conn.send({
            type: 'move',
            pileA,
            pileB
        });
    }
}

function updateUrl() {
    const state = `state=${pileA}-${pileB}`;
    window.history.replaceState(null, '', `#${state}`);
}

function loadStateFromUrl() {
    const hash = window.location.hash;
    if (hash.startsWith('#state=')) {
        const parts = hash.substring(7).split('-');
        if (parts.length === 2) {
            pileA = parseInt(parts[0]) || 20;
            pileB = parseInt(parts[1]) || 25;
        }
    }
}

run();
