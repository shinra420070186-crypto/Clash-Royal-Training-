// sfx.js - White Noise Percussive UI Click
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

// Generates a natural, non-tonal "tick" using a filtered noise burst
function playElixirTick() {
  initAudio();
  
  const t = audioCtx.currentTime;
  
  // 1. Create a tiny 50-millisecond buffer of pure white noise (static)
  const bufferSize = audioCtx.sampleRate * 0.05; 
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; 
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  // 2. Pass the noise through a filter to turn "hiss" into a sharp "tap"
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2500, t); // Centers the sound to mimic a wooden/plastic click
  filter.Q.setValueAtTime(1.5, t); 
  
  // 3. Shape the volume so it vanishes almost instantly
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(0.6, t + 0.001); // Instant tap
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.02); // Silence after 20ms
  
  // Connect the chain
  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Play the tick
  noiseSource.start(t);
}
