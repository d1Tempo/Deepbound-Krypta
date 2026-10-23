/**
 * js/party/party-hud.js
 * HUD da equipe: 4 slots em 2 × 2 (linha de cima = frente, linha de baixo = trás).
 * Cada slot mostra rosto, nome, barras de Vida e Fadiga (atual / máximo) e as duas mãos.
 * Todo texto é inserido com textContent (nunca innerHTML), pois nomes poderão vir de fontes externas (NFTs).
 * Esta etapa é estática (sem cliques). Depende de PartyState e ItemCatalog.
 */
const PartyHud = (function () {
  const ROW_LABELS = ['Frente', 'Trás'];
  const HAND_LABELS = { right: 'D', left: 'E' };
  const HAND_NAMES = { right: 'Mão direita', left: 'Mão esquerda' };

  // Ícones provisórios (emoji) até existir arte própria dos itens.
  const ICONS = {
    dagger: '🗡️', rapier: '🗡️', shortsword: '🗡️', mace: '🔨', warhammer: '🔨', light_hammer: '🔨',
    handaxe: '🪓', battleaxe: '🪓', longbow: '🏹', shortbow: '🏹', light_crossbow: '🏹', hand_crossbow: '🏹',
    sling: '🏹', spear: '🔱', shield: '🛡️', potion_healing: '🧪'
  };

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
  function iconFor(item) {
    if (ICONS[item.id]) return ICONS[item.id];
    return item.type === 'weapon' ? '⚔️' : '❔';
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

  // Mão: mostra o item segurado; se a outra mão segura uma arma de duas mãos, esta aparece ocupada (esmaecida).
  function buildHand(handId, itemId, occupiedByTwoHanded) {
    const item = itemId ? ItemCatalog.get(itemId) : null;
    const hand = el('div', 'party-hand' + (item ? ' filled' : '') + (occupiedByTwoHanded ? ' ghost' : ''));
    hand.setAttribute('data-hand', handId);
    hand.appendChild(el('span', 'party-hand-label', HAND_LABELS[handId]));
    if (item) {
      hand.appendChild(el('span', 'party-hand-icon', iconFor(item)));
      hand.setAttribute('title', HAND_NAMES[handId] + ': ' + item.name);
    } else if (occupiedByTwoHanded) {
      hand.appendChild(el('span', 'party-hand-icon', iconFor(occupiedByTwoHanded)));
      hand.setAttribute('title', HAND_NAMES[handId] + ': ocupada pela arma de duas mãos (' + occupiedByTwoHanded.name + ')');
    } else {
      hand.setAttribute('title', HAND_NAMES[handId] + ': livre');
    }
    return hand;
  }

  function buildSlot(index, member) {
    const ch = member.character;
    const d = member.derived;
    const slot = el('div', 'party-slot');
    slot.setAttribute('data-index', String(index));

    const top = el('div', 'party-slot-top');
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
    const rightTwoHanded = rightItem && rightItem.twoHanded && !leftItem ? rightItem : null;
    hands.appendChild(buildHand('right', ch.progress.hands.right, null));
    hands.appendChild(buildHand('left', ch.progress.hands.left, rightTwoHanded));
    slot.appendChild(hands);
    return slot;
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
    render();
    PartyState.init();
    return true;
  }

  return { init, render };
})();

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('partyGrid')) {
  PartyHud.init();
}
