/**
 * js/core/audio.js
 * Gerenciador de BGM (Trilha/Vento) e SFX (Passos)
 */

// Inicializa a Web Audio API (Padrão moderno para loops sem estalos)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AUDIO_FILES = {
  // Trilha misteriosa
  bgm: new Audio('assets/audio/bgm/Crypt_of_Quiet_Ages.mp3'),
  
  // Array com as 4 variações de passos para sorteio
  steps: [
    new Audio('assets/audio/sfx/passo_1.mp3'),
    new Audio('assets/audio/sfx/passo_2.mp3'),
    new Audio('assets/audio/sfx/passo_3.mp3'),
    new Audio('assets/audio/sfx/passo_4.mp3')
  ]
};

// Configurações de Loop e Volume da trilha via HTML5
AUDIO_FILES.bgm.loop = true;
AUDIO_FILES.bgm.volume = 0.2; 

let isAudioInitialized = false;

// Função que carrega o vento na Web Audio API para um loop perfeito
async function playSeamlessWind() {
  try {
    // Baixa o arquivo do vento
    const response = await fetch('assets/audio/sfx/vento_1.ogg');
    const arrayBuffer = await response.arrayBuffer();
    // Decodifica o áudio puro na memória (remove o estalo do MP3)
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Cria a fonte de áudio
    const windSource = audioCtx.createBufferSource();
    windSource.buffer = audioBuffer;
    windSource.loop = true; // Loop perfeito ativado

    // Cria um nó de controle de volume
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.3; // Volume do vento

    // Conecta a fonte ao volume, e o volume à saída de som do PC
    windSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Inicia a reprodução
    windSource.start();
  } catch (e) {
    console.warn("Erro ao carregar o loop do vento via Web Audio API:", e);
  }
}

// Função chamada no primeiro movimento/giro do jogador
function initAmbientAudio() {
  if (isAudioInitialized) return; // Garante que só dispare uma vez
  
  // O Safari exige que o AudioContext seja "acordado" por uma interação do usuário
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Inicia as faixas de ambiente
  AUDIO_FILES.bgm.play().catch(e => console.warn("Aguardando interação para música"));
  playSeamlessWind();
  
  isAudioInitialized = true;
}

// Função para tocar efeitos de passo instantaneamente
function playFootstep() {
  // Sorteia um número de 0 a 3 para escolher um dos arquivos de passos
  const randomIndex = Math.floor(Math.random() * AUDIO_FILES.steps.length);
  const stepSound = AUDIO_FILES.steps[randomIndex];
  
  // CLONA o áudio para evitar latência e permitir sobreposição de sons
  const soundClone = stepSound.cloneNode(true);
  soundClone.volume = 0.8;
  
  // Toca o clone instantaneamente
  soundClone.play().catch(e => {});
  
  // Limpa o clone da memória após terminar de tocar
  soundClone.onended = function() {
    soundClone.remove();
  };
}
