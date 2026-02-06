# Wythoff's Game (Wasm + Vite)

A browser-based implementation of Wythoff's Game with a Rust/WebAssembly AI and PeerJS multiplayer.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Node.js](https://nodejs.org/) (npm)

## Local Development

1. **Build the WebAssembly module:**
   ```bash
   cd wythoff-wasm
   wasm-pack build --target web --out-dir ../pkg
   cd ..
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Follow the link provided by Vite (usually `http://localhost:5173`).

## Replicating this Success (The Master Prompt)

To replicate the high-quality, hardened, and user-friendly development process used in this project with a fresh Gemini instance, provide it with the following "Seed Prompt":

> **Master Prompt for Agentic Excellence:**
> 
> "I want to build a project with 'Ideological Perfection.' Do not just code; I want you to act as a **Virtual Product Team**.
> 
> 1. **Research & Audit:** Before implementing, research best practices for the specific domain (e.g., UX for math games, P2P netcode reliability, cognitive load).
> 2. **Agentic Role-Play:** Create a local simulation (e.g., using Playwright or Node scripts) to 'playtest' the logic as different archetypes: **The Masher** (clicks everything), **The Griefer** (tries to break logic), and **The Strategist** (values speed/juice). Use these simulations to generate context logs for yourself.
> 3. **Hardening by Design:** Implement patterns that make faults mathematically impossible (e.g., ACK protocols for sync, dynamic UI locking, property-based fuzzing).
> 4. **Apply Sensory 'Juice':** Every interaction must have anticipation, action, and follow-through (animations, shakes, floating feedback).
> 5. **Frictionless UX:** Prioritize one-tap actions (Deep-linking, Web Share API) and 'Show, Don't Tell' onboarding (Ghost Hand tutorials).
> 
> Always document your technical tricks and archetypal findings in a `DEVELOPMENT_PLAYBOOK.md` as you go."

## Game Rules

Wythoff's Game is played with two piles of tokens. Two players take turns making a move. A move consists of:
- Taking any number of tokens from one pile.
- Taking the same number of tokens from both piles.

The winner is the player who takes the last token(s).

## Deployment

This project is configured for GitHub Pages via GitHub Actions. Push to the `main` branch to trigger a deployment.
