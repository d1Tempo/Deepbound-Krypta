/**
 * tests/party-hud.test.js
 * Testes do HUD da equipe (PartyState + PartyHud) com um DOM simulado (sem navegador).
 * Rode com Node, dentro da pasta do projeto:   node tests/party-hud.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/party-state.js', 'party/party-hud.js'];

// DOM mínimo: innerHTML é proibido (lança erro), pois o HUD deve usar apenas textContent.
const domStub = `
class El {
  constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this._text = ''; this.style = {}; this.attrs = {}; this.listeners = {}; this.parent = null; this.alt = ''; this.src = ''; }
  set innerHTML(v) { throw new Error('innerHTML é proibido no HUD'); }
  get innerHTML() { throw new Error('innerHTML é proibido no HUD'); }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parent = null; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  fire(t) { (this.listeners[t] || []).forEach(fn => fn()); }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach(c => c.find(pred, out)); return out; }
}
const document = { createElement: tag => new El(tag), getElementById: () => null };
`;
const source = domStub + files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') +
  '\nreturn { El, PartyState, PartyHud, CharacterProviders };';
const { El, PartyState, PartyHud } = new Function(source)();

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(name + (detail !== undefined ? ' -> ' + detail : ''));
}
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), 'obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b));
const byClass = (node, cls) => node.find(n => (' ' + n.className + ' ').includes(' ' + cls + ' '));

(async function () {
  const rootEl = new El('div');
  check('init encontra a raiz', PartyHud.init(rootEl) === true);
  check('estado inicial mostra "Carregando"', rootEl.textContent.includes('Carregando a equipe'));
  await new Promise(r => setTimeout(r, 30));

  eq('status pronto', PartyState.getStatus(), 'ready');
  const slots = byClass(rootEl, 'party-slot');
  eq('4 slots', slots.length, 4);
  eq('2 rótulos de fileira', byClass(rootEl, 'party-row-label').map(n => n.textContent), ['Frente', 'Trás']);
  eq('ordem: frente (rótulo, 2 slots), trás (rótulo, 2 slots)', rootEl.children.map(c => (c.className.includes('row-label') ? 'L' : 'S')).join(''), 'LSSLSS');
  eq('nomes dos 4 primeiros', byClass(rootEl, 'party-name').map(n => n.textContent),
    ['Durgan Pedraforte', 'Helga Forjaluz', 'Sylvar Ventofino', 'Aelindra Lúmen']);
  eq('classe e nível', byClass(slots[0], 'party-class')[0].textContent, 'Guerreiro · Nv 1');
  eq('Vida e Fadiga cheias (Durgan)', byClass(slots[0], 'party-bar-numbers').map(n => n.textContent), ['13 / 13', '15 / 15']);
  eq('barras cheias', byClass(slots[0], 'party-bar-fill').map(n => n.style.width), ['100.0%', '100.0%']);
  eq('Vida e Fadiga da maga', byClass(slots[3], 'party-bar-numbers').map(n => n.textContent), ['7 / 7', '13 / 13']);
  const track = byClass(slots[0], 'party-bar-track')[0];
  eq('barra acessível (progressbar)', [track.attrs.role, track.attrs['aria-valuenow'], track.attrs['aria-valuemax']], ['progressbar', '13', '13']);

  // Mãos: montante é de duas mãos (a mão esquerda aparece ocupada); clériga tem maça e escudo
  const durganHands = byClass(slots[0], 'party-hand');
  eq('Durgan: mão direita com item, esquerda ocupada pelo montante', [durganHands[0].className.includes('filled'), durganHands[1].className.includes('ghost')], [true, true]);
  check('mão ocupada explica o motivo', durganHands[1].attrs.title.includes('duas mãos'), durganHands[1].attrs.title);
  const helgaHands = byClass(slots[1], 'party-hand');
  eq('Helga: maça e escudo, nenhuma esmaecida', helgaHands.map(h => [h.className.includes('filled'), h.className.includes('ghost')]), [[true, false], [true, false]]);
  check('título da mão traz o nome do item', helgaHands[1].attrs.title === 'Mão esquerda: Escudo', helgaHands[1].attrs.title);
  const aelHands = byClass(slots[3], 'party-hand');
  eq('Aelindra: bordão (versátil, uma mão) e mão esquerda livre', [aelHands[0].className.includes('filled'), aelHands[1].className.includes('filled'), aelHands[1].className.includes('ghost')], [true, false, false]);
  check('mão livre informa "livre"', aelHands[1].attrs.title === 'Mão esquerda: livre', aelHands[1].attrs.title);

  // Atualização por mudança de estado
  PartyState.setVitals(0, 5, 10);
  const slots2 = byClass(rootEl, 'party-slot');
  eq('Vida e Fadiga atualizadas', byClass(slots2[0], 'party-bar-numbers').map(n => n.textContent), ['5 / 13', '10 / 15']);
  eq('largura da barra de Vida', byClass(slots2[0], 'party-bar-fill')[0].style.width, '38.5%');
  PartyState.setVitals(0, 999, -4);
  eq('limites respeitados (acima do máximo e abaixo de zero)', PartyState.getMember(0).character.progress.hp + '/' + PartyState.getMember(0).character.progress.fp, '13/0');
  eq('setVitals em posição vazia', PartyState.setVitals(9, 1, 1), false);

  // Segurança: o nome é inserido como texto; o HUD nunca usa innerHTML (o DOM simulado lançaria erro)
  PartyState.getMember(1).character.identity.name = '<img src=x onerror=alert(1)>';
  let threw = null;
  try { PartyHud.render(); } catch (e) { threw = e.message; }
  check('render com nome malicioso não usa innerHTML', threw === null, threw);
  const evil = byClass(rootEl, 'party-name')[1];
  eq('o nome malicioso aparece como texto puro, sem criar elementos', [evil.textContent, evil.children.length], ['<img src=x onerror=alert(1)>', 0]);

  // Retrato que falha ao carregar vira iniciais
  const portrait = byClass(rootEl, 'party-portrait')[0];
  const img = byClass(portrait, 'party-portrait-img')[0];
  check('retrato usa o caminho do personagem', img.src === 'assets/portraits/durgan.png', img.src);
  img.fire('error');
  eq('retrato com erro mostra as iniciais', byClass(portrait, 'party-portrait-fallback').map(n => n.textContent), ['DP']);

  // Estados de erro e de equipe incompleta
  await PartyState.init(['preset-guerreiro-anao-m']);
  eq('equipe incompleta é erro', PartyState.getStatus(), 'error');
  check('mensagem de erro aparece no HUD', rootEl.textContent.includes('Não foi possível carregar a equipe'), rootEl.textContent);
  await PartyState.init(['a', 'b', 'c', 'd']);
  eq('ids inexistentes são erro', PartyState.getStatus(), 'error');
  await PartyState.init(['preset-clerigo-anao-f', 'preset-patrulheiro-humano-f', 'preset-paladino-humano-m', 'preset-mago-elfo-f']);
  eq('equipe personalizada carrega', byClass(rootEl, 'party-name').map(n => n.textContent),
    ['Helga Forjaluz', 'Elara Bosquefundo', 'Cassian Valdoro', 'Aelindra Lúmen']);
  eq('init sem raiz devolve false', (function () { const old = PartyHud.init; return new Function('PartyHud', 'return PartyHud.init(null);')(PartyHud); })(), false);

  console.log('\nTestes do HUD aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
