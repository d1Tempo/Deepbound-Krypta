/**
 * js/main.js
 * Ponto de entrada: carrega a primeira masmorra e liga o loop leve de ambientação
 * (tochas balançando e faíscas do Mapa Encantado). É o ÚLTIMO script carregado.
 */

loadMap(1);

updateInventoryHUD();

// Loop leve de ambientação: anima suavemente as faíscas em ziguezague do Mapa Encantado
// e atualiza as tochas apenas quando o índice discreto de balanço (0..4, 100% em cache) muda!
let lastRenderedTorchSwayIdx = -1;

if (typeof window !== 'undefined' && typeof window.setInterval === 'function') {
  window.setInterval(() => {
    if (typeof isEnchantedMapOpen !== 'undefined' && isEnchantedMapOpen) return;
    if (typeof keysOnFloor === 'undefined' || typeof currentVisibleSet === 'undefined') return;

    const mapItem = keysOnFloor.find(k => k.type === 'map' && !k.collected);
    const mapVisible = Boolean(mapItem && currentVisibleSet.has(`${mapItem.x},${mapItem.y}`));

    const curTorchIdx = getGlobalTorchSwayIndex();
    const torchChanged = (curTorchIdx !== lastRenderedTorchSwayIdx);

    if (mapVisible || torchChanged) {
      lastRenderedTorchSwayIdx = curTorchIdx;
      renderFirstPerson();
    }
  }, 60);
}
