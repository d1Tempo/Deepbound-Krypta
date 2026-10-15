/**
 * js/render/doors.js
 * Desenho das portas (moldura, folhas, grades, animação de abertura).
 */

function prepareShadedFrameCanvas(frameImg, shadeFactor) {
  doorScratchCtx.save();
  doorScratchCtx.clearRect(0, 0, 160, 160);
  doorScratchCtx.imageSmoothingEnabled = false;
  doorScratchCtx.globalCompositeOperation = 'source-over';
  doorScratchCtx.drawImage(frameImg, 0, 0, 160, 160);

  const darkAlpha = Math.max(0, Math.min(0.88, 1 - shadeFactor));
  if (darkAlpha > 0.01) {
    doorScratchCtx.globalCompositeOperation = 'source-atop';
    doorScratchCtx.fillStyle = `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})`;
    doorScratchCtx.fillRect(0, 0, 160, 160);
  }
  doorScratchCtx.restore();
}

function drawDoorStructure(rx, rz, door, W, H) {
  const z0 = rz;
  const jambDepth = 0.28; // Espessura tridimensional real do batente de pedra (cobre todo o recuo da passagem)
  const z1 = rz + jambDepth;

  const xLeft = rx - 0.5;
  const xRight = rx + 0.5;
  const frameW = 38 / 160;   // Largura das colunas laterais do batente (38px de 160px)
  const lintelH = 30 / 160;  // Altura da verga superior do batente (30px de 160px)

  const euclidDist = Math.sqrt(rz * rz + rx * rx * 0.45);
  const shade = Math.max(0.16, Math.min(1, 1.08 - euclidDist * 0.12));

  const innerLeft = xLeft + frameW;
  const innerRight = xRight - frameW;
  const doorW = innerRight - innerLeft;
  const topY = -0.5 + lintelH;
  const closedBottomY = 0.5;

  const fullTopLeft0  = projectPoint(xLeft,  -0.5, z0, W, H);
  const fullBotRight0 = projectPoint(xRight,  0.5, z0, W, H);

  // Vao frontal do batente em z0 = rz (usado para recorte 3D do interior do batente e da folha da porta)
  const openTopLeft0  = projectPoint(innerLeft,  topY,          z0, W, H);
  const openTopRight0 = projectPoint(innerRight, topY,          z0, W, H);
  const openBotRight0 = projectPoint(innerRight, closedBottomY, z0, W, H);
  const openBotLeft0  = projectPoint(innerLeft,  closedBottomY, z0, W, H);

  const styleKey = door.visualStyle || 'wood';
  const frameImg = DOOR_TEXTURE_IMAGES.frame;
  const panelImg = DOOR_TEXTURE_IMAGES[styleKey] || DOOR_TEXTURE_IMAGES.wood;
  const jambTexImg = WALL_TEXTURE_IMAGES.base;
  const soffitTexImg = FLOOR_TEXTURE_IMAGES.border_frame || WALL_TEXTURE_IMAGES.base;

  const hasDoorTex = Boolean(
    renderMode !== 'wireframe' &&
    frameImg && frameImg.complete && (frameImg.naturalWidth > 0 || frameImg.width > 0) &&
    panelImg && panelImg.complete && (panelImg.naturalWidth > 0 || panelImg.width > 0) &&
    doorScratchCtx
  );

  let activeDoorPts = [openTopLeft0, openTopRight0, openBotRight0, openBotLeft0];

  if (hasDoorTex) {
    // 1. Faces laterais EXTERNAS da espessura 3D do batente (quando visto em diagonal dentro de uma sala)
    const leftCell = localToMap(rx - 1, rz);
    const rightCell = localToMap(rx + 1, rz);
    if (rx > 0 && !isSolidWall(leftCell.mx, leftCell.my) && jambTexImg?.complete) {
      const extLeftPts = [
        projectPoint(xLeft, -0.5, z0, W, H),
        projectPoint(xLeft, -0.5, z1, W, H),
        projectPoint(xLeft,  0.5, z1, W, H),
        projectPoint(xLeft,  0.5, z0, W, H)
      ];
      drawPerspectiveSideWallTexture(fpCtx, jambTexImg, extLeftPts, z0, z1, true);
      const extDark = Math.max(0, Math.min(0.86, 1 - shade * 0.78));
      drawQuad(fpCtx, extLeftPts, `rgba(4, 7, 12, ${extDark.toFixed(3)})`, null, 1);
    }
    if (rx < 0 && !isSolidWall(rightCell.mx, rightCell.my) && jambTexImg?.complete) {
      const extRightPts = [
        projectPoint(xRight, -0.5, z0, W, H),
        projectPoint(xRight, -0.5, z1, W, H),
        projectPoint(xRight,  0.5, z1, W, H),
        projectPoint(xRight,  0.5, z0, W, H)
      ];
      drawPerspectiveSideWallTexture(fpCtx, jambTexImg, extRightPts, z0, z1, false);
      const extDark = Math.max(0, Math.min(0.86, 1 - shade * 0.78));
      drawQuad(fpCtx, extRightPts, `rgba(4, 7, 12, ${extDark.toFixed(3)})`, null, 1);
    }

    // 2. Recorta tudo o que esta DENTRO do vao da porta pelo retangulo de abertura frontal em z0
    fpCtx.save();
    fpCtx.beginPath();
    fpCtx.moveTo(openTopLeft0.sx,  openTopLeft0.sy);
    fpCtx.lineTo(openTopRight0.sx, openTopRight0.sy);
    fpCtx.lineTo(openBotRight0.sx, openBotRight0.sy);
    fpCtx.lineTo(openBotLeft0.sx,  openBotLeft0.sy);
    fpCtx.closePath();
    fpCtx.clip();

    // 2A. Face traseira do arco de pedra em z1 = rz + jambDepth (visivel quando a porta abre ou atraves da grade)
    if (door.anim > 0.01 || styleKey === 'grate') {
      const fullTopLeft1  = projectPoint(xLeft,  -0.5, z1, W, H);
      const fullBotRight1 = projectPoint(xRight,  0.5, z1, W, H);
      prepareShadedFrameCanvas(frameImg, shade * 0.72);
      fpCtx.save();
      fpCtx.imageSmoothingEnabled = false;
      fpCtx.drawImage(
        doorScratchCanvas,
        fullTopLeft1.sx - 0.45,
        fullTopLeft1.sy - 0.45,
        Math.max(1, (fullBotRight1.sx - fullTopLeft1.sx) + 0.9),
        Math.max(1, (fullBotRight1.sy - fullTopLeft1.sy) + 0.9)
      );
      fpCtx.restore();
    }

    // 2B. BATENTE TRIDIMENSIONAL (Faces internas 3D de pedra do batente entre z0 = rz e z1 = rz + 0.28):
    //     - Face inferior da verga superior (y = topY)
    //     - Face interna esquerda do batente (x = innerLeft, visivel para rx <= 0)
    //     - Face interna direita do batente (x = innerRight, visivel para rx >= 0)
    if (soffitTexImg && soffitTexImg.complete) {
      const lintelSoffitPts = [
        projectPoint(innerLeft,  topY, z0, W, H),
        projectPoint(innerRight, topY, z0, W, H),
        projectPoint(innerRight, topY, z1, W, H),
        projectPoint(innerLeft,  topY, z1, W, H)
      ];
      drawPerspectiveCeilingTile(fpCtx, soffitTexImg, lintelSoffitPts, z0, z1, H);
      const soffitDark = Math.max(0, Math.min(0.90, 1 - shade * 0.58));
      drawQuad(fpCtx, lintelSoffitPts, `rgba(4, 7, 12, ${soffitDark.toFixed(3)})`, 'rgba(8, 12, 18, 0.55)', 1);
    }

    if (jambTexImg && jambTexImg.complete) {
      const jambDark = Math.max(0, Math.min(0.88, 1 - shade * 0.70));
      if (innerLeft < 0) {
        const leftRevealPts = [
          projectPoint(innerLeft, topY,          z0, W, H),
          projectPoint(innerLeft, topY,          z1, W, H),
          projectPoint(innerLeft, closedBottomY, z1, W, H),
          projectPoint(innerLeft, closedBottomY, z0, W, H)
        ];
        drawPerspectiveSideWallTexture(fpCtx, jambTexImg, leftRevealPts, z0, z1, false);
        drawQuad(fpCtx, leftRevealPts, `rgba(4, 7, 12, ${jambDark.toFixed(3)})`, 'rgba(8, 12, 18, 0.55)', 1);
      }
      if (innerRight > 0) {
        const rightRevealPts = [
          projectPoint(innerRight, topY,          z0, W, H),
          projectPoint(innerRight, topY,          z1, W, H),
          projectPoint(innerRight, closedBottomY, z1, W, H),
          projectPoint(innerRight, closedBottomY, z0, W, H)
        ];
        drawPerspectiveSideWallTexture(fpCtx, jambTexImg, rightRevealPts, z0, z1, true);
        drawQuad(fpCtx, rightRevealPts, `rgba(4, 7, 12, ${jambDark.toFixed(3)})`, 'rgba(8, 12, 18, 0.55)', 1);
      }
    }

    // 2C. FOLHA DA PORTA OU GRADE:
    //     - Apenas a GRADE ('grate') abre para cima (levadica).
    //     - As portas de MADEIRA ('wood') e de FERRO ('iron') abrem como portas normais com dobradicas
    //       e permanecem visiveis abertas em perspectiva 3D!
    if (styleKey === 'grate') {
      const zGrate = z0 + 0.10;
      const gTopLeft  = projectPoint(innerLeft,  topY,          zGrate, W, H);
      const gBotRight = projectPoint(innerRight, closedBottomY, zGrate, W, H);
      const currentBottomY = topY + (closedBottomY - topY) * (1 - door.anim * 0.88);
      activeDoorPts = [
        projectPoint(innerLeft,  topY,           zGrate, W, H),
        projectPoint(innerRight, topY,           zGrate, W, H),
        projectPoint(innerRight, currentBottomY, zGrate, W, H),
        projectPoint(innerLeft,  currentBottomY, zGrate, W, H)
      ];

      if (doorLeafScratchCtx) {
        const slideUpPx = Math.round(door.anim * 130 * 0.88);
        doorLeafScratchCtx.save();
        doorLeafScratchCtx.clearRect(0, 0, 84, 130);
        doorLeafScratchCtx.imageSmoothingEnabled = false;
        doorLeafScratchCtx.globalCompositeOperation = 'source-over';
        doorLeafScratchCtx.drawImage(panelImg, 0, -slideUpPx, 84, 130);

        const grateDark = Math.max(0, Math.min(0.86, 1 - shade * 0.92));
        if (grateDark > 0.01) {
          doorLeafScratchCtx.globalCompositeOperation = 'source-atop';
          doorLeafScratchCtx.fillStyle = `rgba(4, 7, 12, ${grateDark.toFixed(3)})`;
          doorLeafScratchCtx.fillRect(0, 0, 84, 130);
        }
        doorLeafScratchCtx.restore();

        fpCtx.save();
        fpCtx.imageSmoothingEnabled = false;
        fpCtx.drawImage(
          doorLeafScratchCanvas,
          gTopLeft.sx - 0.45,
          gTopLeft.sy - 0.45,
          Math.max(1, (gBotRight.sx - gTopLeft.sx) + 0.9),
          Math.max(1, (gBotRight.sy - gTopLeft.sy) + 0.9)
        );
        fpCtx.restore();
      }
    } else {
      // Porta normal de madeira ou de ferro: gira na dobradica esquerda em perspectiva 3D!
      const xHinge = innerLeft;
      const zHinge = z0 + 0.06;
      const theta = door.anim * 1.38; // 0° fechada -> ~79° aberta em perspectiva
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const xFree = xHinge + doorW * cosT;
      const zFree = zHinge + doorW * sinT;

      const leafPts = [
        projectPoint(xHinge, topY,          zHinge, W, H),
        projectPoint(xFree,  topY,          zFree,  W, H),
        projectPoint(xFree,  closedBottomY, zFree,  W, H),
        projectPoint(xHinge, closedBottomY, zHinge, W, H)
      ];
      activeDoorPts = leafPts;

      // Espessura 3D da propria folha da porta quando aberta (borda lateral da porta)
      if (door.anim > 0.04) {
        const doorThick = 0.042;
        const nx = -sinT;
        const nz =  cosT;
        const xFreeBack = xFree + nx * doorThick;
        const zFreeBack = zFree + nz * doorThick;

        const edgePts = [
          projectPoint(xFree,     topY,          zFree,     W, H),
          projectPoint(xFreeBack, topY,          zFreeBack, W, H),
          projectPoint(xFreeBack, closedBottomY, zFreeBack, W, H),
          projectPoint(xFree,     closedBottomY, zFree,     W, H)
        ];
        const edgeFactor = shade * 0.62;
        const er = Math.round((styleKey === 'iron' ? 46 : 62) * edgeFactor);
        const eg = Math.round((styleKey === 'iron' ? 52 : 43) * edgeFactor);
        const eb = Math.round((styleKey === 'iron' ? 60 : 26) * edgeFactor);
        drawQuad(fpCtx, edgePts, `rgb(${er}, ${eg}, ${eb})`, 'rgba(8, 10, 14, 0.75)', 1.0);
      }

      // Renderiza a folha da porta (frontal quando fechada ou em perspectiva 3D quando aberta)
      drawPerspectiveSideWallTexture(fpCtx, panelImg, leafPts, zHinge, zFree, false);

      const leafShade = shade * (1 - door.anim * 0.16);
      const leafDark = Math.max(0, Math.min(0.86, 1 - leafShade));
      if (leafDark > 0.01) {
        drawQuad(fpCtx, leafPts, `rgba(4, 7, 12, ${leafDark.toFixed(3)})`, 'rgba(10, 14, 20, 0.55)', 1);
      }
    }

    fpCtx.restore(); // Fim do clip no vao frontal

    // 3. Face FRONTAL do batente de pedra em z0 = rz (emoldura o batente 3D e a folha da porta)
    prepareShadedFrameCanvas(frameImg, shade);
    fpCtx.save();
    fpCtx.imageSmoothingEnabled = false;
    const dstX = fullTopLeft0.sx - 0.45;
    const dstY = fullTopLeft0.sy - 0.45;
    const dstW = Math.max(1, (fullBotRight0.sx - fullTopLeft0.sx) + 0.9);
    const dstH = Math.max(1, (fullBotRight0.sy - fullTopLeft0.sy) + 0.9);
    fpCtx.drawImage(doorScratchCanvas, dstX, dstY, dstW, dstH);
    fpCtx.restore();

    if (renderMode === 'hybrid') {
      const fullPts = [
        fullTopLeft0,
        { sx: fullBotRight0.sx, sy: fullTopLeft0.sy },
        fullBotRight0,
        { sx: fullTopLeft0.sx, sy: fullBotRight0.sy }
      ];
      drawQuad(fpCtx, fullPts, null, `rgba(140, 200, 255, ${Math.max(0.18, shade * 0.44)})`, 1.1);
    }
  } else {
    // Modo Wireframe Puro ou fallback
    const wireStroke = styleKey === 'grate'
      ? `rgba(57, 197, 207, ${Math.max(0.5, shade)})`
      : `rgba(242, 204, 96, ${Math.max(0.45, shade)})`;
    const wireFill = styleKey === 'grate' ? 'rgba(8, 16, 24, 0.32)' : 'rgba(18, 12, 7, 0.92)';
    drawQuad(fpCtx, activeDoorPts, wireFill, wireStroke, 1.6);
  }

  // Sem simbolos/losangos acima das portas; mantem hitbox na porta fechada para dica de interacao
  if (door.anim < 0.85) {
    interactiveHitboxes.push({
      id: `door-${door.x}-${door.y}`,
      type: 'door',
      door,
      rx,
      rz,
      pts: activeDoorPts
    });
  }

  const leftFramePts = [
    projectPoint(xLeft,     -0.5, z0, W, H),
    projectPoint(innerLeft, -0.5, z0, W, H),
    projectPoint(innerLeft,  0.5, z0, W, H),
    projectPoint(xLeft,      0.5, z0, W, H)
  ];
  interactiveHitboxes.push({ id: `dframeL-${door.x}-${door.y}`, type: 'wall', pts: leftFramePts });

  const rightFramePts = [
    projectPoint(innerRight, -0.5, z0, W, H),
    projectPoint(xRight,     -0.5, z0, W, H),
    projectPoint(xRight,      0.5, z0, W, H),
    projectPoint(innerRight,  0.5, z0, W, H)
  ];
  interactiveHitboxes.push({ id: `dframeR-${door.x}-${door.y}`, type: 'wall', pts: rightFramePts });

  const topFramePts = [
    projectPoint(innerLeft,  -0.5,           z0, W, H),
    projectPoint(innerRight, -0.5,           z0, W, H),
    projectPoint(innerRight, -0.5 + lintelH, z0, W, H),
    projectPoint(innerLeft,  -0.5 + lintelH, z0, W, H)
  ];
  interactiveHitboxes.push({ id: `dframeT-${door.x}-${door.y}`, type: 'wall', pts: topFramePts });
}
