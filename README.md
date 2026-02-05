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

## Game Rules

Wythoff's Game is played with two piles of tokens. Two players take turns making a move. A move consists of:
- Taking any number of tokens from one pile.
- Taking the same number of tokens from both piles.

The winner is the player who takes the last token(s).

## Deployment

This project is configured for GitHub Pages via GitHub Actions. Push to the `main` branch to trigger a deployment.
