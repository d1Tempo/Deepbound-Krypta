/**
 * js/ui/notices.js
 * Avisos na tela: janela de histórico e toasts.
 */

function renderHistoryWindow() {
  const listEl = document.getElementById('historyList');
  if (!listEl) return;
  let html = '';
  // Exibe em ordem cronológica os últimos 6 avisos (o aviso mais recente aparece sempre na última linha)
  for (let i = 0; i < noticeHistory.length; i++) {
    const item = noticeHistory[i];
    const isLatest = (i === noticeHistory.length - 1);
    html += `<li class="history-item type-${item.type}${isLatest ? ' latest' : ''}">${item.msg}</li>`;
  }
  listEl.innerHTML = html;
}

function showToast(msg, type = 'danger') {
  noticeHistory.push({ msg, type });
  while (noticeHistory.length > MAX_HISTORY_ITEMS) {
    noticeHistory.shift();
  }
  renderHistoryWindow();

  // Na GUI do Jogador não há textos sobre a imagem da masmorra (apenas na janela de Histórico)
  const banner = document.getElementById('toastBanner');
  if (!banner) return;
  if (guiMode !== 'dev') {
    if (banner.classList) banner.classList.remove('visible');
    return;
  }
  banner.textContent = msg;
  banner.className = `toast-banner visible ${type}`;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    banner.classList.remove('visible');
  }, 2600);
}
