/**
 * js/render/hitboxes.js
 * Mouse no canvas 3D: coordenadas, detecção de clique/hover em áreas interativas.
 */

// Eventos de Mouse no Canvas 3D
function getCanvasMouseCoords(e) {
  const rect = fpCanvas.getBoundingClientRect();
  const scaleX = fpCanvas.width / rect.width;
  const scaleY = fpCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].sx, yi = pts[i].sy;
    const xj = pts[j].sx, yj = pts[j].sy;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / ((yj - yi) || 0.0001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function findHitboxAt(mx, my) {
  // 1. Prioridade máxima para chaves caídas no chão (evita que paredes/botões laterais em rz=0 interceptem o clique na chave)
  for (let i = interactiveHitboxes.length - 1; i >= 0; i--) {
    const item = interactiveHitboxes[i];
    if (item.type === 'key') {
      if (item.pts && pointInPolygon(mx, my, item.pts)) {
        return item;
      }
      if (item.center && Math.hypot(mx - item.center.sx, my - item.center.sy) <= item.hitRadius) {
        return item;
      }
    }
  }

  // 2. Em seguida, verifica alavancas/fechaduras, portas e oclusão por paredes
  for (let i = interactiveHitboxes.length - 1; i >= 0; i--) {
    const item = interactiveHitboxes[i];
    if (item.type === 'button') {
      if (item.pts && pointInPolygon(mx, my, item.pts)) {
        return item;
      }
      if (item.center && Math.hypot(mx - item.center.sx, my - item.center.sy) <= item.hitRadius) {
        return item;
      }
    } else if (item.type === 'door') {
      if (pointInPolygon(mx, my, item.pts)) {
        return item;
      }
    } else if (item.type === 'wall') {
      if (pointInPolygon(mx, my, item.pts)) {
        return null;
      }
    }
  }
  return null;
}

fpCanvas.addEventListener('mousemove', (e) => {
  mousePos = getCanvasMouseCoords(e);
  const hit = findHitboxAt(mousePos.x, mousePos.y);
  const changed = (hit?.id !== hoveredHitbox?.id);
  hoveredHitbox = hit;
  fpCanvas.style.cursor = (hit && (hit.type === 'button' || hit.type === 'key')) ? 'pointer' : 'default';
  if (changed) {
    renderFirstPerson();
  }
});

fpCanvas.addEventListener('mouseleave', () => {
  hoveredHitbox = null;
  fpCanvas.style.cursor = 'default';
  renderFirstPerson();
});

fpCanvas.addEventListener('click', (e) => {
  const coords = getCanvasMouseCoords(e);
  const hit = findHitboxAt(coords.x, coords.y);
  if (!hit) return;

  if (hit.type === 'key') {
    const k = hit.keyObj;
    const dist = Math.abs(player.x - k.x) + Math.abs(player.y - k.y);
    if (dist <= 1) {
      collectKeyByClick(k);
      renderFirstPerson();
      renderMinimap();
    } else {
      showToast(k.type === 'map' ? 'Você está longe demais do Mapa Encantado. Aproxime-se para pegá-lo do chão.' : `Você está longe demais da ${k.name}. Aproxime-se para pegá-la do chão.`, 'info');
    }
  } else if (hit.type === 'button') {
    if (isPlayerAdjacentToButton(hit.btnConfig)) {
      activateWallButton(hit.btnConfig, hit.door);
    } else {
      showToast(
        'Você está longe demais para alcançar este mecanismo na parede. Aproxime-se dele.',
        'info'
      );
    }
  } else if (hit.type === 'door') {
    const d = hit.door;
    if (d.type === TILE_ENTRANCE_DOOR) {
      showToast('A porta de entrada está trancada: ela indica por onde você entrou na masmorra.', 'danger');
    } else if (d.type === TILE_SPECIAL_DOOR) {
      showToast('Esta é a Porta Especial de saída! Destranque as portas da masmorra e acione o mecanismo ao lado.', 'portal');
    } else if (d.isRemote && !d.open) {
      showToast('Esta porta é controlada por uma alavanca remota escondida em um beco sem saída.', 'info');
    } else if (d.isOneWay && !d.open) {
      showToast('Esta porta de via única só pode ser aberta pelo lado de entrada.', 'warn');
    } else if (!d.open) {
      showToast('Clique na alavanca ou fechadura na parede ao lado da porta para abri-la.', 'info');
    }
  }
});
