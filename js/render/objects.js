/**
 * js/render/objects.js
 * Objetos no mundo 3D: chaves/mapa no chão e faíscas do Mapa Encantado.
 */

function drawKeyIn3D(rx, rz, keyObj, W, H) {
  // Chaves usam escala reduzida (~30%); o pergaminho do Mapa Encantado usa escala ligeiramente maior no chão
  const isNear = (rz === 0);
  const isMapItem = (keyObj.type === 'map');
  const z0 = isNear ? (isMapItem ? 0.54 : 0.58) : rz + (isMapItem ? 0.34 : 0.392);
  const z1 = isNear ? (isMapItem ? 0.82 : 0.78) : rz + (isMapItem ? 0.66 : 0.608);
  const halfW = isNear ? (isMapItem ? 0.145 : 0.095) : (isMapItem ? 0.165 : 0.108);
  const x0 = rx - halfW;
  const x1 = rx + halfW;

  // A chave repousa diretamente sobre os paralelepipedos do chao com proporcao realista (~30% da anterior)
  const yNear = 0.496;
  const yFar  = isNear ? 0.490 : Math.max(0.475, 0.490 - rz * 0.0035);

  const keyPts = [
    projectPoint(x0, yNear, z0, W, H),
    projectPoint(x1, yNear, z0, W, H),
    projectPoint(x1, yFar,  z1, W, H),
    projectPoint(x0, yFar,  z1, W, H)
  ];

  const zCenter = (z0 + z1) * 0.5;
  const keyCenter = projectPoint(rx, (yNear + yFar) * 0.5, zCenter, W, H);
  const euclidDist = Math.sqrt(zCenter * zCenter + rx * rx * 0.45);
  const shade = Math.max(0.18, Math.min(1, 1.08 - euclidDist * 0.11));
  const isHovered = Boolean(hoveredHitbox && hoveredHitbox.id === keyObj.id);

  const keyImg = KEY_TEXTURE_IMAGES[keyObj.type];
  const hasKeyTex = Boolean(
    renderMode !== 'wireframe' &&
    keyImg && keyImg.complete && (keyImg.naturalWidth > 0 || keyImg.width > 0) &&
    keyScratchCtx
  );

  if (hasKeyTex) {
    keyScratchCtx.save();
    keyScratchCtx.clearRect(0, 0, 160, 112);
    keyScratchCtx.imageSmoothingEnabled = false;
    keyScratchCtx.globalCompositeOperation = 'source-over';
    keyScratchCtx.drawImage(keyImg, 0, 0, 160, 112);

    keyScratchCtx.globalCompositeOperation = 'source-atop';
    if (isHovered) {
      keyScratchCtx.fillStyle = 'rgba(255, 235, 150, 0.28)';
      keyScratchCtx.fillRect(0, 0, 160, 112);
    }
    const darkAlpha = Math.max(0, Math.min(0.82, 1 - shade));
    if (darkAlpha > 0.01) {
      keyScratchCtx.fillStyle = `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})`;
      keyScratchCtx.fillRect(0, 0, 160, 112);
    }
    keyScratchCtx.restore();

    drawPerspectiveFloorTile(fpCtx, keyScratchCanvas, keyPts, z0, z1, H);

    if (renderMode === 'hybrid' || (isHovered && guiMode === 'dev')) {
      const hoverColor = keyObj.type === 'gold' ? 'rgba(242, 204, 96, 0.85)' : 'rgba(180, 210, 240, 0.85)';
      drawQuad(fpCtx, keyPts, null, isHovered ? hoverColor : `rgba(140, 200, 255, ${0.22 * shade})`, isHovered ? 1.8 : 1.0);
    }
  } else {
    const strokeCol = keyObj.type === 'gold' ? '#f2cc60' : '#79c0ff';
    drawQuad(fpCtx, keyPts, 'rgba(13, 17, 23, 0.75)', strokeCol, 1.5);
  }

  // Se for o Mapa Encantado no chão, desenha faíscas mágicas animadas nas cores azul e branco saindo do mapa!
  if (isMapItem) {
    drawEnchantedMapSparks3D(rx, rz, z0, z1, x0, x1, yNear, shade, W, H);
  }

  const hitRadius = Math.max(18, 38 / Math.max(0.5, zCenter));
  interactiveHitboxes.push({
    id: keyObj.id,
    type: 'key',
    keyObj,
    pts: keyPts,
    center: keyCenter,
    hitRadius
  });
}

