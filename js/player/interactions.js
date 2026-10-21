/**
 * js/player/interactions.js
 * Interações: coletar chaves/mapa, ativar botões e alavancas, animação de portas,
 * abrir/fechar a visão do Mapa Encantado.
 */

function isPlayerAdjacentToButton(btn) {
  return (player.x === btn.adjX && player.y === btn.adjY) ||
         (player.x === btn.altAdjX && player.y === btn.altAdjY);
}

function syncEnchantedMapModalDOM() {
  const overlay = document.getElementById('enchantedMapOverlay');
  if (overlay && overlay.classList) {
    overlay.classList.toggle('visible', Boolean(isEnchantedMapOpen));
  }
}

function toggleEnchantedMapView() {
  if (!player.hasEnchantedMap || isMapBurning) return;
  isEnchantedMapOpen = !isEnchantedMapOpen;
  syncEnchantedMapModalDOM();
  updateInventoryHUD();
  if (typeof renderMinimap === 'function') renderMinimap();
}

function closeEnchantedMapView(silent = false) {
  if (!isEnchantedMapOpen) return;
  isEnchantedMapOpen = false;
  syncEnchantedMapModalDOM();
  updateInventoryHUD();
  if (!silent && typeof renderFirstPerson === 'function') renderFirstPerson();
}

function collectKeyByClick(k) {
  if (!k || k.collected) return;
  k.collected = true;
  if (!playerInventoryItems.some(item => item.id === k.id)) {
    playerInventoryItems.push({
      id: k.id,
      type: k.type,
      name: k.name
    });
  }
  if (k.type === 'iron') {
    player.keys.iron = true;
    showToast('🗝️ Você pegou a Chave de Ferro do chão e a guardou no inventário.', 'info');
  } else if (k.type === 'gold') {
    player.keys.gold = true;
    showToast('🔑 Você pegou a Chave de Ouro do chão e a guardou no inventário.', 'warn');
  } else if (k.type === 'map') {
    player.hasEnchantedMap = true;
    revealHalfDungeonFromEnchantedMap();
    updateFogOfWar();
    showToast('📜 Você pegou o Mapa Encantado (com metade da masmorra desvendada)! Clique nele no inventário para abri-lo.', 'portal');
  }
  updateInventoryHUD();
}

function collectCoinByClick(c) {
  if (!c || c.collected) return;
  if (player.coins >= MAX_COINS) {
    showToast(`Sua bolsa está cheia: você não pode carregar mais de ${MAX_COINS} moedas.`, 'warn');
    return;
  }
  c.collected = true;
  player.coins = Math.min(MAX_COINS, player.coins + 1);
  showToast('🪙 Você pegou um Dobrão de Ouro do chão.', 'warn');
  updateInventoryHUD();
}

function checkKeyPickupAt(x, y) {
  for (const k of keysOnFloor) {
    if (!k.collected && k.x === x && k.y === y) {
      if (k.type === 'map') {
        showToast('O Mapa Encantado está no chão aos seus pés! Clique sobre o pergaminho para guardá-lo no inventário.', 'portal');
      } else {
        showToast(`A ${k.name} está caída no chão aos seus pés. Clique sobre a chave para pegá-la.`, 'info');
      }
    }
  }
}

