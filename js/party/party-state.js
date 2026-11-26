/**
 * js/party/party-state.js
 * Estado da equipe do jogador: 4 posições (frente-esquerda, frente-direita, trás-esquerda, trás-direita).
 * Guarda, para cada posição, o personagem validado e os valores derivados (veja CharacterProviders.build).
 * A interface (PartyHud) apenas lê este estado e se atualiza quando ele muda (onChange) ou quando a seleção muda (onSelect).
 * Também controla a troca de lugar dos personagens (swap) e a ficha aberta (openSheet/closeSheet).
 * Personagem selecionado: o primeiro, ao carregar. Ele recebe o Mapa e as chaves encontrados e mostra a sua bolsa.
 * Depende de CharacterProviders.
 */
const PartyState = (function () {
  const SLOT_COUNT = 4;
  const members = new Array(SLOT_COUNT).fill(null);
  const listeners = [];
  const selectListeners = [];
  let sheetIndex = null;       // posição cuja ficha está aberta (null = painel com os 4 slots)
  let inBattle = false;        // em batalha, os personagens não trocam de lugar
  let selectedIndex = null;    // personagem selecionado (recebe o Mapa e as chaves, e mostra a sua bolsa)
  let status = 'idle';        // 'idle' | 'loading' | 'ready' | 'error'
  let errorMessage = '';

  function notify() {
    for (const fn of listeners.slice()) {
      try { fn(); } catch (err) { console.error('PartyState: erro em um ouvinte', err); }
    }
  }
  function onChange(fn) {
    listeners.push(fn);
  }
  function onSelect(fn) {
    selectListeners.push(fn);
  }
  function notifySelect() {
    for (const fn of selectListeners.slice()) {
      try { fn(); } catch (err) { console.error('PartyState: erro em um ouvinte de seleção', err); }
    }
  }

  // Carrega a equipe inicial: por padrão, os 4 primeiros personagens predefinidos.
  async function init(ids) {
    status = 'loading';
    errorMessage = '';
    sheetIndex = null;
    notify();
    try {
      const wanted = ids || (await CharacterProviders.preset.list()).slice(0, SLOT_COUNT);
      if (wanted.length !== SLOT_COUNT) throw new Error('A equipe precisa de ' + SLOT_COUNT + ' personagens.');
      const loaded = await Promise.all(wanted.map(id => CharacterProviders.preset.load(id)));
      for (let i = 0; i < SLOT_COUNT; i++) members[i] = loaded[i];
      selectedIndex = 0;
      status = 'ready';
    } catch (err) {
      status = 'error';
      members.fill(null);          // nada de equipe antiga em estado de erro
      selectedIndex = null;
      errorMessage = err && err.message ? err.message : String(err);
    }
    notify();
  }

  // Avisa a interface que os dados de um personagem mudaram (bolsa, mãos, Vida...).
  function touch() {
    notify();
  }

  function getMember(index) {
    return members[index] || null;
  }
  function getMembers() {
    return members.slice();
  }
  function getStatus() {
    return status;
  }
  function getError() {
    return errorMessage;
  }

  // Seleciona um personagem pela posição (0 a 3). Devolve true se a posição é válida; avisa os ouvintes só se a seleção mudou.
  function select(index) {
    if (status !== 'ready' || !Number.isInteger(index) || index < 0 || index >= SLOT_COUNT || !members[index]) return false;
    if (index !== selectedIndex) {
      selectedIndex = index;
      notifySelect();
    }
    return true;
  }
  // Troca dois personagens de lugar na formação. A seleção acompanha o personagem. Não vale em batalha nem com a ficha aberta.
  function canSwap() {
    return status === 'ready' && !inBattle && sheetIndex === null;
  }
  function swap(a, b) {
    if (!canSwap()) return false;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return false;
    if (a < 0 || b < 0 || a >= SLOT_COUNT || b >= SLOT_COUNT || !members[a] || !members[b]) return false;
    const tmp = members[a];
    members[a] = members[b];
    members[b] = tmp;
    const selectionMoved = selectedIndex === a || selectedIndex === b;
    if (selectedIndex === a) selectedIndex = b;
    else if (selectedIndex === b) selectedIndex = a;
    notify();
    if (selectionMoved) notifySelect();
    return true;
  }

  // Ficha do personagem: ocupa o lugar do painel da equipe até ser fechada.
  function openSheet(index) {
    if (status !== 'ready' || !Number.isInteger(index) || index < 0 || index >= SLOT_COUNT || !members[index]) return false;
    if (selectedIndex !== index) {
      selectedIndex = index;
      notifySelect();
    }
    sheetIndex = index;
    notify();
    return true;
  }
  function closeSheet() {
    if (sheetIndex === null) return false;
    sheetIndex = null;
    notify();
    return true;
  }
  function getSheetIndex() {
    return sheetIndex;
  }

  // O combate (etapa futura) liga e desliga este aviso.
  function setBattle(value) {
    inBattle = Boolean(value);
  }
  function isBattle() {
    return inBattle;
  }

  function getSelectedIndex() {
    return selectedIndex;
  }
  function getSelectedMember() {
    return selectedIndex === null ? null : members[selectedIndex];
  }

  // Ajusta Vida e Fadiga atuais de uma posição, sem passar dos limites (usado nos testes e, depois, no combate).
  function setVitals(index, hp, fp) {
    const m = members[index];
    if (!m) return false;
    if (Number.isInteger(hp)) m.character.progress.hp = Math.max(0, Math.min(hp, m.derived.maxHp));
    if (Number.isInteger(fp)) m.character.progress.fp = Math.max(0, Math.min(fp, m.derived.maxFp));
    notify();
    return true;
  }

  return { SLOT_COUNT, init, onChange, onSelect, touch, canSwap, swap, openSheet, closeSheet, getSheetIndex, setBattle, isBattle, select, getSelectedIndex, getSelectedMember, getMember, getMembers, getStatus, getError, setVitals };
})();
