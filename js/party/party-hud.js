/**
 * js/party/party-hud.js
 * HUD da equipe: 4 slots em 2 × 2 (linha de cima = frente, linha de baixo = trás).
 * Cada slot mostra rosto, nome, barras de Vida e Fadiga (atual / máximo) e as duas mãos.
 * Todo texto é inserido com textContent (nunca innerHTML), pois nomes poderão vir de fontes externas (NFTs).
 * Mão livre mostra a silhueta de uma mão; arma de duas mãos ocupa um slot largo (as duas mãos).
 * Clicar no rosto seleciona o personagem (borda branca); duplo clique (ou Shift+Enter) abre a ficha, que ocupa o lugar
 * dos 4 slots até ser fechada (miniatura do rosto, X ou Esc); segurar e arrastar o rosto até outro slot troca os dois de lugar
 * (não vale em batalha). Botão direito numa mão com item guarda o item na bolsa
 * (o clique normal da mão fica reservado para a ação do item no combate, ainda não implementada). Depende de PartyState e ItemCatalog.
 */
const PartyHud = (function () {
  const ROW_LABELS = ['Frente', 'Trás'];
  const HAND_LABELS = { right: 'D', left: 'E' };
  const HAND_NAMES = { right: 'Mão direita', left: 'Mão esquerda' };

  let root = null;
  let titleEl = null;
  let escBound = false;
  let drag = null;            // arrasto em andamento: { index, startX, startY, active, ghost, src }
  let justDragged = false;    // o fim de um arrasto não conta como clique de seleção
  const DRAG_THRESHOLD = 6;   // pixels de movimento para começar a arrastar

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  function buildPortrait(name, src) {
    const wrap = el('div', 'party-portrait');
    const img = el('img', 'party-portrait-img');
    img.alt = name;
    img.addEventListener('error', () => {
      clear(wrap);
      wrap.appendChild(el('div', 'party-portrait-fallback', initials(name)));
    });
    img.src = src;
    wrap.appendChild(img);
    return wrap;
  }

  function buildBar(kind, label, current, max) {
    const group = el('div', 'party-bar');
    const head = el('div', 'party-bar-head');
    head.appendChild(el('span', 'party-bar-label party-bar-label-' + kind, label));
    head.appendChild(el('span', 'party-bar-numbers', current + ' / ' + max));
    const track = el('div', 'party-bar-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(max));
    track.setAttribute('aria-valuenow', String(current));
    const fill = el('div', 'party-bar-fill party-bar-fill-' + kind);
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    fill.style.width = pct.toFixed(1) + '%';
    track.appendChild(fill);
    group.appendChild(head);
    group.appendChild(track);
    return group;
  }

  // Ícone de um item (pixel art em assets/items). Se a imagem falhar, mostra as 3 primeiras letras do nome.
  function buildItemIcon(item) {
    const img = el('img', 'party-hand-icon');
    img.alt = item.name;
    img.addEventListener('error', () => {
      const fallback = el('span', 'party-hand-fallback', item.name.slice(0, 3).toUpperCase());
      if (img.parent) {
        img.parent.appendChild(fallback);
        img.parent.removeChild(img);
      }
    });
    img.src = item.icon;
    return img;
  }

  function toast(message, kind) {
    if (typeof showToast === 'function') showToast(message, kind);
  }

  // Botão direito numa mão com item: guarda o item na bolsa do personagem.
  function stowFromHand(memberIndex, handId, item) {
    const member = PartyState.getMember(memberIndex);
    if (!member || typeof PartyInventory === 'undefined') return;
    const name = member.character.identity.name;
    const result = PartyInventory.unequip(memberIndex, handId);
    if (result.ok) toast(name + ' guardou ' + item.name + ' na bolsa.', 'info');
    else if (result.reason === 'bag_full') toast('A bolsa de ' + name + ' está cheia: não há espaço para guardar ' + item.name + '.', 'warn');
  }
  function onRightClick(node, memberIndex, handId, item) {
    node.addEventListener('contextmenu', ev => {
      if (ev && ev.preventDefault) ev.preventDefault();
      stowFromHand(memberIndex, handId, item);
    });
  }

  // Mão: o item segurado ou, se estiver livre, a silhueta da mão correspondente (direita ou esquerda).
  function buildHand(memberIndex, handId, itemId) {
    const item = ItemCatalog.resolve(itemId);
    const hand = el('div', 'party-hand' + (item ? ' filled' : ''));
    hand.setAttribute('data-hand', handId);
    hand.appendChild(el('span', 'party-hand-label', HAND_LABELS[handId]));
    if (item) {
      hand.appendChild(buildItemIcon(item));
      hand.setAttribute('title', HAND_NAMES[handId] + ': ' + item.name + ' (botão direito: guardar na bolsa)');
      onRightClick(hand, memberIndex, handId, item);
    } else {
      const sil = el('img', 'party-hand-empty');
      sil.alt = '';
      sil.src = 'assets/ui/hand_' + handId + '.png';
      hand.appendChild(sil);
      hand.setAttribute('title', HAND_NAMES[handId] + ': livre');
    }
    return hand;
  }

  // Arma de duas mãos: um único slot largo que ocupa as duas mãos.
  function buildTwoHandedSlot(memberIndex, item) {
    const hand = el('div', 'party-hand filled two-handed');
    hand.setAttribute('data-hand', 'both');
    hand.appendChild(el('span', 'party-hand-label', 'D + E'));
    hand.appendChild(el('span', 'party-hand-badge', '2 mãos'));
    hand.appendChild(buildItemIcon(item));
    hand.setAttribute('title', 'Duas mãos: ' + item.name + ' (botão direito: guardar na bolsa)');
    onRightClick(hand, memberIndex, 'right', item);
    return hand;
  }

  function setClass(node, cls, on) {
    const parts = node.className.split(' ').filter(c => c && c !== cls);
    node.className = parts.concat(on ? [cls] : []).join(' ');
  }
  function slotNodes() {
    return Array.from(root.children).filter(n => n.className.split(' ').includes('party-slot'));
  }
  function slotIndexAt(x, y) {
    for (const node of slotNodes()) {
      const r = node.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return Number(node.getAttribute('data-index'));
    }
    return null;
  }
  function highlightDrop(index) {
    for (const node of slotNodes()) {
      const i = Number(node.getAttribute('data-index'));
      setClass(node, 'drop-target', index !== null && i === index && i !== drag.index);
    }
  }

  // Arrastar o rosto até outro slot troca os dois personagens de lugar (fora de batalha).
  function endDrag() {
    if (!drag) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', endDrag);
    if (drag.ghost && document.body) document.body.removeChild(drag.ghost);
    if (root) {
      for (const node of slotNodes()) {
        setClass(node, 'dragging', false);
        setClass(node, 'drop-target', false);
      }
    }
    drag = null;
  }
  function onPointerDown(ev, index, src) {
    if (drag || (ev.button !== undefined && ev.button !== 0)) return;
    drag = { index, startX: ev.clientX, startY: ev.clientY, active: false, ghost: null, src };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', endDrag);
  }
  function onPointerMove(ev) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < DRAG_THRESHOLD) return;
      if (!PartyState.canSwap()) {
        toast(PartyState.isBattle() ? 'Não é possível trocar de posição durante a batalha.' : 'Não é possível trocar de posição agora.', 'warn');
        endDrag();
        return;
      }
      drag.active = true;
      const ghost = el('img', 'party-drag-ghost');
      ghost.alt = '';
      ghost.src = drag.src;
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      const source = slotNodes().find(n => Number(n.getAttribute('data-index')) === drag.index);
      if (source) setClass(source, 'dragging', true);
    }
    drag.ghost.style.left = (ev.clientX - 28) + 'px';
    drag.ghost.style.top = (ev.clientY - 28) + 'px';
    highlightDrop(slotIndexAt(ev.clientX, ev.clientY));
  }
  function onPointerUp(ev) {
    if (!drag) return;
    const d = drag;
    const target = d.active ? slotIndexAt(ev.clientX, ev.clientY) : null;
    endDrag();
    if (!d.active) return;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    if (target === null || target === d.index) return;
    const a = PartyState.getMember(d.index);
    const b = PartyState.getMember(target);
    if (!a || !b) return;
    const names = a.character.identity.name + ' e ' + b.character.identity.name;
    if (PartyState.swap(d.index, target)) toast(names + ' trocaram de lugar.', 'info');
  }

  function buildSlot(index, member) {
    const ch = member.character;
    const d = member.derived;
    const selected = PartyState.getSelectedIndex() === index;
    const slot = el('div', 'party-slot' + (selected ? ' selected' : ''));
    slot.setAttribute('data-index', String(index));

    // Rosto e nome: clicar (ou Enter/Espaço) seleciona o personagem.
    const top = el('div', 'party-slot-top');
    top.setAttribute('role', 'button');
    top.setAttribute('tabindex', '0');
    top.setAttribute('aria-label', 'Selecionar ' + ch.identity.name);
    top.setAttribute('aria-pressed', selected ? 'true' : 'false');
    top.setAttribute('title', 'Clique: selecionar · duplo clique: abrir a ficha · segurar e arrastar o rosto: trocar de lugar');
    top.addEventListener('click', () => { if (!justDragged) PartyState.select(index); });
    top.addEventListener('dblclick', () => PartyState.openSheet(index));
    top.addEventListener('keydown', ev => {
      if (ev && (ev.key === 'Enter' || ev.key === ' ')) {
        if (ev.preventDefault) ev.preventDefault();
        if (ev.shiftKey) PartyState.openSheet(index);
        else PartyState.select(index);
      }
    });
    const portrait = buildPortrait(ch.identity.name, ch.identity.portrait);
    portrait.addEventListener('pointerdown', ev => onPointerDown(ev, index, ch.identity.portrait));
    top.appendChild(portrait);
    const info = el('div', 'party-info');
    info.appendChild(el('div', 'party-name', ch.identity.name));
    const cls = el('div', 'party-class', d.className + ' · Nv ' + d.level);
    cls.setAttribute('title', d.raceName + ' · ' + d.className + ' · nível ' + d.level);
    info.appendChild(cls);
    top.appendChild(info);
    slot.appendChild(top);

    const bars = el('div', 'party-bars');
    bars.appendChild(buildBar('hp', 'Vida', ch.progress.hp, d.maxHp));
    bars.appendChild(buildBar('fp', 'Fadiga', ch.progress.fp, d.maxFp));
    slot.appendChild(bars);

    const hands = el('div', 'party-hands');
    const rightItem = ItemCatalog.resolve(ch.progress.hands.right);
    const leftItem = ItemCatalog.resolve(ch.progress.hands.left);
    if (rightItem && rightItem.twoHanded && !leftItem) {
      hands.appendChild(buildTwoHandedSlot(index, rightItem));
    } else {
      hands.appendChild(buildHand(index, 'right', ch.progress.hands.right));
      hands.appendChild(buildHand(index, 'left', ch.progress.hands.left));
    }
    slot.appendChild(hands);
    return slot;
  }

  // Só alterna a borda branca do selecionado; não recria os slots (importante para o duplo clique futuro).
  function updateSelection() {
    if (!root) return;
    const selectedIndex = PartyState.getSelectedIndex();
    for (const slot of root.children) {
      if (!slot.className.split(' ').includes('party-slot')) continue;
      const isSelected = slot.getAttribute('data-index') === String(selectedIndex);
      const base = slot.className.split(' ').filter(c => c && c !== 'selected');
      slot.className = base.concat(isSelected ? ['selected'] : []).join(' ');
      const top = slot.firstChild;
      if (top) top.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
  }

  function render() {
    if (!root) return;
    clear(root);
    const sheetIndex = PartyState.getSheetIndex();
    if (titleEl) titleEl.textContent = sheetIndex === null ? 'Equipe' : 'Ficha do personagem';
    setClass(root, 'sheet-open', sheetIndex !== null);
    const status = PartyState.getStatus();
    if (status === 'loading' || status === 'idle') {
      root.appendChild(el('div', 'party-message', 'Carregando a equipe…'));
      return;
    }
    if (status === 'error') {
      root.appendChild(el('div', 'party-message party-message-error', 'Não foi possível carregar a equipe. ' + PartyState.getError()));
      return;
    }
    const members = PartyState.getMembers();
    if (sheetIndex !== null && members[sheetIndex]) {
      root.appendChild(CharacterSheet.build(members[sheetIndex], () => PartyState.closeSheet()));
      return;
    }
    for (let row = 0; row < 2; row++) {
      root.appendChild(el('div', 'party-row-label', ROW_LABELS[row]));
      for (let col = 0; col < 2; col++) {
        const index = row * 2 + col;
        if (members[index]) root.appendChild(buildSlot(index, members[index]));
      }
    }
  }

  function init(rootElement, titleElement) {
    root = rootElement || document.getElementById('partyGrid');
    titleEl = titleElement || document.getElementById('partyTitle');
    if (!escBound && document.addEventListener) {
      escBound = true;
      document.addEventListener('keydown', ev => { if (ev && ev.key === 'Escape') PartyState.closeSheet(); });
    }
    if (!root) return false;
    PartyState.onChange(render);
    PartyState.onSelect(updateSelection);
    render();
    PartyState.init();
    return true;
  }

  return { init, render };
})();

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('partyGrid')) {
  PartyHud.init();
}