// Moeda (dobrão de ouro) caída no chão. Mesmo modelo de drawKeyIn3D:
// textura 160x112 projetada em perspectiva sobre o piso da casa.
function drawCoinIn3D(rx, rz, coinObj, W, H) {
  const isNear = (rz === 0);
  const z0 = isNear ? 0.58 : rz + 0.392;
  const z1 = isNear ? 0.78 : rz + 0.608;
  const halfW = isNear ? 0.095 : 0.108;
  const x0 = rx - halfW;
  const x1 = rx + halfW;

  const yNear = 0.496;
  const yFar  = isNear ? 0.490 : Math.max(0.475, 0.490 - rz * 0.0035);

  const coinPts = [
    projectPoint(x0, yNear, z0, W, H),
    projectPoint(x1, yNear, z0, W, H),
    projectPoint(x1, yFar,  z1, W, H),
    projectPoint(x0, yFar,  z1, W, H)
  ];

  const zCenter = (z0 + z1) * 0.5;
  const coinCenter = projectPoint(rx, (yNear + yFar) * 0.5, zCenter, W, H);
  const euclidDist = Math.sqrt(zCenter * zCenter + rx * rx * 0.45);
  const shade = Math.max(0.18, Math.min(1, 1.08 - euclidDist * 0.11));
  const isHovered = Boolean(hoveredHitbox && hoveredHitbox.id === coinObj.id);

  const coinImg = OBJECT_TEXTURE_IMAGES.coin_floor;
  const hasCoinTex = Boolean(
    renderMode !== 'wireframe' &&
    coinImg && coinImg.complete && (coinImg.naturalWidth > 0 || coinImg.width > 0) &&
    keyScratchCtx
  );

  if (hasCoinTex) {
    keyScratchCtx.save();
    keyScratchCtx.clearRect(0, 0, 160, 112);
    keyScratchCtx.imageSmoothingEnabled = false;
    keyScratchCtx.globalCompositeOperation = 'source-over';
    keyScratchCtx.drawImage(coinImg, 0, 0, 160, 112);

    keyScratchCtx.globalCompositeOperation = 'source-atop';
    if (isHovered) {
      keyScratchCtx.fillStyle = 'rgba(255, 235, 150, 0.28)';
      keyScratchCtx.fillRect(0, 0, 160, 112);
    }
    const darkAlpha = Math.max(0, Math.min(0.82, 1 - shade));
    if (darkAlpha > 0.01) {
      keyScratchCtx.fillStyle = `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})`;
      keyScratchCtx.fillRect(0, 0, 160, 112);
    }
    keyScratchCtx.restore();

    drawPerspectiveFloorTile(fpCtx, keyScratchCanvas, coinPts, z0, z1, H);

    if (renderMode === 'hybrid' || (isHovered && guiMode === 'dev')) {
      drawQuad(fpCtx, coinPts, null, isHovered ? 'rgba(242, 204, 96, 0.85)' : `rgba(242, 204, 96, ${0.22 * shade})`, isHovered ? 1.8 : 1.0);
    }
  } else {
    drawQuad(fpCtx, coinPts, 'rgba(13, 17, 23, 0.75)', '#f2cc60', 1.5);
  }

  const hitRadius = Math.max(18, 38 / Math.max(0.5, zCenter));
  interactiveHitboxes.push({
    id: coinObj.id,
    type: 'coin',
    coinObj,
    pts: coinPts,
    center: coinCenter,
    hitRadius
  });
}

let mapSparkAnimLastTick = 0;

