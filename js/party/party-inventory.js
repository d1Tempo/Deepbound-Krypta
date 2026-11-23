/**
 * js/party/party-inventory.js
 * Bolsas dos personagens (não existe inventário geral): cada personagem tem a sua bolsa de 20 slots
 * (progress.inventory), e a janela de inventário mostra a do personagem selecionado.
 * Regras de destino:
 *  - Mapa e chaves vão para a bolsa do personagem SELECIONADO (se estiver cheia, para o próximo da formação com espaço).
 *  - A primeira moeda segue a mesma regra; as moedas seguintes vão SEMPRE para quem já tem uma pilha de moedas.
 *  - Chaves e Mapa valem para a equipe inteira enquanto qualquer personagem os carregar; somem ao trocar de mapa.
 * Também troca o que o personagem segura: arma ou escudo da bolsa para a mão (o item antigo volta para a bolsa).
 * Mantém atualizados os campos antigos do jogo (player.keys, player.hasEnchantedMap, player.coins) em syncLegacy().
 * Depende de PartyState, ItemCatalog, EquipmentRules e CharacterSchema.
 */
const PartyInventory = (function () {
  const COIN_ID = 'gold_coin';
  const BAG_SIZE = CharacterSchema.INVENTORY_MAX;

  function refId(ref) {
    return typeof ref === 'string' ? ref : (ref && typeof ref === 'object' ? ref.id : null);
  }
  function bag(index) {
    const m = PartyState.getMember(index);
    return m ? m.character.progress.inventory : null;
  }
  function hasSpace(index, extra) {
    const b = bag(index);
    return b !== null && b.length + (extra === undefined ? 1 : extra) <= BAG_SIZE;
  }

  // Ordem de entrega: o selecionado primeiro; depois os outros, na ordem da formação, a partir do seguinte.
  function deliveryOrder() {
    const sel = PartyState.getSelectedIndex();
    if (sel === null) return [];
    const order = [];
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const idx = (sel + i) % PartyState.SLOT_COUNT;
      if (PartyState.getMember(idx)) order.push(idx);
    }
    return order;
  }

  function syncLegacy() {
    if (typeof player === 'undefined' || !player) return;
    if (player.keys) {
      player.keys.iron = has('key_iron');
      player.keys.gold = has('key_gold');
    }
    player.hasEnchantedMap = has('enchanted_map');
    player.coins = totalCoins();
  }
  function finish() {
    syncLegacy();
    PartyState.touch();
  }

  function count(itemId) {
    let n = 0;
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const b = bag(i);
      if (!b) continue;
      for (const ref of b) {
        if (refId(ref) !== itemId) continue;
        n += (ref && typeof ref === 'object' && Number.isInteger(ref.count)) ? ref.count : 1;
      }
    }
    return n;
  }
  function has(itemId) {
    return count(itemId) > 0;
  }
  function totalCoins() {
    return count(COIN_ID);
  }

  // Quem carrega a pilha de moedas (o "portador"), ou null se ninguém tem moedas.
  function coinHolder() {
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const b = bag(i);
      if (b && b.some(ref => refId(ref) === COIN_ID)) return i;
    }
    return null;
  }

  // Entrega um item comum (chave, Mapa, arma...) seguindo a ordem de entrega.
  function receive(ref) {
    const id = refId(ref);
    if (!ItemCatalog.has(id)) return { ok: false, reason: 'unknown_item' };
    if (ItemCatalog.get(id).stackable) return { ok: false, reason: 'use_receiveCoin' };
    if (deliveryOrder().length === 0) return { ok: false, reason: 'no_party' };
    for (const i of deliveryOrder()) {
      if (hasSpace(i)) {
        bag(i).push(ref);
        finish();
        return { ok: true, memberIndex: i };
      }
    }
    return { ok: false, reason: 'bags_full' };
  }

  // Entrega moedas: a pilha existente recebe todas; a primeira vai para o selecionado (ou o próximo com espaço).
  function receiveCoin(amount) {
    const n = amount === undefined ? 1 : amount;
    const coin = ItemCatalog.get(COIN_ID);
    if (!Number.isInteger(n) || n < 1) return { ok: false, reason: 'bad_amount' };
    const holder = coinHolder();
    if (holder !== null) {
      const b = bag(holder);
      const at = b.findIndex(ref => refId(ref) === COIN_ID);
      const current = (b[at] && typeof b[at] === 'object' && Number.isInteger(b[at].count)) ? b[at].count : 1;
      if (current + n > coin.maxStack) return { ok: false, reason: 'coin_limit' };
      b[at] = { id: COIN_ID, count: current + n };
      finish();
      return { ok: true, memberIndex: holder };
    }
    if (n > coin.maxStack) return { ok: false, reason: 'coin_limit' };
    if (deliveryOrder().length === 0) return { ok: false, reason: 'no_party' };
    for (const i of deliveryOrder()) {
      if (hasSpace(i)) {
        bag(i).push({ id: COIN_ID, count: n });
        finish();
        return { ok: true, memberIndex: i };
      }
    }
    return { ok: false, reason: 'bags_full' };
  }

  // Remove uma unidade de um item (por exemplo, a chave usada numa fechadura), de qualquer bolsa.
  function consume(itemId) {
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const b = bag(i);
      if (!b) continue;
      const at = b.findIndex(ref => refId(ref) === itemId);
      if (at === -1) continue;
      const ref = b[at];
      if (ref && typeof ref === 'object' && Number.isInteger(ref.count) && ref.count > 1) b[at] = { id: itemId, count: ref.count - 1 };
      else b.splice(at, 1);
      finish();
      return true;
    }
    return false;
  }

  // Ao trocar de mapa: chaves e Mapa Encantado somem de todas as bolsas; o resto fica.
  function clearMapBound() {
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const m = PartyState.getMember(i);
      if (!m) continue;
      m.character.progress.inventory = m.character.progress.inventory.filter(ref => {
        const item = ItemCatalog.resolve(ref);
        return !(item && item.mapBound);
      });
    }
    finish();
  }

  // Zera as moedas de todas as bolsas (ao gerar uma nova masmorra).
  function clearCoins() {
    for (let i = 0; i < PartyState.SLOT_COUNT; i++) {
      const m = PartyState.getMember(i);
      if (!m) continue;
      m.character.progress.inventory = m.character.progress.inventory.filter(ref => refId(ref) !== COIN_ID);
    }
    finish();
  }

  // Troca de equipamento: arma ou escudo da bolsa para a mão. O item que estava na mão volta para a bolsa.
  // Arma de duas mãos ocupa as duas mãos (proposta). Falta de espaço cancela tudo, sem alterar nada.
  function equip(memberIndex, bagSlot, handId) {
    const m = PartyState.getMember(memberIndex);
    if (!m) return { ok: false, reason: 'no_member' };
    const inv = m.character.progress.inventory;
    if (!Number.isInteger(bagSlot) || bagSlot < 0 || bagSlot >= inv.length) return { ok: false, reason: 'bad_slot' };
    const ref = inv[bagSlot];
    const item = ItemCatalog.resolve(ref);
    if (!item || (item.type !== 'weapon' && item.type !== 'shield')) return { ok: false, reason: 'not_equippable' };
    const target = handId || (item.type === 'shield' ? 'left' : 'right');
    if (!EquipmentRules.HAND_SLOTS.includes(target)) return { ok: false, reason: 'bad_hand' };

    const hands = m.character.progress.hands;
    const next = { right: hands.right, left: hands.left };
    const returned = [];
    const rightItem = ItemCatalog.resolve(hands.right);
    if (item.twoHanded) {
      for (const h of EquipmentRules.HAND_SLOTS) if (next[h] !== null) returned.push(next[h]);
      next.right = ref;
      next.left = null;
    } else {
      if (rightItem && rightItem.twoHanded) {
        returned.push(next.right);
        next.right = null;
        next.left = null;
      }
      if (next[target] !== null) returned.push(next[target]);
      next[target] = ref;
    }
    if (inv.length - 1 + returned.length > BAG_SIZE) return { ok: false, reason: 'bag_full' };

    if (returned.length > 0) {
      inv[bagSlot] = returned[0];
      for (let i = 1; i < returned.length; i++) inv.push(returned[i]);
    } else {
      inv.splice(bagSlot, 1);
    }
    hands.right = next.right;
    hands.left = next.left;
    finish();
    return { ok: true, replaced: returned.map(refId) };
  }

  // Guarda na bolsa o que está numa mão.
  function unequip(memberIndex, handId) {
    const m = PartyState.getMember(memberIndex);
    if (!m) return { ok: false, reason: 'no_member' };
    if (!EquipmentRules.HAND_SLOTS.includes(handId)) return { ok: false, reason: 'bad_hand' };
    const hands = m.character.progress.hands;
    if (hands[handId] === null) return { ok: false, reason: 'empty_hand' };
    if (!hasSpace(memberIndex)) return { ok: false, reason: 'bag_full' };
    m.character.progress.inventory.push(hands[handId]);
    hands[handId] = null;
    finish();
    return { ok: true };
  }

  return { BAG_SIZE, COIN_ID, receive, receiveCoin, consume, clearMapBound, clearCoins, equip, unequip,
    has, count, totalCoins, coinHolder, syncLegacy };
})();
