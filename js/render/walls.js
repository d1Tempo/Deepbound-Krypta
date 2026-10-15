/**
 * js/render/walls.js
 * Desenho das paredes (frontais e laterais) e dos botões/alavancas fixados nelas.
 */

function drawPerspectiveSideWallTexture(ctx, texImg, pts, zNear, zFar, invertU = false) {
  const texW = texImg.naturalWidth || texImg.width || 160;
  const texH = texImg.naturalHeight || texImg.height || 160;
  const W = fpCanvas.width || 800;

  const xA = pts[0].sx;
  const xB = pts[1].sx;
  const totalSpanX = Math.abs(xB - xA);
  if (totalSpanX < 0.5) return;

  // Clipping exato no plano próximo (Z_CLIP = 0.38) quando zNear = 0 (rz = 0)
  // evita comprimir a textura inteira [0..1] em [0.38..1] e elimina a distorção em escadinha!
  const z0 = zNear ?? 0;
  const z1 = zFar ?? 1;
  const zStart = Math.max(Z_CLIP, z0);
  const uClip = (zStart - z0) / Math.max(0.001, z1 - z0);

  const dzA = Math.max(MIN_CLIP_Z, zStart - CAM_Z);
  const dzB = Math.max(MIN_CLIP_Z, z1 - CAM_Z);
  const invZA = 1 / dzA;
  const invZB = 1 / dzB;

  // Restringe a subdivisão de faixas exclusivamente à região visível na tela [-2, W + 2]
  // (em rz = 0, xA fica em -875px fora da tela; subdividir apenas a faixa visível mantém ~1.3px por faixa!)
  const dx = xB - xA;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) > 0.001) {
    const tLeft  = (-2 - xA) / dx;
    const tRight = ((W + 2) - xA) / dx;
    tMin = Math.max(0, Math.min(tLeft, tRight));
    tMax = Math.min(1, Math.max(tLeft, tRight));
  }
  if (tMax <= tMin) return;

  const visSpanX = totalSpanX * (tMax - tMin);
  const strips = Math.min(220, Math.max(16, Math.ceil(visSpanX / 1.3)));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  ctx.lineTo(pts[1].sx, pts[1].sy);
  ctx.lineTo(pts[2].sx, pts[2].sy);
  ctx.lineTo(pts[3].sx, pts[3].sy);
  ctx.closePath();
  ctx.clip();

  for (let s = 0; s < strips; s++) {
    const t0 = tMin + (tMax - tMin) * (s / strips);
    const t1 = tMin + (tMax - tMin) * ((s + 1) / strips);
    const tm = (t0 + t1) * 0.5;

    const sx0 = xA + dx * t0;
    const sx1 = xA + dx * t1;

    const syTop = pts[0].sy + (pts[1].sy - pts[0].sy) * tm;
    const syBot = pts[3].sy + (pts[2].sy - pts[3].sy) * tm;

    const denom0 = (1 - t0) * invZA + t0 * invZB;
    const denom1 = (1 - t1) * invZA + t1 * invZB;
    const sLocal0 = (t0 * invZB) / denom0;
    const sLocal1 = (t1 * invZB) / denom1;

    let u0 = uClip + (1 - uClip) * sLocal0;
    let u1 = uClip + (1 - uClip) * sLocal1;

    if (invertU) {
      u0 = 1 - u0;
      u1 = 1 - u1;
    }

    const uMin = Math.max(0, Math.min(u0, u1));
    const uMax = Math.min(1, Math.max(u0, u1));
    const srcX = Math.min(texW - 1, Math.floor(uMin * texW));
    const srcW = Math.max(1, Math.min(texW - srcX, Math.ceil((uMax - uMin) * texW)));

    const dstX = Math.min(sx0, sx1) - 0.45;
    const dstW = Math.abs(sx1 - sx0) + 1.0;
    const dstY = syTop - 0.5;
    const dstH = Math.max(1, (syBot - syTop) + 1.0);

    ctx.drawImage(texImg, srcX, 0, srcW, texH, dstX, dstY, dstW, dstH);
  }

  ctx.restore();
}

