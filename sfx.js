// sfx.js - Smooth Wooden UI Tap
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Generates a soft, premium "wooden tap" sound
function playElixirTick() {
  initAudio();
  const t = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Triangle wave creates a soft, hollow resonance (no harsh buzzing or digital ringing)
  osc.type = 'triangle';
  
  // A subtle pitch drop gives it a physical "tap" feel
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

  // Super smooth, short volume envelope
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(0.5, t + 0.002); // 2 millisecond soft attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.06); // 60 millisecond smooth fade out

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.07); // Kill it cleanly
}
