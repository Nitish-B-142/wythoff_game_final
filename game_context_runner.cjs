const fs = require('fs');
const path = require('path');

// --- Logger Setup ---
const logStream = fs.createWriteStream('game_context.log');
function log(actor, action, result, context = '') {
    const entry = `[${new Date().toISOString()}] [${actor.toUpperCase()}] ${action} -> ${result} | ${context}
`;
    logStream.write(entry);
    // console.log(entry.trim()); // Uncomment for verbose stdout
}

// --- Mock Wasm Loader ---
// We use the real Wasm binary to ensure we are testing the actual "Brain"
async function loadWasm() {
    const wasmPath = path.join(__dirname, 'pkg', 'wythoff_wasm_bg.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const importObject = {
        './wythoff_wasm_bg.js': {
            __wbg___wbindgen_throw_be289d5034ed271b: () => { throw new Error("Wasm Panic"); },
            __wbg_new_034f354e3d0e9f16: () => ({}),
            __wbg_set_04a8e38d7857213e: () => {},
            __wbindgen_init_externref_table: () => {}
        }
    };
    const { instance } = await WebAssembly.instantiate(wasmBuffer, importObject);
    return instance.exports;
}

// --- The Game Engine (Mimics main.js Logic) ---
class GameEngine {
    constructor(wasmExports) {
        this.wasm = wasmExports;
        this.pileA = 20;
        this.pileB = 25;
        this.myTurn = true;
        this.mode = 'MENU';
        this.isGameOver = false;
        log('SYSTEM', 'INIT', 'Game Engine Started', `A:${this.pileA}, B:${this.pileB}`);
    }

    reset(mode) {
        this.mode = mode;
        this.pileA = Math.floor(Math.random() * 18) + 12;
        this.pileB = Math.floor(Math.random() * 18) + 12;
        this.myTurn = true;
        this.isGameOver = false;
        log('SYSTEM', 'RESET', `Mode: ${mode}`, `A:${this.pileA}, B:${this.pileB}`);
    }

    attemptMove(actor, type, target, amount) {
        if (this.isGameOver) {
            log(actor, 'MOVE_ATTEMPT', 'FAIL: Game Over');
            return false;
        }
        if (!this.myTurn && actor === 'PLAYER') {
            log(actor, 'MOVE_ATTEMPT', 'FAIL: Not your turn');
            return false;
        }

        let nextA = this.pileA;
        let nextB = this.pileB;
        amount = parseInt(amount);

        if (isNaN(amount) || amount < 1) {
             log(actor, 'MOVE_ATTEMPT', 'FAIL: Invalid Amount', `Amount: ${amount}`);
             return false;
        }

        if (type === 'one') {
            if (target === 'a') nextA -= amount;
            else nextB -= amount;
        } else {
            nextA -= amount;
            nextB -= amount;
        }

        // Check if move is physically possible (JS logic)
        if (nextA < 0 || nextB < 0) {
            log(actor, 'MOVE_ATTEMPT', 'FAIL: Negative Piles', `(${nextA}, ${nextB})`);
            return false;
        }

        // Check Wasm Validation
        const isValid = this.wasm.validate_move(this.pileA, this.pileB, nextA, nextB);
        if (isValid) {
            this.pileA = nextA;
            this.pileB = nextB;
            this.myTurn = !this.myTurn; // Toggle turn
            log(actor, 'MOVE_SUCCESS', 'Valid Move', `New State: (${this.pileA}, ${this.pileB})`);
            
            if (this.pileA === 0 && this.pileB === 0) {
                this.isGameOver = true;
                log('SYSTEM', 'GAME_OVER', `${actor} Wins!`);
            }
            return true;
        } else {
            log(actor, 'MOVE_ATTEMPT', 'FAIL: Wasm Validation Rejected', `Attempt: (${nextA}, ${nextB})`);
            return false;
        }
    }
}

// --- Archetype Simulations ---

async function runArchetypes() {
    const wasm = await loadWasm();
    const game = new GameEngine(wasm);

    // 1. Archetype: "The Masher" (Dumb/Impulsive)
    // Behavior: Tries to move when not their turn, tries invalid amounts, zeroes.
    log('TEST_RUNNER', 'START_SCENARIO', 'The Masher');
    game.reset('MULTIPLAYER');
    
    // Attempt 1: Valid move
    game.attemptMove('PLAYER', 'one', 'a', 1); 
    // Attempt 2: "Masher" tries to move immediately again (Not their turn)
    game.attemptMove('PLAYER', 'one', 'b', 1);
    // Attempt 3: "Masher" tries to remove 0
    game.myTurn = true; // Force turn back for test
    game.attemptMove('PLAYER', 'one', 'a', 0);
    // Attempt 4: "Masher" tries to remove more than available
    game.attemptMove('PLAYER', 'one', 'a', 100);

    // 2. Archetype: "The Griefer" (Malicious Input)
    // Behavior: Tries negative numbers, non-numeric inputs.
    log('TEST_RUNNER', 'START_SCENARIO', 'The Griefer');
    game.reset('VS_COMPUTER');
    game.attemptMove('PLAYER', 'one', 'a', -5);
    game.attemptMove('PLAYER', 'both', 'a', 'NaN');
    
    // 3. Archetype: "The Strategist" (Standard Flow)
    // Behavior: Plays a valid game vs AI.
    log('TEST_RUNNER', 'START_SCENARIO', 'The Strategist');
    game.reset('VS_COMPUTER');
    let moves = 0;
    while (!game.isGameOver && moves < 20) {
        // Simple strategy: take 1 from A
        if (game.myTurn) {
             if (!game.attemptMove('PLAYER', 'one', 'a', 1)) {
                 // If A is empty, try B
                 game.attemptMove('PLAYER', 'one', 'b', 1);
             }
        } else {
             // Simulate AI response (mock)
             // In real app, AI moves instantly. Here we manually toggle.
             game.myTurn = true; 
             log('AI', 'SKIP', 'Simulated AI turn pass');
        }
        moves++;
    }

    log('TEST_RUNNER', 'COMPLETE', 'All scenarios finished.');
    logStream.end();
}

runArchetypes().catch(console.error);
