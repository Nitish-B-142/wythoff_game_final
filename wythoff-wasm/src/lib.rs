use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GameState {
    pub pile_a: u32,
    pub pile_b: u32,
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new(pile_a: u32, pile_b: u32) -> GameState {
        GameState { pile_a, pile_b }
    }
}

#[wasm_bindgen]
pub fn init_game(pile_a: u32, pile_b: u32) -> GameState {
    GameState::new(pile_a, pile_b)
}

#[wasm_bindgen]
pub fn validate_move(current_a: u32, current_b: u32, next_a: u32, next_b: u32) -> bool {
    if next_a > current_a || next_b > current_b {
        return false;
    }
    if next_a == current_a && next_b == current_b {
        return false;
    }

    let diff_a = current_a - next_a;
    let diff_b = current_b - next_b;

    if diff_a > 0 && diff_b > 0 {
        return diff_a == diff_b;
    }
    
    true
}

const PHI: f64 = 1.618033988749895;

fn is_cold(a: u32, b: u32) -> bool {
    let (min, max) = if a < b { (a, b) } else { (b, a) };
    let n = (max as f64 - min as f64) as u32;
    let expected_min = (n as f64 * PHI).floor() as u32;
    min == expected_min
}

#[wasm_bindgen]
pub fn ai_move(pile_a: u32, pile_b: u32) -> Vec<u32> {
    let (mut a, mut b) = (pile_a, pile_b);
    let swap = a > b;
    if swap {
        std::mem::swap(&mut a, &mut b);
    }

    // Try to reach a cold position (floor(n*phi), floor(n*phi^2))
    // phi^2 = phi + 1
    // Cold positions are (floor(n*phi), floor(n*phi) + n)
    
    // 1. Try removing same amount from both piles
    // Target: (floor(k*phi), floor(k*phi) + k) where floor(k*phi) + k - floor(k*phi) = k = b - a
    let k = b - a;
    let target_a = (k as f64 * PHI).floor() as u32;
    let target_b = target_a + k;
    
    if target_a < a && target_b < b && (a - target_a == b - target_b) {
        return if swap { vec![target_b, target_a] } else { vec![target_a, target_b] };
    }

    // 2. Try removing from one pile to reach a cold position (floor(n*phi), floor(n*phi) + n)
    // We iterate through possible n values. Since a and b are small, this is fast.
    // Max n is roughly b/phi^2
    let max_n = (b as f64 / (PHI + 1.0)).ceil() as u32 + 1;
    for n in 0..=max_n {
        let ca = (n as f64 * PHI).floor() as u32;
        let cb = ca + n;
        
        // Option A: target is (ca, cb)
        if ca == a && cb < b {
             return if swap { vec![cb, ca] } else { vec![ca, cb] };
        }
        if cb == a && ca < b { // Should not happen if a < b and ca < cb, but for safety
             return if swap { vec![ca, cb] } else { vec![cb, ca] };
        }
        if ca == b && cb < a {
             return if swap { vec![cb, ca] } else { vec![ca, cb] };
        }
        if cb == b && ca < a {
             return if swap { vec![ca, cb] } else { vec![cb, ca] };
        }
        
        // Option B: target is (cb, ca) - though cb > ca always.
    }

    // If no winning move found, make a minimal valid move
    if a > 0 {
        if swap { vec![b, a - 1] } else { vec![a - 1, b] }
    } else if b > 0 {
        if swap { vec![b - 1, a] } else { vec![a, b - 1] }
    } else {
        vec![0, 0] // Should not be reached if game is active
    }
}