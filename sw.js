// sfx.js - Smooth, Warm Sound Engine
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

// Generates a smooth, satisfying "thock" or soft organic bubble sound
function playElixirTick() {
  initAudio();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  // Sine wave is the smoothest, most natural-sounding digital waveform (no harsh robotic buzzing)
  osc.type = 'sine';
  
  // Start at a pleasant mid-tone (450Hz) and drop the pitch smoothly to give it depth and weight
  osc.frequency.setValueAtTime(450, audioCtx.currentTime); 
  osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1); 
  
  // Smooth volume envelope: soft tap in (0.015s), smooth fade out (0.15s) to avoid abrupt robotic clicks
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.015); 
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); 
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.16);
}
