/**
 * js/render/canvas-hud.js
 * HUD desenhado no canvas 3D e tooltip de hover.
 */

function drawFirstPersonHUD(W, H) {
  const d = DIRECTIONS[player.dir];
  fpCtx.save();
  fpCtx.fillStyle = 'rgba(13, 17, 23, 0.84)';
  fpCtx.strokeStyle = 'rgba(88, 166, 255, 0.45)';
  fpCtx.lineWidth = 1;

  const boxW = 350;
  const boxH = 32;
  const boxX = (W - boxW) / 2;
  const boxY = 10;

  fpCtx.beginPath();
  fpCtx.roundRect(boxX, boxY, boxW, boxH, 6);
  fpCtx.fill();
  fpCtx.stroke();

  fpCtx.fillStyle = '#e6edf3';
  fpCtx.font = '600 12.5px Consolas, monospace';
  fpCtx.textAlign = 'center';
  fpCtx.textBaseline = 'middle';
  fpCtx.fillText(`Mapa ${currentMapIndex} (${currentTheme.name}) | X:${player.x} Y:${player.y} | ${d.short}`, W / 2, boxY + boxH / 2);
  fpCtx.restore();
}

function drawHoverTooltip(W, H) {
  if (!hoveredHitbox) return;

  let label = '';
  let strokeColor = '#58a6ff';
  let bgColor = 'rgba(13, 17, 23, 0.94)';
  let anchorX = W / 2;
  let anchorY = 62;

  if (hoveredHitbox.type === 'key') {
    const k = hoveredHitbox.keyObj;
    const dist = Math.abs(player.x - k.x) + Math.abs(player.y - k.y);
    anchorX = hoveredHitbox.center.sx;
    anchorY = Math.max(54, hoveredHitbox.center.sy - 26);
    label = dist <= 1
      ? `[Clique] Coletar ${k.name} caída no chão`
      : `${k.name} caída no chão — Aproxime-se e clique sobre ela para coletar`;
    strokeColor = k.type === 'gold' ? '#f2cc60' : '#79c0ff';
  } else if (hoveredHitbox.type === 'button') {
    const btn = hoveredHitbox.btnConfig;
    const door = hoveredHitbox.door;
    const reachable = isPlayerAdjacentToButton(btn);
    anchorX = hoveredHitbox.center.sx;
    anchorY = Math.max(54, hoveredHitbox.center.sy - 26);

    if (btn.isSpecial) {
      label = reachable
        ? `[Clique] Botão Especial: Ir para Nova Masmorra (exige 2 Chaves)`
        : `Vá ao Ponto de Chegada (X:${btn.adjX}, Y:${btn.adjY}) para acionar`;
      strokeColor = '#d2a8ff';
    } else if (btn.isRemote) {
      label = reachable
        ? `[Clique] Botão Remoto #${btn.remoteId}: Destravar Porta em (${door.x}, ${door.y})`
        : `Vá ao fundo do beco (X:${btn.adjX}, Y:${btn.adjY}) para acionar o Botão Remoto #${btn.remoteId}`;
      strokeColor = '#39c5cf';
    } else if (door.isSecret) {
      if (!door.discoveredSecret) {
        label = reachable
          ? `[Clique] ${door.open ? 'Desativar' : 'Acionar'} Alavanca Misteriosa no Beco`
          : `Vá ao fundo do beco (X:${btn.adjX}, Y:${btn.adjY}) para acionar a alavanca`;
      } else {
        label = reachable
          ? `[Clique] ${door.open ? 'Fechar' : 'Abrir'} Passagem Secreta em (${door.x}, ${door.y})`
          : `Vá ao fundo do beco (X:${btn.adjX}, Y:${btn.adjY}) para controlar a Passagem Secreta em (${door.x}, ${door.y})`;
      }
      strokeColor = reachable ? '#d2a8ff' : '#d29922';
    } else {
      const lockInfo = door.lockType === 'iron'
        ? ' (Exige Chave de Ferro)'
        : (door.lockType === 'gold' ? ' (Exige Chave de Ouro)' : '');
      const oneWayInfo = door.isOneWay ? ' [Via Única]' : '';
      label = reachable
        ? `[Clique] ${door.open ? 'Fechar' : 'Abrir'} Porta${oneWayInfo}${lockInfo}`
        : `Vá ao quadrado adjacente (X:${btn.adjX}, Y:${btn.adjY})${lockInfo}`;
      strokeColor = reachable ? '#58a6ff' : '#d29922';
    }
  } else if (hoveredHitbox.type === 'door') {
    const d = hoveredHitbox.door;
    if (d.type === TILE_ENTRANCE_DOOR) {
      label = 'Porta de Entrada (Trancada — indica onde você entrou)';
      strokeColor = '#f85149';
    } else if (d.isRemote && !d.open) {
      label = `Porta Remota #${d.remoteId} — Botão escondido em um beco sem saída!`;
      strokeColor = '#39c5cf';
    } else if (d.lockType === 'iron' && !d.open) {
      label = `Porta Trancada a Ferro${d.isOneWay ? ' (Via Única)' : ''} — Chave em beco sem saída`;
      strokeColor = '#79c0ff';
    } else if (d.lockType === 'gold' && !d.open) {
      label = `Porta Trancada a Ouro${d.isOneWay ? ' (Via Única)' : ''} — Chave em beco sem saída`;
      strokeColor = '#f2cc60';
    } else if (d.isOneWay && !d.open) {
      label = 'Porta de Via Única — Tranca atrás de você após atravessar';
      strokeColor = '#ff9b50';
    } else {
      return;
    }
  } else {
    return;
  }

  fpCtx.save();
  fpCtx.font = '600 12.5px "Segoe UI", sans-serif';
  const textWidth = fpCtx.measureText(label).width;
  const padX = 12;
  const boxW = textWidth + padX * 2;
  const boxH = 26;

  const cx = Math.min(W - boxW / 2 - 8, Math.max(boxW / 2 + 8, anchorX));
  const cy = anchorY;

  fpCtx.fillStyle = bgColor;
  fpCtx.strokeStyle = strokeColor;
  fpCtx.lineWidth = 1.4;

  fpCtx.beginPath();
  fpCtx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
  fpCtx.fill();
  fpCtx.stroke();

  fpCtx.fillStyle = '#e6edf3';
  fpCtx.textAlign = 'center';
  fpCtx.textBaseline = 'middle';
  fpCtx.fillText(label, cx, cy);
  fpCtx.restore();
}
