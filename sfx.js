// sfx.js - Dedicated Sound Engine
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

// Generates a sharp, clean "ticking" sound (like a metronome)
function playElixirTick() {
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  // Square wave with a high pitch dropping fast creates a "tick/click"
  osc.type = 'square';
  osc.frequency.setValueAtTime(1000, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05); 
  
  // Volume envelope (extremely fast attack and decay)
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.005); 
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); 
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}
