/**
 * js/party/party-hud.js
 * HUD da equipe: 4 slots em 2 × 2 (linha de cima = frente, linha de baixo = trás).
 * Cada slot mostra rosto, nome, barras de Vida e Fadiga (atual / máximo) e as duas mãos.
 * Todo texto é inserido com textContent (nunca innerHTML), pois nomes poderão vir de fontes externas (NFTs).
 * Mão livre mostra a silhueta de uma mão; arma de duas mãos ocupa um slot largo (as duas mãos).
 * Clicar no rosto seleciona o personagem (borda branca). As mãos ainda não reagem a cliques. Depende de PartyState e ItemCatalog.
 */
const PartyHud = (function () {
  const ROW_LABELS = ['Frente', 'Trás'];
  const HAND_LABELS = { right: 'D', left: 'E' };
  const HAND_NAMES = { right: 'Mão direita', left: 'Mão esquerda' };

  let root = null;

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

  // Mão: o item segurado ou, se estiver livre, a silhueta da mão correspondente (direita ou esquerda).
  function buildHand(handId, itemId) {
    const item = itemId ? ItemCatalog.get(itemId) : null;
    const hand = el('div', 'party-hand' + (item ? ' filled' : ''));
    hand.setAttribute('data-hand', handId);
    hand.appendChild(el('span', 'party-hand-label', HAND_LABELS[handId]));
    if (item) {
      hand.appendChild(buildItemIcon(item));
      hand.setAttribute('title', HAND_NAMES[handId] + ': ' + item.name);
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
  function buildTwoHandedSlot(item) {
    const hand = el('div', 'party-hand filled two-handed');
    hand.setAttribute('data-hand', 'both');
    hand.appendChild(el('span', 'party-hand-label', 'D + E'));
    hand.appendChild(el('span', 'party-hand-badge', '2 mãos'));
    hand.appendChild(buildItemIcon(item));
    hand.setAttribute('title', 'Duas mãos: ' + item.name);
    return hand;
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
    top.setAttribute('title', 'Selecionar ' + ch.identity.name);
    top.addEventListener('click', () => PartyState.select(index));
    top.addEventListener('keydown', ev => {
      if (ev && (ev.key === 'Enter' || ev.key === ' ')) {
        if (ev.preventDefault) ev.preventDefault();
        PartyState.select(index);
      }
    });
    top.appendChild(buildPortrait(ch.identity.name, ch.identity.portrait));
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
    const rightItem = ch.progress.hands.right ? ItemCatalog.get(ch.progress.hands.right) : null;
    const leftItem = ch.progress.hands.left ? ItemCatalog.get(ch.progress.hands.left) : null;
    if (rightItem && rightItem.twoHanded && !leftItem) {
      hands.appendChild(buildTwoHandedSlot(rightItem));
    } else {
      hands.appendChild(buildHand('right', ch.progress.hands.right));
      hands.appendChild(buildHand('left', ch.progress.hands.left));
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
    for (let row = 0; row < 2; row++) {
      root.appendChild(el('div', 'party-row-label', ROW_LABELS[row]));
      for (let col = 0; col < 2; col++) {
        const index = row * 2 + col;
        if (members[index]) root.appendChild(buildSlot(index, members[index]));
      }
    }
  }

  function init(rootElement) {
    root = rootElement || document.getElementById('partyGrid');
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
