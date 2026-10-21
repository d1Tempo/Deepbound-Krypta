/**
 * js/core/audio.js
 * Gerenciador de BGM (Trilha/Vento) e SFX (Passos, Portas, Alavancas)
 */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AUDIO_FILES = {
  bgm: new Audio('assets/audio/bgm/Crypt_of_Quiet_Ages.mp3'),
  
  steps: [
    new Audio('assets/audio/sfx/passo_1.mp3'),
    new Audio('assets/audio/sfx/passo_2.mp3'),
    new Audio('assets/audio/sfx/passo_3.mp3'),
    new Audio('assets/audio/sfx/passo_4.mp3')
  ],
  
  levers: [
    new Audio('assets/audio/sfx/mecha_1.mp3'),
    new Audio('assets/audio/sfx/mecha_2.mp3'),
    new Audio('assets/audio/sfx/mecha_3.mp3'),
    new Audio('assets/audio/sfx/mecha_4.mp3')
  ],

  ironDoors: [
    new Audio('assets/audio/sfx/iron_door_1.mp3'),
    new Audio('assets/audio/sfx/iron_door_2.mp3'),
    new Audio('assets/audio/sfx/iron_door_3.mp3')
  ],

  woodenDoors: [
    new Audio('assets/audio/sfx/wooden_door_1.mp3'),
    new Audio('assets/audio/sfx/wooden_door_2.mp3'),
    new Audio('assets/audio/sfx/wooden_door_3.mp3'),
    new Audio('assets/audio/sfx/wooden_door_4.mp3')
  ]
};

AUDIO_FILES.bgm.loop = true;
AUDIO_FILES.bgm.volume = 0.2; 

let isAudioInitialized = false;

async function playSeamlessWind() {
  try {
    const response = await fetch('assets/audio/sfx/vento_1.ogg'); // Ou .mp3 se você manteve o MP3 com fade
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const windSource = audioCtx.createBufferSource();
    windSource.buffer = audioBuffer;
    windSource.loop = true;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.6; 

    windSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    windSource.start();
  } catch (e) {
    console.warn("Erro ao carregar o vento:", e);
  }
}

function initAmbientAudio() {
  if (isAudioInitialized) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  AUDIO_FILES.bgm.play().catch(e => {});
  playSeamlessWind();
  isAudioInitialized = true;
}

// Função genérica para clonar e tocar efeitos sonoros instantaneamente
function playSfx(audioArray, volume = 0.8) {
  const randomIndex = Math.floor(Math.random() * audioArray.length);
  const sound = audioArray[randomIndex];
  const soundClone = sound.cloneNode(true);
  soundClone.volume = volume;
  soundClone.play().catch(e => {});
  soundClone.onended = () => soundClone.remove();
}

function playFootstep() { playSfx(AUDIO_FILES.steps, 0.5); }

function playLever() { playSfx(AUDIO_FILES.levers, 0.9); }

function playDoorSound(visualStyle) {
  // Portas secretas, portas da entrada e grades usam som de metal/pedra pesada
  if (visualStyle === 'iron' || visualStyle === 'grate' || visualStyle === 'secret') {
    playSfx(AUDIO_FILES.ironDoors, 0.8);
  } else {
    playSfx(AUDIO_FILES.woodenDoors, 0.8);
  }
}