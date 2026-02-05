# Wythoff's Game - Codebase Guide

This document provides architectural context for the Gemini CLI and developers to understand the project structure and logic.

## 🏗️ System Architecture
The project is a hybrid **Rust/Wasm + Vanilla JS** application.
*   **Performance Layer (Rust):** Handles mathematical computations (Beatty Sequence) and AI logic.
*   **Interaction Layer (JS):** Manages UI, Peer-to-Peer networking, and Game State.

---

## 📁 File Roles

### 1. `wythoff-wasm/src/lib.rs` (The Brain)
*   **AI Logic:** Uses the Golden Ratio ($\phi \approx 1.618$) to calculate "Cold Positions".
*   **`validate_move`:** Ensures players follow Wythoff rules (1 pile OR same amount from both).
*   **`ai_move`:** If the current position is "Hot" (winning), it finds the move to a "Cold" (losing) position. If already "Cold", it makes a random move to delay the game.

### 2. `src/main.js` (The Orchestrator)
*   **State Machine:** Manages three modes: `MENU`, `VS_COMPUTER`, and `MULTIPLAYER`.
*   **Multiplayer (PeerJS):** Uses a "Host/Guest" handshake. The Host randomizes the board and syncs it to the Guest.
*   **URL Sync:** Encodes `pileA`, `pileB`, and `mode` into the URL hash to allow shared sessions.
*   **UI Feedback:** Controls the "Toast" notification system and the "Turn Glow" visual indicators.

### 3. `index.html` & `src/style.css` (The Interface)
*   **Overlay System:** A modal-based menu that forces a mode selection before the game starts.
*   **Mobile First:** Buttons and inputs are sized (48px+) for touch accessibility.
*   **Animations:** CSS transitions are used for the "Turn Indicator" (glowing borders) to provide non-verbal feedback on whose turn it is.

---

## 🎮 Game Logic flow
1.  **Init:** Wasm module loads -> Checks URL for existing state -> Shows Menu.
2.  **Move:** User selects tokens -> `validate_move` (Wasm) checked -> State updated locally.
3.  **Sync:** 
    *   If **AI**: `setTimeout` triggers `ai_move` (Wasm).
    *   If **Multiplayer**: `conn.send` transmits new coordinates to Peer.
4.  **Win Condition:** `(0, 0)` is checked after every move.

## 🛠️ Maintenance Note
When updating logic:
-   **Rust changes** require a `wasm-pack build` to update the `pkg/` folder.
-   **Multiplayer changes** should be tested across two browser tabs using the "Your ID" display.
