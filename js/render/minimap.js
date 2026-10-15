/**
 * js/render/minimap.js
 * Minimapa 2D (36x36) do modo desenvolvedor e do mapa do jogador.
 */

function renderMinimapOnTarget(targetCanvas, miniCtx) {
  if (!targetCanvas || !miniCtx) return;
  const W = targetCanvas.width;
  const H = targetCanvas.height;
  const cellSize = W / MAP_SIZE;

  miniCtx.clearRect(0, 0, W, H);

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const px = x * cellSize;
      const py = y * cellSize;
      const fogState = revealAllCheat ? FOG_VISIBLE : fogGrid[y][x];

      if (fogState === FOG_UNSEEN) {
        miniCtx.fillStyle = '#06090e';
        miniCtx.fillRect(px, py, cellSize, cellSize);
        miniCtx.strokeStyle = '#0b1018';
        miniCtx.lineWidth = 0.5;
        miniCtx.strokeRect(px, py, cellSize, cellSize);
        continue;
      }

      const isDimmed = (fogState === FOG_EXPLORED);
      const cellVal = dungeonMap[y][x];

      if (cellVal === TILE_WALL) {
        miniCtx.fillStyle = isDimmed ? '#1e2530' : '#384252';
        miniCtx.fillRect(px, py, cellSize, cellSize);
      } else if (cellVal === TILE_ENTRANCE_DOOR) {
        miniCtx.fillStyle = isDimmed ? '#581922' : '#8b2635';
        miniCtx.fillRect(px, py, cellSize, cellSize);
        miniCtx.strokeStyle = '#ff7b72';
        miniCtx.lineWidth = 1;
        miniCtx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
      } else if (cellVal === TILE_SPECIAL_DOOR) {
        miniCtx.fillStyle = isDimmed ? '#5a32a3' : '#a371f7';
        miniCtx.fillRect(px, py, cellSize, cellSize);
        miniCtx.strokeStyle = '#f2cc60';
        miniCtx.lineWidth = 1;
        miniCtx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
      } else if (cellVal === TILE_DOOR) {
        const door = getDoor(x, y);
        if (door && door.isSecret && !door.discoveredSecret && !revealAllCheat) {
          miniCtx.fillStyle = isDimmed ? '#1e2530' : '#384252';
          miniCtx.fillRect(px, py, cellSize, cellSize);
          continue;
        }
        miniCtx.fillStyle = isDimmed ? '#0a0f16' : '#111924';
        miniCtx.fillRect(px, py, cellSize, cellSize);

        if (door.isSecret) {
          miniCtx.fillStyle = door.open ? '#3fb950' : '#a371f7';
        } else if (door.open) {
          miniCtx.fillStyle = '#2ea043';
        } else if (door.lockType === 'iron') {
          miniCtx.fillStyle = '#58a6ff';
        } else if (door.lockType === 'gold') {
          miniCtx.fillStyle = '#f2cc60';
        } else if (door.isRemote) {
          miniCtx.fillStyle = '#39c5cf';
        } else if (door.isOneWay) {
          miniCtx.fillStyle = '#ff9b50';
        } else {
          miniCtx.fillStyle = '#d29922';
        }

        const horizontalPass = isSolidWall(x, y - 1) && isSolidWall(x, y + 1);
        if (horizontalPass) {
          miniCtx.fillRect(px + cellSize * 0.2, py + 1, cellSize * 0.6, cellSize - 2);
        } else {
          miniCtx.fillRect(px + 1, py + cellSize * 0.2, cellSize - 2, cellSize * 0.6);
        }

        if (door.isRemote && door.remoteId) {
          miniCtx.fillStyle = '#ffffff';
          miniCtx.font = '700 7px Consolas, monospace';
          miniCtx.textAlign = 'center';
          miniCtx.textBaseline = 'middle';
          miniCtx.fillText(`R${door.remoteId}`, px + cellSize * 0.5, py + cellSize * 0.5);
        }
      } else {
        const inRoom = Boolean(getRoomAt(x, y));
        if (x === GOAL_POS.x && y === GOAL_POS.y) {
          miniCtx.fillStyle = isDimmed ? '#2f1d4d' : '#4c2c85';
        } else if (x === START_POS.x && y === START_POS.y) {
          miniCtx.fillStyle = isDimmed ? '#2b191d' : '#422329';
        } else if (inRoom) {
          miniCtx.fillStyle = isDimmed ? '#0c1814' : '#162c22';
        } else {
          miniCtx.fillStyle = isDimmed ? '#090d13' : '#101722';
        }
        miniCtx.fillRect(px, py, cellSize, cellSize);
        miniCtx.strokeStyle = isDimmed ? '#111822' : '#1c2738';
        miniCtx.lineWidth = 0.5;
        miniCtx.strokeRect(px, py, cellSize, cellSize);
      }
    }
  }

  for (const k of keysOnFloor) {
    if (k.collected) continue;
    const kFog = revealAllCheat ? FOG_VISIBLE : fogGrid[k.y][k.x];
    if (kFog === FOG_UNSEEN) continue;

    const kx = (k.x + 0.5) * cellSize;
    const ky = (k.y + 0.5) * cellSize;

    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(kx, ky, cellSize * 0.38, 0, Math.PI * 2);
    miniCtx.fillStyle = k.type === 'iron' ? '#79c0ff' : (k.type === 'gold' ? '#f2cc60' : '#d2a8ff');
    miniCtx.fill();
    miniCtx.strokeStyle = '#0d1117';
    miniCtx.lineWidth = 1.2;
    miniCtx.stroke();
    miniCtx.restore();
  }

  for (const btn of wallButtons) {
    const adjFog = revealAllCheat ? FOG_VISIBLE : fogGrid[btn.adjY][btn.adjX];
    if (adjFog === FOG_UNSEEN) continue;

    const door = doors[btn.doorKey];
    const bx = ((btn.p0.wx + btn.p1.wx) * 0.5 + 0.5) * cellSize;
    const by = ((btn.p0.wy + btn.p1.wy) * 0.5 + 0.5) * cellSize;

    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(bx, by, (btn.isSpecial || btn.isRemote) ? 3.2 : 2.1, 0, Math.PI * 2);
    miniCtx.fillStyle = btn.isSpecial
      ? '#d2a8ff'
      : (btn.isRemote
          ? (door.open ? '#3fb950' : '#39c5cf')
          : (door.open ? '#3fb950' : '#f85149'));
    miniCtx.fill();

    if (btn.isRemote && btn.remoteId) {
      miniCtx.fillStyle = '#ffffff';
      miniCtx.font = '700 7.5px Consolas, monospace';
      miniCtx.textAlign = 'center';
      miniCtx.textBaseline = 'middle';
      const tx = (btn.adjX + 0.5) * cellSize;
      const ty = (btn.adjY + 0.5) * cellSize;
      miniCtx.fillText(`R${btn.remoteId}`, tx, ty);
    }
    miniCtx.restore();
  }

  const d = DIRECTIONS[player.dir];
  const cx = (player.x + 0.5) * cellSize;
  const cy = (player.y + 0.5) * cellSize;
  const rightX = -d.dy;
  const rightY = d.dx;

  miniCtx.save();
  miniCtx.beginPath();
  miniCtx.moveTo(cx, cy);
  miniCtx.lineTo(
    cx + (d.dx * 3.2 - rightX * 1.8) * cellSize,
    cy + (d.dy * 3.2 - rightY * 1.8) * cellSize
  );
  miniCtx.lineTo(
    cx + (d.dx * 3.2 + rightX * 1.8) * cellSize,
    cy + (d.dy * 3.2 + rightY * 1.8) * cellSize
  );
  miniCtx.closePath();
  miniCtx.fillStyle = 'rgba(88, 166, 255, 0.2)';
  miniCtx.fill();
  miniCtx.restore();

  miniCtx.save();
  miniCtx.translate(cx, cy);
  const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  miniCtx.rotate(angles[player.dir]);

  const r = cellSize * 0.45;
  miniCtx.beginPath();
  miniCtx.moveTo(0, -r * 1.2);
  miniCtx.lineTo(r * 0.9, r * 0.95);
  miniCtx.lineTo(0, r * 0.45);
  miniCtx.lineTo(-r * 0.9, r * 0.95);
  miniCtx.closePath();

  miniCtx.fillStyle = '#3fb950';
  miniCtx.fill();
  miniCtx.strokeStyle = '#ffffff';
  miniCtx.lineWidth = 1.2;
  miniCtx.stroke();
  miniCtx.restore();
}

function renderMinimap() {
  renderMinimapOnTarget(miniCanvas, miniCtx);
  if (typeof isEnchantedMapOpen !== 'undefined' && isEnchantedMapOpen && typeof document !== 'undefined') {
    const pCanvas = document.getElementById('playerMapCanvas');
    if (pCanvas && pCanvas.getContext) {
      renderMinimapOnTarget(pCanvas, pCanvas.getContext('2d'));
    }
  }
}