function drawEnchantedMapSparks3D(rx, rz, z0, z1, x0, x1, yFloor, shade, W, H) {
  const nowMs = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
  // Tempo muito mais lento e suave (~4.2 segundos por ciclo completo de subida de cada faísca)
  const tSlow = nowMs * 0.00024;
  const zMid = (z0 + z1) * 0.5;
  const spanX = (x1 - x0);

  fpCtx.save();

  // 1. Halo mágico misterioso azul-celeste pulsando lentamente sobre o pergaminho no chão
  const centerFloorPt = projectPoint(rx, yFloor - 0.01, zMid, W, H);
  const auraRadius = Math.max(8, (28 / Math.max(0.55, zMid)) * (0.93 + 0.07 * Math.sin(nowMs * 0.0014)));
  if (fpCtx.createRadialGradient) {
    const auraGrad = fpCtx.createRadialGradient(
      centerFloorPt.sx, centerFloorPt.sy, 1,
      centerFloorPt.sx, centerFloorPt.sy, auraRadius
    );
    auraGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(0.28 * shade).toFixed(3)})`);
    auraGrad.addColorStop(0.45, `rgba(88, 186, 255, ${(0.22 * shade).toFixed(3)})`);
    auraGrad.addColorStop(1.0, 'rgba(56, 139, 253, 0.0)');
    fpCtx.fillStyle = auraGrad;
    fpCtx.beginPath();
    fpCtx.arc(centerFloorPt.sx, centerFloorPt.sy, auraRadius, 0, Math.PI * 2);
    fpCtx.fill();
  }

  // Função auxiliar que calcula a posição 3D da faísca i na altura 'p' [0..1] com trajetória em ziguezague suave
  function getSparkWorldPos(i, p) {
    const baseOffset = ((i * 7 + 3) % 11) / 10 - 0.5; // [-0.5 .. +0.5]
    // Onda triangular suavizada (ziguezague de ~2.5 voltas conforme a faísca sobe no ar)
    const zzAngle = p * Math.PI * 5.0 + i * 1.85;
    const triWave = (2 / Math.PI) * Math.asin(Math.sin(zzAngle));
    const smoothZigZag = 0.72 * triWave + 0.28 * Math.sin(zzAngle);
    const zzAmp = (0.30 + 0.70 * p) * 0.24 * spanX;
    const wx = rx + baseOffset * spanX * 0.68 + smoothZigZag * zzAmp;
    const wz = zMid + Math.cos(p * Math.PI * 2.5 + i * 1.4) * (z1 - z0) * 0.30;
    const wy = (yFloor - 0.012) - p * 0.25;
    return { wx, wy, wz };
  }

  // 2. Faíscas mágicas em azul e branco subindo lentamente em ziguezague pelo ar
  const sparkCount = 10;
  for (let i = 0; i < sparkCount; i++) {
    const speedMult = 0.85 + (i % 3) * 0.14;
    const phase = (tSlow * speedMult + i * (1 / sparkCount)) % 1;

    const pos = getSparkWorldPos(i, phase);
    const pt = projectPoint(pos.wx, pos.wy, pos.wz, W, H);

    // Fade-in suave na base e fade-out lento e etéreo no topo
    const lifeAlpha = phase < 0.22
      ? (phase / 0.22)
      : Math.pow(1 - (phase - 0.22) / 0.78, 1.15);
    const twinkle = 0.76 + 0.24 * Math.sin(nowMs * 0.0022 + i * 2.1);
    const alpha = Math.max(0.06, Math.min(1, lifeAlpha * twinkle * Math.min(1, shade * 1.25)));

    const scale = Math.max(1.1, (3.5 / Math.max(0.52, pos.wz)) * (1 - phase * 0.32));
    const isWhiteCore = (i % 2 === 0);

    // Rastro sutil logo abaixo na trajetória de ziguezague para reforçar a sensação de movimento flutuante
    if (phase > 0.05) {
      const trailPos = getSparkWorldPos(i, Math.max(0, phase - 0.045));
      const trailPt = projectPoint(trailPos.wx, trailPos.wy, trailPos.wz, W, H);
      const trailSize = Math.max(1.0, scale * 0.68);
      fpCtx.fillStyle = `rgba(88, 196, 255, ${(alpha * 0.38).toFixed(3)})`;
      fpCtx.fillRect(trailPt.sx - trailSize * 0.5, trailPt.sy - trailSize * 0.5, trailSize, trailSize);
    }

    // Halo azul brilhante da faísca
    fpCtx.fillStyle = isWhiteCore
      ? `rgba(88, 196, 255, ${(alpha * 0.85).toFixed(3)})`
      : `rgba(56, 152, 255, ${(alpha * 0.92).toFixed(3)})`;
    const arm = Math.max(1.5, scale * 1.45);
    const thick = Math.max(1.0, scale * 0.52);
    fpCtx.fillRect(pt.sx - arm, pt.sy - thick * 0.5, arm * 2, thick);
    fpCtx.fillRect(pt.sx - thick * 0.5, pt.sy - arm, thick, arm * 2);

    // Núcleo branco cintilante no centro da faísca
    fpCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    const core = Math.max(1.1, scale * 0.82);
    fpCtx.fillRect(pt.sx - core * 0.5, pt.sy - core * 0.5, core, core);
  }

  fpCtx.restore();
}
