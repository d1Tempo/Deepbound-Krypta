/**
 * js/ui/modes.js
 * Alternância entre GUI do Jogador e GUI do Desenvolvedor e entre modos de renderização.
 */

function setRenderMode(mode) {
  // Na GUI do Jogador, a visão da masmorra é sempre e exclusivamente Pixel Art Pura ('solid')
  if (guiMode === 'player') {
    mode = 'solid';
  }
  renderMode = mode;
  const bHyb = document.getElementById('btnModeHybrid');
  const bSol = document.getElementById('btnModeSolid');
  const bWir = document.getElementById('btnModeWire');
  if (bHyb) bHyb.classList.toggle('active', mode === 'hybrid');
  if (bSol) bSol.classList.toggle('active', mode === 'solid');
  if (bWir) bWir.classList.toggle('active', mode === 'wireframe');
  renderFirstPerson();
}

function setGuiMode(mode) {
  guiMode = (mode === 'dev') ? 'dev' : 'player';
  if (typeof document !== 'undefined' && document.body && document.body.classList) {
    document.body.classList.toggle('player-gui', guiMode === 'player');
    document.body.classList.toggle('dev-gui', guiMode === 'dev');
  }
  if (guiMode === 'player') {
    renderMode = 'solid';
    const bHyb = document.getElementById('btnModeHybrid');
    const bSol = document.getElementById('btnModeSolid');
    const bWir = document.getElementById('btnModeWire');
    if (bHyb) bHyb.classList.remove('active');
    if (bSol) bSol.classList.add('active');
    if (bWir) bWir.classList.remove('active');
    const banner = document.getElementById('toastBanner');
    if (banner && banner.classList) banner.classList.remove('visible');
  }
  const toggleBtn = document.getElementById('btnToggleGuiMode');
  if (toggleBtn) {
    toggleBtn.textContent = guiMode === 'player'
      ? '⚙ GUI do Desenvolvedor'
      : '🎮 GUI do Jogador';
  }
  updateAll();
}

function toggleGuiMode() {
  setGuiMode(guiMode === 'player' ? 'dev' : 'player');
}