function drawWallFace(pts, depthZ, lateralDist, faceType, wx, wy, face, zNear, zFar, sideSign = 0) {
  const euclidDist = Math.sqrt(depthZ * depthZ + lateralDist * lateralDist * 0.45);
  const shade = Math.max(0.14, Math.min(1, 1.08 - euclidDist * 0.12));
  const sideMultiplier = faceType === 'front' ? 1.0 : 0.82;
  const bFactor = shade * sideMultiplier;

  const variant = (wx !== undefined && wy !== undefined && face !== undefined)
    ? getWallFaceVariant(wx, wy, face)
    : 'base';

  // Seleciona a textura correta conforme a orientação da parede em relação ao olhar do jogador:
  // - Parede frontal (sideSign === 0): usa textura ortogonal frontal (`torch`, `rune`)
  // - Parede lateral à esquerda da tela (sideSign === -1): usa `torch_side_left` / `rune_side_left` (projetando para a direita/corredor)
  // - Parede lateral à direita da tela (sideSign === +1): usa `torch_side_right` / `rune_side_right` (projetando para a esquerda/corredor)
  let texKey = variant;
  let invertU = false;
  if (faceType === 'side') {
    if (variant === 'torch') {
      texKey = sideSign < 0 ? 'torch_side_left' : 'torch_side_right';
      invertU = (sideSign > 0);
    } else if (variant === 'rune') {
      texKey = sideSign < 0 ? 'rune_side_left' : 'rune_side_right';
      invertU = (sideSign > 0);
    } else if (sideSign > 0) {
      invertU = true;
    }
  }

  const rawTexImg = WALL_TEXTURE_IMAGES[texKey] || WALL_TEXTURE_IMAGES[variant] || WALL_TEXTURE_IMAGES.base;
  const isRawReady = Boolean(
    rawTexImg &&
    rawTexImg.complete &&
    (rawTexImg.naturalWidth > 0 || rawTexImg.width > 0)
  );
  const texImg = (variant === 'torch' && isRawReady)
    ? getTorchSwayFrame(texKey, rawTexImg, getGlobalTorchSwayIndex())
    : rawTexImg;
  const hasTexture = Boolean(
    renderMode !== 'wireframe' &&
    isRawReady &&
    texImg &&
    (texImg.naturalWidth > 0 || texImg.width > 0)
  );

  if (renderMode === 'wireframe') {
    const alpha = Math.max(0.25, shade);
    const strokeStyle = faceType === 'front'
      ? `rgba(63, 185, 80, ${alpha})`
      : `rgba(88, 166, 255, ${alpha})`;
    drawQuad(fpCtx, pts, 'rgba(8, 13, 20, 0.95)', strokeStyle, 1.8);
  } else if (hasTexture) {
    if (faceType === 'front') {
      const minX = Math.min(pts[0].sx, pts[1].sx) - 0.45;
      const maxX = Math.max(pts[0].sx, pts[1].sx) + 0.45;
      const minY = Math.min(pts[0].sy, pts[3].sy) - 0.45;
      const maxY = Math.max(pts[0].sy, pts[3].sy) + 0.45;

      fpCtx.save();
      fpCtx.imageSmoothingEnabled = false;
      fpCtx.drawImage(texImg, minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
      fpCtx.restore();
    } else {
      drawPerspectiveSideWallTexture(fpCtx, texImg, pts, zNear, zFar, invertU);
    }

    // Matiz do tema e atenuação de profundidade 100% contínua entre blocos vizinhos (sem recorte de glow nas bordas!)
    const themeTint = `rgba(${currentTheme.wallR}, ${currentTheme.wallG}, ${currentTheme.wallB}, 0.10)`;
    drawQuad(fpCtx, pts, themeTint, null, 1);

    const darkAlpha = Math.max(0, Math.min(0.84, 1 - bFactor));
    const strokeStyle = renderMode === 'hybrid'
      ? `rgba(140, 200, 255, ${Math.max(0.16, shade * 0.44)})`
      : null;

    drawQuad(
      fpCtx,
      pts,
      darkAlpha > 0.01 ? `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})` : null,
      strokeStyle,
      1.1
    );
  } else {
    const r = Math.round(currentTheme.wallR * bFactor);
    const g = Math.round(currentTheme.wallG * bFactor);
    const b = Math.round(currentTheme.wallB * bFactor);
    const fillStyle = `rgb(${r}, ${g}, ${b})`;
    const strokeStyle = renderMode === 'hybrid'
      ? `rgba(140, 200, 255, ${Math.max(0.3, shade * 0.9)})`
      : null;
    drawQuad(fpCtx, pts, fillStyle, strokeStyle, 1.4);
  }

  interactiveHitboxes.push({
    id: `wall-${depthZ}-${lateralDist}`,
    type: 'wall',
    pts
  });

  if (renderMode === 'wireframe' && depthZ <= 4.5) {
    const inset = 0.12;
    const innerPts = pts.map((p, idx) => {
      const opp = pts[(idx + 2) % 4];
      return {
        sx: p.sx + (opp.sx - p.sx) * inset,
        sy: p.sy + (opp.sy - p.sy) * inset
      };
    });
    const detailAlpha = Math.max(0.08, shade * 0.28);
    drawQuad(fpCtx, innerPts, null, `rgba(63, 185, 80, ${detailAlpha})`, 0.9);
  }
}

function getButtonTextureKey(btn, door, sideSign = 0) {
  const requiresKey = Boolean(door.lockType === 'iron' || door.lockType === 'gold' || btn.isSpecial);
  if (requiresKey) {
    if (!door.open) return 'keyhole_empty';
    const orient = sideSign < 0 ? 'left' : (sideSign > 0 ? 'right' : 'front');
    return door.lockType === 'iron' ? `keyhole_iron_${orient}` : `keyhole_gold_${orient}`;
  }
  if (sideSign < 0) {
    return door.open ? 'lever_down_side_left' : 'lever_up_side_left';
  }
  if (sideSign > 0) {
    return door.open ? 'lever_down_side_right' : 'lever_up_side_right';
  }
  return door.open ? 'lever_down_front' : 'lever_up_front';
}

function drawButtonsOnWallFace(wx, wy, face, W, H) {
  const btns = getButtonsForWallFace(wx, wy, face);
  if (btns.length === 0) return;

  for (const btn of btns) {
    const door = doors[btn.doorKey];
    if (!door) continue;

    const yTop = -0.20;
    const yBot =  0.20;
    const platePts = [
      projectWorldPoint(btn.p0.wx, btn.p0.wy, yTop, W, H),
      projectWorldPoint(btn.p1.wx, btn.p1.wy, yTop, W, H),
      projectWorldPoint(btn.p1.wx, btn.p1.wy, yBot, W, H),
      projectWorldPoint(btn.p0.wx, btn.p0.wy, yBot, W, H)
    ];

    if (platePts[0].camZ <= MIN_CLIP_Z && platePts[1].camZ <= MIN_CLIP_Z) continue;

    const centerWorldX = (btn.p0.wx + btn.p1.wx) * 0.5;
    const centerWorldY = (btn.p0.wy + btn.p1.wy) * 0.5;
    const btnCenter = projectWorldPoint(centerWorldX, centerWorldY, 0, W, H);

    const c0 = { x: platePts[0].camX, z: platePts[0].camZ };
    const c1 = { x: platePts[1].camX, z: platePts[1].camZ };
    const avgZ = (c0.z + c1.z) * 0.5;
    const avgX = (c0.x + c1.x) * 0.5;
    const isSideWall = Math.abs(c0.z - c1.z) > 0.02;
    const sideSign = isSideWall ? (avgX < 0 ? -1 : 1) : 0;

    const isHovered = Boolean(hoveredHitbox && hoveredHitbox.id === btn.id);
    const btnTexKey = getButtonTextureKey(btn, door, sideSign);
    const btnImg = BUTTON_TEXTURE_IMAGES[btnTexKey];
    const hasBtnTex = Boolean(
      renderMode !== 'wireframe' &&
      btnImg && btnImg.complete && (btnImg.naturalWidth > 0 || btnImg.width > 0) &&
      btnScratchCtx
    );

    const euclidDist = Math.sqrt(avgZ * avgZ + avgX * avgX * 0.45);
    const shade = Math.max(0.14, Math.min(1, 1.08 - euclidDist * 0.12));
    const bFactor = shade * (isSideWall ? 0.82 : 1.0);

    if (hasBtnTex) {
      btnScratchCtx.save();
      btnScratchCtx.clearRect(0, 0, 96, 120);
      btnScratchCtx.imageSmoothingEnabled = false;
      btnScratchCtx.globalCompositeOperation = 'source-over';
      btnScratchCtx.drawImage(btnImg, 0, 0, 96, 120);

      btnScratchCtx.globalCompositeOperation = 'source-atop';
      if (isHovered) {
        btnScratchCtx.fillStyle = 'rgba(255, 225, 130, 0.22)';
        btnScratchCtx.fillRect(0, 0, 96, 120);
      }
      const darkAlpha = Math.max(0, Math.min(0.84, 1 - bFactor));
      if (darkAlpha > 0.01) {
        btnScratchCtx.fillStyle = `rgba(4, 7, 12, ${darkAlpha.toFixed(3)})`;
        btnScratchCtx.fillRect(0, 0, 96, 120);
      }
      btnScratchCtx.restore();

      if (!isSideWall) {
        const minX = Math.min(platePts[0].sx, platePts[1].sx);
        const maxX = Math.max(platePts[0].sx, platePts[1].sx);
        const minY = Math.min(platePts[0].sy, platePts[3].sy);
        const maxY = Math.max(platePts[0].sy, platePts[3].sy);
        fpCtx.save();
        fpCtx.imageSmoothingEnabled = false;
        fpCtx.drawImage(btnScratchCanvas, minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
        fpCtx.restore();
      } else {
        const ptNear = c0.z <= c1.z ? c0 : c1;
        const ptFar  = c0.z <= c1.z ? c1 : c0;
        const sideQuadPts = [
          projectPoint(ptNear.x, yTop, ptNear.z, W, H),
          projectPoint(ptFar.x,  yTop, ptFar.z,  W, H),
          projectPoint(ptFar.x,  yBot, ptFar.z,  W, H),
          projectPoint(ptNear.x, yBot, ptNear.z, W, H)
        ];
        drawPerspectiveSideWallTexture(fpCtx, btnScratchCanvas, sideQuadPts, ptNear.z, ptFar.z, sideSign > 0);
      }

      if (renderMode === 'hybrid' || (isHovered && guiMode === 'dev')) {
        drawQuad(
          fpCtx,
          platePts,
          null,
          isHovered ? 'rgba(255, 230, 150, 0.75)' : `rgba(140, 200, 255, ${Math.max(0.2, shade * 0.45)})`,
          isHovered ? 1.8 : 1.0
        );
      }
    } else {
      // Modo Wireframe ou fallback
      const strokeCol = (door.lockType || btn.isSpecial) ? '#f2cc60' : (door.open ? '#3fb950' : '#d29922');
      drawQuad(fpCtx, platePts, 'rgba(16, 22, 32, 0.90)', isHovered ? '#ffffff' : strokeCol, isHovered ? 2.2 : 1.5);
    }

    // Recorta o polígono de hitbox no plano próximo (Z_CLIP) para que alavancas laterais em rz=0 não invadam o chão
    let hitPts = platePts;
    let hitCenter = btnCenter;
    if (isSideWall) {
      const ptNear = c0.z <= c1.z ? c0 : c1;
      const ptFar  = c0.z <= c1.z ? c1 : c0;
      if (ptFar.z <= Z_CLIP) continue;
      const zNearClipped = Math.max(Z_CLIP, ptNear.z);
      hitPts = [
        projectPoint(ptNear.x, yTop, zNearClipped, W, H),
        projectPoint(ptFar.x,  yTop, ptFar.z,      W, H),
        projectPoint(ptFar.x,  yBot, ptFar.z,      W, H),
        projectPoint(ptNear.x, yBot, zNearClipped, W, H)
      ];
      hitCenter = projectPoint(ptNear.x, 0, (zNearClipped + ptFar.z) * 0.5, W, H);
    }

    const hitZ = Math.max(0.75, hitCenter.camZ);
    const hitRadius = Math.max(10, 18 / hitZ);

    interactiveHitboxes.push({
      id: btn.id,
      type: 'button',
      btnConfig: btn,
      door,
      pts: hitPts,
      center: hitCenter,
      hitRadius
    });
  }
}
