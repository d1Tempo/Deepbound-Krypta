/**
 * js/player/movement.js
 * Movimentação em grade: andar, deslizar lateralmente e girar.
 */

function tryMoveTo(targetX, targetY) {
  // Qualquer movimento que não seja girar no próprio eixo fecha imediatamente o Mapa Encantado e retorna à visão da masmorra
  if (isEnchantedMapOpen) {
    closeEnchantedMapView(false);
  }

  if (isAnyDoorCell(targetX, targetY)) {
    const door = getDoor(targetX, targetY);
    if (door.type === TILE_ENTRANCE_DOOR) {
      showToast('A porta de entrada da masmorra está trancada por fora; não é possível voltar.', 'danger');
      return;
    }
    if (door.type === TILE_SPECIAL_DOOR && !door.open) {
      const hasIron = player.keys.iron || player.keysUsed.iron;
      const hasGold = player.keys.gold || player.keysUsed.gold;
      if (!hasIron || !hasGold) {
        showToast('A Porta Especial de saída está bloqueada! Encontre e use as chaves da masmorra primeiro.', 'warn');
      } else {
        showToast('A Porta Especial está fechada. Clique no mecanismo ao lado para avançar à próxima masmorra.', 'portal');
      }
      return;
    }
    if (!door.open) {
      if (door.isOneWay) {
        const f = DIRECTIONS[door.forwardDir];
        const isWrongSide = (player.x === door.x + f.dx && player.y === door.y + f.dy);
        if (isWrongSide) {
          showToast('Esta porta de via única está trancada por trás e não possui alavanca deste lado.', 'danger');
          return;
        }
      }
      if (door.lockType === 'iron' && !door.unlocked) {
        if (player.keys.iron) {
          showToast('A Porta de Ferro está trancada. Clique na fechadura na parede ao lado para usar sua Chave de Ferro.', 'info');
        } else {
          showToast('A Porta de Ferro está trancada. Encontre a Chave de Ferro em um beco sem saída.', 'info');
        }
        return;
      }
      if (door.lockType === 'gold' && !door.unlocked) {
        if (player.keys.gold) {
          showToast('A Porta de Ouro está trancada. Clique na fechadura na parede ao lado para usar sua Chave de Ouro.', 'warn');
        } else {
          showToast('A Porta de Ouro está trancada. Encontre a Chave de Ouro em um beco sem saída.', 'warn');
        }
        return;
      }
      if (door.isSecret) {
        showToast('Você bateu de frente com uma parede de pedra.', 'danger');
        return;
      }
      if (door.isRemote) {
        showToast('Esta porta está travada por um mecanismo remoto. Procure a alavanca em um beco sem saída.', 'info');
        return;
      }
      showToast('A porta está fechada. Clique na alavanca na parede ao lado para abri-la.', 'danger');
      return;
    }
  }

  if (!isBlockedForMove(targetX, targetY)) {
    const prevX = player.x;
    const prevY = player.y;

    player.x = targetX;
    player.y = targetY;
    player.steps++;

    if (isAnyDoorCell(prevX, prevY)) {
      const prevDoor = getDoor(prevX, prevY);
      if (prevDoor && prevDoor.isOneWay && prevDoor.open) {
        const f = DIRECTIONS[prevDoor.forwardDir];
        if (targetX === prevDoor.x + f.dx && targetY === prevDoor.y + f.dy) {
          prevDoor.open = false;
          showToast('Você atravessou a porta de via única e ela se trancou automaticamente atrás de você.', 'warn');
          startDoorAnimation();
        }
      }
    }

    checkKeyPickupAt(player.x, player.y);
    if (typeof floorCompositeCache !== "undefined") floorCompositeCache.clear();
    if (typeof ceilCompositeCache !== "undefined") ceilCompositeCache.clear();
    updateFogOfWar();
    updateAll();

    if (player.x === GOAL_POS.x && player.y === GOAL_POS.y) {
      const hasIron = player.keys.iron || player.keysUsed.iron;
      const hasGold = player.keys.gold || player.keysUsed.gold;
      if (hasIron && hasGold) {
        showToast('Você chegou diante da Porta Especial! Acione o mecanismo ao lado para avançar.', 'portal');
      } else {
        showToast('Você chegou à Porta Especial, mas ainda precisa encontrar a Chave de Ferro e a Chave de Ouro.', 'warn');
      }
    }
  } else {
    showToast('Você bateu de frente com uma parede de pedra.', 'danger');
  }
}

function moveForwardBackward(stepSign) {
  const d = DIRECTIONS[player.dir];
  tryMoveTo(player.x + d.dx * stepSign, player.y + d.dy * stepSign);
}

function moveStrafe(sideSign) {
  const d = DIRECTIONS[player.dir];
  const rightX = -d.dy;
  const rightY = d.dx;
  tryMoveTo(player.x + rightX * sideSign, player.y + rightY * sideSign);
}

function rotatePlayer(turnSign) {
  player.dir = (player.dir + turnSign + 4) % 4;
  updateFogOfWar();
  updateAll();
}
