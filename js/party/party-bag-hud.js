/**
 * js/party/party-bag-hud.js
 * Janela de inventário: mostra a BOLSA do personagem selecionado (não existe inventário geral).
 * O título indica de quem é: "Inventário | Nome". Chaves, Mapa Encantado, moedas e armas aparecem como itens da bolsa.
 *  - Clicar no Mapa Encantado abre ou fecha o mapa.
 *  - Clicar numa arma ou escudo troca o que o personagem segura (o item da mão volta para a bolsa).
 * Todo texto é inserido com textContent (nunca innerHTML). Depende de PartyState, PartyInventory, ItemCatalog e CharacterSchema.
 */
const PartyBagHud = (function () {
  const SLOT_COUNT = CharacterSchema.INVENTORY_MAX;
  let grid = null;
  let countEl = null;
  let titleEl = null;

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function toast(message, kind) {
    if (typeof showToast === 'function') showToast(message, kind);
  }
  function mapOpen() {
    return typeof isEnchantedMapOpen !== 'undefined' && Boolean(isEnchantedMapOpen);
  }
  function mapBurning() {
    return typeof isMapBurning !== 'undefined' && Boolean(isMapBurning);
  }

  function failureMessage(reason) {
    if (reason === 'bag_full') return 'Não há espaço na bolsa para guardar o que o personagem segura agora.';
    if (reason === 'no_member') return 'Nenhum personagem selecionado.';
    return 'Não foi possível trocar o item.';
  }

  function equipFromBag(memberIndex, bagSlot, item) {
    const member = PartyState.getMember(memberIndex);
    if (!member) return;
    const result = PartyInventory.equip(memberIndex, bagSlot);
    if (result.ok) toast(member.character.identity.name + ' agora segura: ' + item.name + '.', 'info');
    else toast(failureMessage(result.reason), 'warn');
  }

  function buildItemSlot(index, ref, memberIndex) {
    const item = ItemCatalog.resolve(ref);
    const isCoin = item.type === 'coin';
    const isMap = item.type === 'map';
    const equippable = item.type === 'weapon' || item.type === 'shield';
    const count = (ref && typeof ref === 'object' && Number.isInteger(ref.count)) ? ref.count : 1;

    let cls = 'inv-slot filled filled-' + item.type;
    if (isMap && mapOpen()) cls += ' active-map-slot';
    if (isMap && mapBurning()) cls += ' burning-map-slot';
    if (isCoin && count >= item.maxStack) cls += ' at-max';
    if (equippable) cls += ' equippable';
    const slot = el('div', cls);

    let title = item.name;
    if (isMap) title += ' — clique para ' + (mapOpen() ? 'fechar o mapa' : 'abrir o mapa da masmorra');
    else if (isCoin) title += ': ' + count + ' (máximo ' + item.maxStack + ')';
    else if (equippable) title += ' — clique para segurar';
    slot.setAttribute('title', title);

    if (item.icon) {
      const pixel = item.icon.indexOf('/items/') !== -1 || item.icon.indexOf('/objects/') !== -1;
      const img = el('img', pixel ? 'pixel-icon' : '');
      img.alt = item.name;
      img.addEventListener('error', () => {
        if (!img.parent) return;
        const fallback = el('span', 'inv-slot-fallback', item.name.slice(0, 3).toUpperCase());
        img.parent.appendChild(fallback);
        img.parent.removeChild(img);
      });
      img.src = item.icon;
      slot.appendChild(img);
    }
    if (isMap && mapBurning()) slot.appendChild(el('div', 'map-fire-fx', '🔥'));
    if (isCoin) slot.appendChild(el('span', 'inv-slot-count', String(count)));
    slot.appendChild(el('span', 'inv-slot-index', String(index + 1)));

    if (isMap) slot.addEventListener('click', () => { if (typeof toggleEnchantedMapView === 'function') toggleEnchantedMapView(); });
    else if (equippable) slot.addEventListener('click', () => equipFromBag(memberIndex, index, item));
    return slot;
  }

  function buildEmptySlot(index) {
    const slot = el('div', 'inv-slot');
    slot.setAttribute('title', 'Slot vazio ' + (index + 1));
    slot.appendChild(el('span', 'inv-slot-index', String(index + 1)));
    return slot;
  }

  function render() {
    if (!grid) return;
    clear(grid);
    const memberIndex = PartyState.getSelectedIndex();
    const member = memberIndex === null ? null : PartyState.getMember(memberIndex);
    const bag = member ? member.character.progress.inventory : [];
    if (titleEl) titleEl.textContent = member ? 'Inventário | ' + member.character.identity.name : 'Inventário';
    if (countEl) countEl.textContent = bag.length + ' / ' + SLOT_COUNT;
    for (let i = 0; i < SLOT_COUNT; i++) {
      grid.appendChild(i < bag.length ? buildItemSlot(i, bag[i], memberIndex) : buildEmptySlot(i));
    }
  }

  function init(elements) {
    const e = elements || {};
    grid = e.grid || document.getElementById('playerInventoryGrid');
    countEl = e.count || document.getElementById('playerInvCount');
    titleEl = e.title || document.getElementById('playerInvTitle');
    if (!grid) return false;
    PartyState.onChange(render);
    PartyState.onSelect(render);
    render();
    return true;
  }

  return { init, render };
})();

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('playerInventoryGrid')) {
  PartyBagHud.init();
}