function activateWallButton(btn, door) {
  if (!door) return;

  // Toca o clique mecânico com eco sempre que interagir com a parede
  if (typeof playLever === 'function') playLever();

  if (btn.isSpecial || door.type === TILE_SPECIAL_DOOR) {
    const hasIron = player.keys.iron || player.keysUsed.iron;
    const hasGold = player.keys.gold || player.keysUsed.gold;
    if (!hasIron || !hasGold) {
      const missing = [];
      if (!hasIron) missing.push('Chave de Ferro');
      if (!hasGold) missing.push('Chave de Ouro');
      showToast(`A Porta Especial continua trancada! Ainda falta encontrar: ${missing.join(' e ')}.`, 'warn');
      return;
    }

    door.open = true;
    // Toca som de pedra/ferro pesado ao abrir a saída
    if (typeof playDoorSound === 'function') playDoorSound('iron'); 
    
    closeEnchantedMapView(true);
    let transitionDelay = 320;
    if (player.hasEnchantedMap && playerInventoryItems.some(item => item.type === 'map')) {
      isMapBurning = true;
      updateInventoryHUD();
      showToast('🔥 O Mapa Encantado queimou espontaneamente em chamas ao final desta masmorra!', 'warn');
      transitionDelay = 880;
    } else {
      showToast(`Você acionou o mecanismo da Porta Especial e abriu passagem para o Mapa ${currentMapIndex + 1}!`, 'portal');
    }
    startDoorAnimation(() => {
      setTimeout(() => {
        loadMap(currentMapIndex + 1);
      }, transitionDelay);
    });
    return;
  }

  if (door.lockType === 'iron' && !door.unlocked && !player.keys.iron) {
    showToast('Você tentou destrancar a fechadura, mas ainda não possui a Chave de Ferro no inventário.', 'info');
    return;
  }
  if (door.lockType === 'gold' && !door.unlocked && !player.keys.gold) {
    showToast('Você tentou destrancar a fechadura, mas ainda não possui a Chave de Ouro no inventário.', 'warn');
    return;
  }

  if (door.open && player.x === door.x && player.y === door.y) {
    showToast('Saia do vão da porta antes de fechá-la!', 'info');
    return;
  }

  if (btn.isRemote) {
    door.unlocked = true;
    if (!door.open) {
      door.open = true;
      // Toca o som do material da porta remota abrindo à distância
      if (typeof playDoorSound === 'function') playDoorSound(door.visualStyle);
      showToast(
        'Você acionou a alavanca remota no beco e ouviu uma porta se destravar e abrir ao longe!',
        'success'
      );
      startDoorAnimation();
    } else {
      showToast(
        'Você tocou na alavanca remota, mas a porta correspondente já está aberta.',
        'info'
      );
    }
    return;
  }

  const wasLockedWithKey = Boolean(door.lockType && !door.unlocked);
  door.unlocked = true;
  door.open = !door.open;

  // Toca o ranger da porta ou deslizar da pedra secreta ao lado do jogador
  if (typeof playDoorSound === 'function') playDoorSound(door.visualStyle);

  if (wasLockedWithKey) {
    // Assim que o jogador usa a chave para abrir sua respectiva porta, a chave desaparece do inventário
    // (ficando encaixada na fechadura da porta aberta)
    if (door.lockType === 'iron') {
      player.keys.iron = false;
      player.keysUsed.iron = true;
      playerInventoryItems = playerInventoryItems.filter(item => item.type !== 'iron');
    } else if (door.lockType === 'gold') {
      player.keys.gold = false;
      player.keysUsed.gold = true;
      playerInventoryItems = playerInventoryItems.filter(item => item.type !== 'gold');
    }
    updateInventoryHUD();
  }

  if (door.isSecret) {
    if (door.open) {
      showToast('Você acionou a alavanca e ouviu pedras pesadas deslizando em alguma sala anterior!', 'portal');
    } else {
      showToast('Você acionou a alavanca novamente e ouviu a passagem secreta se fechar ao longe.', 'info');
    }
  } else if (door.lockType) {
    const kName = door.lockType === 'iron' ? 'Chave de Ferro' : 'Chave de Ouro';
    if (wasLockedWithKey) {
      showToast(`Você encaixou a ${kName} na fechadura, destrancou e abriu a porta!`, 'success');
    } else {
      showToast(`Você girou a ${kName} na fechadura e ${door.open ? 'abriu' : 'fechou'} a porta.`, 'success');
    }
  } else {
    showToast(
      door.open
        ? 'Você acionou a alavanca na parede e abriu a porta.'
        : 'Você acionou a alavanca na parede e fechou a porta.',
      door.open ? 'success' : 'info'
    );
  }

  startDoorAnimation();
}

function startDoorAnimation(onComplete = null) {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  function stepAnim() {
    let needsMore = false;
    for (const key in doors) {
      const d = doors[key];
      const target = d.open ? 1 : 0;
      if (Math.abs(d.anim - target) > 0.01) {
        d.anim += (target - d.anim) * 0.22;
        needsMore = true;
      } else {
        d.anim = target;
      }
    }
    if (typeof floorCompositeCache !== "undefined") floorCompositeCache.clear();
    if (typeof ceilCompositeCache !== "undefined") ceilCompositeCache.clear();
    updateFogOfWar();
    updateAll();
    if (needsMore) {
      animFrameId = requestAnimationFrame(stepAnim);
    } else {
      animFrameId = null;
      if (onComplete) onComplete();
    }
  }
  animFrameId = requestAnimationFrame(stepAnim);
}