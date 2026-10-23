/**
 * js/party/party-state.js
 * Estado da equipe do jogador: 4 posições (frente-esquerda, frente-direita, trás-esquerda, trás-direita).
 * Guarda, para cada posição, o personagem validado e os valores derivados (veja CharacterProviders.build).
 * A interface (PartyHud) apenas lê este estado e se atualiza quando ele muda (onChange).
 * Depende de CharacterProviders.
 */
const PartyState = (function () {
  const SLOT_COUNT = 4;
  const members = new Array(SLOT_COUNT).fill(null);
  const listeners = [];
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

  // Carrega a equipe inicial: por padrão, os 4 primeiros personagens predefinidos.
  async function init(ids) {
    status = 'loading';
    errorMessage = '';
    notify();
    try {
      const wanted = ids || (await CharacterProviders.preset.list()).slice(0, SLOT_COUNT);
      if (wanted.length !== SLOT_COUNT) throw new Error('A equipe precisa de ' + SLOT_COUNT + ' personagens.');
      const loaded = await Promise.all(wanted.map(id => CharacterProviders.preset.load(id)));
      for (let i = 0; i < SLOT_COUNT; i++) members[i] = loaded[i];
      status = 'ready';
    } catch (err) {
      status = 'error';
      errorMessage = err && err.message ? err.message : String(err);
    }
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

  // Ajusta Vida e Fadiga atuais de uma posição, sem passar dos limites (usado nos testes e, depois, no combate).
  function setVitals(index, hp, fp) {
    const m = members[index];
    if (!m) return false;
    if (Number.isInteger(hp)) m.character.progress.hp = Math.max(0, Math.min(hp, m.derived.maxHp));
    if (Number.isInteger(fp)) m.character.progress.fp = Math.max(0, Math.min(fp, m.derived.maxFp));
    notify();
    return true;
  }

  return { SLOT_COUNT, init, onChange, getMember, getMembers, getStatus, getError, setVitals };
})();
