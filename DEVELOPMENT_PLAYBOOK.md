# The Wythoff Development Playbook

This document is a technical and behavioral specification for building high-quality "Agentic Prototypes." It encodes the novel tricks and strategies used to transform a basic Wasm project into a professional-grade product.

---

## 🛠️ Technical Patterns (The "Novel" Tricks)

### 1. The P2P Handshake (ACK Protocol)
*   **The Problem:** Standard PeerJS `send()` is "Fire and Forget," leading to turn desyncs.
*   **The Solution:** Implement a 2-way handshake.
    *   `MOVE` -> `ACK`.
    *   The UI must enter a "Syncing..." state until `ACK` is received.
    *   **Goal:** Deterministic state synchronization without a central server.

### 2. Wasm "Brain Extraction" Fuzzing
*   **The Problem:** Testing UI doesn't prove the math is perfect.
*   **The Solution:** Load the `.wasm` binary directly into a Node.js test script or use Rust `#[cfg(test)]`.
    *   **Novel Trick:** Simulate 1,000 games per second in-memory to find edge cases in the game theory logic.

### 3. Frictionless Deep-Linking
*   **The Problem:** Copying PeerIDs is high friction.
*   **The Solution:** Encode the **Room ID** (`join=ID`) into the URL hash.
    *   On load, the app must parse the hash and **Auto-Connect**.
    *   **Goal:** Zero-configuration joining.

### 4. Interaction Presence Cues
*   **The Problem:** P2P feels lonely/laggy.
*   **The Solution:** Broadcast `PRESENCE` events for mouse hovers and slider moves.
    *   **Novel Trick:** Pulse the UI on the opponent's screen to show "intent" before the move is finalized.

---

## 🎭 Behavioral Pillars (Agentic Role-Play)

To verify the game design, future agents should role-play these **Archetypes**:

| Archetype | Behavior | Testing Goal |
| :--- | :--- | :--- |
| **The Masher** | Clicks everything rapidly, ignores rules. | Verify UI locking and affordance. |
| **The Griefer** | Tries negative numbers, NaN, and disconnects. | Verify input sanitization and netcode resilience. |
| **The Strategist** | Plays optimally, values speed. | Verify AI latency and "Quick Path" UX. |
| **The Dumb** | Skips text instructions. | Verify "Ghost Hand" and visual tutorials. |

---

## ✨ The "Juice" Specification (Sensory Feedback)

Every interaction must follow the **Action-Feedback Loop**:
1.  **Anticipation:** Visual pulse on hover.
2.  **Action:** The actual state change.
3.  **Follow-through:** 
    *   `token-pop` animation (Squash and Stretch).
    *   Floating text (e.g., `-5`) for numerical confirmation.
    *   `shake` effect for major milestones (Victory).

---

## 🚀 Future Instructions for Gemini
When tasked with repeating this journey:
1.  **Audit for Archetypes:** "How would the Masher break this UI?"
2.  **Harden the Protocol:** "Is this move mathematically verified and Acknowledged?"
3.  **Apply Juice:** "Does this action feel tactile?"
4.  **Reduce Friction:** "Can I do this in one tap?"
