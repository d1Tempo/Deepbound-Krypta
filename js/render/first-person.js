/**
 * js/render/first-person.js
 * Função principal que desenha a visão em primeira pessoa (renderFirstPerson).
 */

function renderFirstPerson() {
  const W = fpCanvas.width;
  const H = fpCanvas.height;
  fpCtx.clearRect(0, 0, W, H);
  interactiveHitboxes = [];

  if (renderMode === 'wireframe') {
    fpCtx.fillStyle = '#05080c';
    fpCtx.fillRect(0, 0, W, H);
  } else {
    const ceilGrad = fpCtx.createLinearGradient(0, 0, 0, H * 0.5);
    ceilGrad.addColorStop(0, '#0b1017');
    ceilGrad.addColorStop(1, '#040609');
    fpCtx.fillStyle = ceilGrad;
    fpCtx.fillRect(0, 0, W, H * 0.5);

    const floorGrad = fpCtx.createLinearGradient(0, H * 0.5, 0, H);
    floorGrad.addColorStop(0, '#05070b');
    floorGrad.addColorStop(1, '#141c27');
    fpCtx.fillStyle = floorGrad;
    fpCtx.fillRect(0, H * 0.5, W, H * 0.5);
  }

  const sideOrder = [];
  for (let s = MAX_SIDE; s >= 1; s--) {
    sideOrder.push(-s, s);
  }
  sideOrder.push(0);

  for (let rz = MAX_DEPTH; rz >= 0; rz--) {
    const z0 = rz;
    const z1 = rz + 1;
    const distFactor = Math.max(0.12, 1 - rz / (MAX_DEPTH + 1));

    for (const rx of sideOrder) {
      const { mx, my } = localToMap(rx, rz);
      if (isSolidWall(mx, my) || isClosedSecretDoor(mx, my)) continue;
      if (!currentVisibleSet.has(`${mx},${my}`)) continue;

      const x0 = rx - 0.5;
      const x1 = rx + 0.5;

      const fPts = [
        projectPoint(x0, 0.5, z0, W, H),
        projectPoint(x1, 0.5, z0, W, H),
        projectPoint(x1, 0.5, z1, W, H),
        projectPoint(x0, 0.5, z1, W, H)
      ];

      const isChecker = (mx + my) % 2 === 0;
      const inRoom = Boolean(getRoomAt(mx, my));
      const isGoalTile = (mx === GOAL_POS.x && my === GOAL_POS.y);
      const isStartTile = (mx === START_POS.x && my === START_POS.y);

      drawFloorCell3D(fpCtx, rx, rz, mx, my, x0, x1, z0, z1, fPts, distFactor, isGoalTile, isStartTile, inRoom, isChecker, W, H);

      const cPts = [
        projectPoint(x0, -0.5, z0, W, H),
        projectPoint(x1, -0.5, z0, W, H),
        projectPoint(x1, -0.5, z1, W, H),
        projectPoint(x0, -0.5, z1, W, H)
      ];

      drawCeilingCell3D(fpCtx, rx, rz, mx, my, x0, x1, z0, z1, cPts, distFactor, inRoom, isChecker, W, H);
    }
  }

  const rightWorldFace = (player.dir + 1) % 4;
  const leftWorldFace  = (player.dir + 3) % 4;
  const frontWorldFace = (player.dir + 2) % 4;

  for (let rz = MAX_DEPTH; rz >= 0; rz--) {
    const zNear = rz;
    const zFar = rz + 1;

    for (const rx of sideOrder) {
      const { mx, my } = localToMap(rx, rz);
      if (!currentVisibleSet.has(`${mx},${my}`)) continue;

      // A. Renderiza paredes solidas e passagens secretas (fechadas ou deslizando para o chao)
      const secretDoorObj = isSecretDoorCell(mx, my) ? getDoor(mx, my) : null;
      if (isSolidWall(mx, my) || (secretDoorObj && secretDoorObj.anim < 0.99)) {
        const xLeft = rx - 0.5;
        const xRight = rx + 0.5;
        const ySlideTop = secretDoorObj ? (-0.5 + secretDoorObj.anim * 0.98) : -0.5;

        // Se a passagem secreta esta descendo para o chao (anim > 0.01 e ySlideTop > 0), desenha o topo 3D do bloco de pedra!
        if (secretDoorObj && secretDoorObj.anim > 0.01 && ySlideTop > 0.01) {
          const topPts = [
            projectPoint(xLeft,  ySlideTop, zNear, W, H),
            projectPoint(xRight, ySlideTop, zNear, W, H),
            projectPoint(xRight, ySlideTop, zFar,  W, H),
            projectPoint(xLeft,  ySlideTop, zFar,  W, H)
          ];
          const topTex = FLOOR_TEXTURE_IMAGES.border_frame || WALL_TEXTURE_IMAGES.base;
          if (topTex && topTex.complete) {
            drawPerspectiveFloorTile(fpCtx, topTex, topPts, zNear, zFar, H);
          }
          const euclidDist = Math.sqrt((rz + 0.5) * (rz + 0.5) + rx * rx * 0.45);
          const shade = Math.max(0.14, Math.min(1, 1.08 - euclidDist * 0.12));
          const topDark = Math.max(0, Math.min(0.88, 1 - shade * 0.72));
          drawQuad(fpCtx, topPts, `rgba(4, 7, 12, ${topDark.toFixed(3)})`, 'rgba(10, 14, 20, 0.65)', 1);
        }

        if (rx < 0) {
          const rightNeighbor = localToMap(rx + 1, rz);
          if (!isSolidWall(rightNeighbor.mx, rightNeighbor.my) && !isClosedSecretDoor(rightNeighbor.mx, rightNeighbor.my) && currentVisibleSet.has(`${rightNeighbor.mx},${rightNeighbor.my}`)) {
            const pts = [
              projectPoint(xRight, ySlideTop, zNear, W, H),
              projectPoint(xRight, ySlideTop, zFar,  W, H),
              projectPoint(xRight, 0.5,       zFar,  W, H),
              projectPoint(xRight, 0.5,       zNear, W, H)
            ];
            drawWallFace(pts, rz + 0.5, Math.abs(rx), 'side', mx, my, rightWorldFace, zNear, zFar, -1);
            if (!secretDoorObj) drawButtonsOnWallFace(mx, my, rightWorldFace, W, H);
          }
        }

        if (rx > 0) {
          const leftNeighbor = localToMap(rx - 1, rz);
          if (!isSolidWall(leftNeighbor.mx, leftNeighbor.my) && !isClosedSecretDoor(leftNeighbor.mx, leftNeighbor.my) && currentVisibleSet.has(`${leftNeighbor.mx},${leftNeighbor.my}`)) {
            const pts = [
              projectPoint(xLeft, ySlideTop, zNear, W, H),
              projectPoint(xLeft, ySlideTop, zFar,  W, H),
              projectPoint(xLeft, 0.5,       zFar,  W, H),
              projectPoint(xLeft, 0.5,       zNear, W, H)
            ];
            drawWallFace(pts, rz + 0.5, Math.abs(rx), 'side', mx, my, leftWorldFace, zNear, zFar, 1);
            if (!secretDoorObj) drawButtonsOnWallFace(mx, my, leftWorldFace, W, H);
          }
        }

        if (rz > 0) {
          const frontNeighbor = localToMap(rx, rz - 1);
          if (!isSolidWall(frontNeighbor.mx, frontNeighbor.my) && !isClosedSecretDoor(frontNeighbor.mx, frontNeighbor.my) && currentVisibleSet.has(`${frontNeighbor.mx},${frontNeighbor.my}`)) {
            const pts = [
              projectPoint(xLeft,  ySlideTop, zNear, W, H),
              projectPoint(xRight, ySlideTop, zNear, W, H),
              projectPoint(xRight, 0.5,       zNear, W, H),
              projectPoint(xLeft,  0.5,       zNear, W, H)
            ];
            drawWallFace(pts, rz, Math.abs(rx), 'front', mx, my, frontWorldFace, zNear, zFar, 0);
            if (!secretDoorObj) drawButtonsOnWallFace(mx, my, frontWorldFace, W, H);
          }
        }
      }

      if (isAnyDoorCell(mx, my) && !secretDoorObj && rz >= 1) {
        const frontCell = localToMap(rx, rz - 1);
        if (!isSolidWall(frontCell.mx, frontCell.my) && !isClosedSecretDoor(frontCell.mx, frontCell.my) && currentVisibleSet.has(`${frontCell.mx},${frontCell.my}`)) {
          const door = getDoor(mx, my);
          drawDoorStructure(rx, rz, door, W, H);
        }
      }

      // Desenha a chave caída no chão no final do beco sem saída (visível também em rz === 0 aos pés do jogador)
      for (const k of keysOnFloor) {
        if (!k.collected && k.x === mx && k.y === my && rz >= 0) {
          drawKeyIn3D(rx, rz, k, W, H);
        }
      }
    }
  }

  if (guiMode === 'dev') {
    drawFirstPersonHUD(W, H);
    drawHoverTooltip(W, H);
  }
}
