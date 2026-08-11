// sfx.js - Premium Layered UI Pop
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

// Plays a satisfying, modern UI "Tap + Pop"
function playElixirTick() {
  initAudio();
  const t = audioCtx.currentTime;

  // ==========================================
  // LAYER 1: The "Body" (Warm, satisfying pop)
  // ==========================================
  const bodyOsc = audioCtx.createOscillator();
  const bodyGain = audioCtx.createGain();
  
  bodyOsc.type = 'sine';
  // Starts high and drops instantly to create a water-like "bloop"
  bodyOsc.frequency.setValueAtTime(800, t);
  bodyOsc.frequency.exponentialRampToValueAtTime(150, t + 0.07);
  
  // Smooth volume envelope for the body
  bodyGain.gain.setValueAtTime(0, t);
  bodyGain.gain.linearRampToValueAtTime(0.6, t + 0.005);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  
  bodyOsc.connect(bodyGain);
  bodyGain.connect(audioCtx.destination);
  
  bodyOsc.start(t);
  bodyOsc.stop(t + 0.08);

  // ==========================================
  // LAYER 2: The "Click" (Sharp tactile snap)
  // ==========================================
  const clickOsc = audioCtx.createOscillator();
  const clickGain = audioCtx.createGain();
  
  clickOsc.type = 'square'; // Square wave for a harsh, physical snap
  // Drops extremely fast to act like a percussion hit
  clickOsc.frequency.setValueAtTime(2000, t);
  clickOsc.frequency.exponentialRampToValueAtTime(100, t + 0.02);
  
  // Extremely short volume envelope (only 20 milliseconds long)
  clickGain.gain.setValueAtTime(0, t);
  clickGain.gain.linearRampToValueAtTime(0.15, t + 0.001); // Keeps the click volume low so it doesn't overpower the pop
  clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  
  clickOsc.connect(clickGain);
  clickGain.connect(audioCtx.destination);
  
  clickOsc.start(t);
  clickOsc.stop(t + 0.03);
}
