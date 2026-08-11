// sfx.js - Crisp Mechanical UI Tick Engine
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

// Generates a sharp, premium mechanical "tick" 
function playElixirTick() {
  initAudio();
  
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  // A low-frequency square wave provides a dense raw texture
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, t); 
  
  // THE MAGIC: A high-pass filter cuts out the "beep/buzz" and leaves only the sharp "snap"
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(4000, t); // Cuts off everything below 4000Hz
  
  // Extremely fast volume envelope (Total duration: just 15 milliseconds)
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(0.8, t + 0.001);        // Instant attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.015); // Instant decay
  
  // Connect the chain: Oscillator -> Filter -> Volume -> Output
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(t);
  osc.stop(t + 0.02); // Kill it completely after 20ms to prevent artifacting
}
