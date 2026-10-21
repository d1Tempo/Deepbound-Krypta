/**
 * js/core/audio.js
 * Gerenciador de BGM (Trilha/Vento) e SFX (Passos)
 */

const AUDIO_FILES = {
  // Trilha misteriosa e Vento gélido em loop
  bgm: new Audio('assets/audio/bgm/Crypt_of_Quiet_Ages.mp3'),
  wind: new Audio('assets/audio/sfx/Continuous_seamless__#1.mp3'),
  
  // Array com as 4 variações de passos para sorteio
  steps: [
    new Audio('assets/audio/sfx/Heavy_leather_boots__#1.mp3'),
    new Audio('assets/audio/sfx/Heavy_leather_boots__#2.mp3'),
    new Audio('assets/audio/sfx/Heavy_leather_boots__#3.mp3'),
    new Audio('assets/audio/sfx/Heavy_leather_boots__#4.mp3')
  ]
};

// Configurações de Loop e Mixagem de Volume
AUDIO_FILES.bgm.loop = true;
AUDIO_FILES.bgm.volume = 0.2; // Trilha principal

AUDIO_FILES.wind.loop = true;
AUDIO_FILES.wind.volume = 0.6; // Vento sutil ao fundo

let isAudioInitialized = false;

// Função chamada no primeiro movimento/clique do jogador
function initAmbientAudio() {
  if (isAudioInitialized) return; // Garante que só dispare uma vez
  
  // Inicia as faixas de ambiente
  AUDIO_FILES.bgm.play().catch(e => console.warn("Aguardando interação para tocar música"));
  AUDIO_FILES.wind.play().catch(e => console.warn("Aguardando interação para tocar vento"));
  
  isAudioInitialized = true;
}

// Função para tocar efeitos de passo
function playFootstep() {
  // Sorteia um número de 0 a 3 para escolher um dos arquivos de passos
  const randomIndex = Math.floor(Math.random() * AUDIO_FILES.steps.length);
  const stepSound = AUDIO_FILES.steps[randomIndex];
  
  // Zera o tempo do áudio para permitir que toquem rapidamente em sequência
  stepSound.currentTime = 0;
  stepSound.volume = 0.8;
  stepSound.play().catch(e => {});
}
