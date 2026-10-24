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
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  fire(t, ev) { (this.listeners[t] || []).forEach(fn => fn(ev)); }
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

  // Mãos: montante (duas mãos) ocupa um slot largo; clériga tem maça e escudo; mão livre mostra a silhueta da mão
  const durganHands = byClass(slots[0], 'party-hand');
  eq('Durgan: um único slot largo para o montante', durganHands.length, 1);
  eq('Durgan: slot de duas mãos', [durganHands[0].className.includes('two-handed'), durganHands[0].attrs['data-hand']], [true, 'both']);
  eq('Durgan: ícone do montante e rótulo "2 mãos"', [byClass(durganHands[0], 'party-hand-icon')[0].src, byClass(durganHands[0], 'party-hand-badge')[0].textContent], ['assets/items/greatsword.png', '2 mãos']);
  check('título explica as duas mãos', durganHands[0].attrs.title === 'Duas mãos: Montante', durganHands[0].attrs.title);
  const helgaHands = byClass(slots[1], 'party-hand');
  eq('Helga: ícones da maça e do escudo', helgaHands.map(h => byClass(h, 'party-hand-icon')[0].src), ['assets/items/mace.png', 'assets/items/shield.png']);
  check('título da mão traz o nome do item', helgaHands[1].attrs.title === 'Mão esquerda: Escudo', helgaHands[1].attrs.title);
  const sylvarHands = byClass(slots[2], 'party-hand');
  eq('Sylvar: rapieira e adaga', sylvarHands.map(h => byClass(h, 'party-hand-icon')[0].src), ['assets/items/rapier.png', 'assets/items/dagger.png']);
  const aelHands = byClass(slots[3], 'party-hand');
  eq('Aelindra: bordão na mão direita', byClass(aelHands[0], 'party-hand-icon')[0].src, 'assets/items/quarterstaff.png');
  eq('Aelindra: mão esquerda livre mostra a silhueta da mão esquerda', [byClass(aelHands[1], 'party-hand-empty')[0].src, aelHands[1].className.includes('filled')], ['assets/ui/hand_left.png', false]);
  check('mão livre informa "livre"', aelHands[1].attrs.title === 'Mão esquerda: livre', aelHands[1].attrs.title);
  eq('nenhum slot de mão fica sem desenho', byClass(rootEl, 'party-hand').every(h => byClass(h, 'party-hand-icon').length + byClass(h, 'party-hand-empty').length === 1), true);
  PartyState.getMember(3).character.progress.hands.right = null;
  PartyHud.render();
  const aelHands2 = byClass(byClass(rootEl, 'party-slot')[3], 'party-hand');
  eq('mão direita livre mostra a silhueta da mão direita', byClass(aelHands2[0], 'party-hand-empty')[0].src, 'assets/ui/hand_right.png');
  PartyState.getMember(3).character.progress.hands.right = 'quarterstaff';
  PartyHud.render();
  const icon = byClass(byClass(byClass(rootEl, 'party-slot')[1], 'party-hand')[0], 'party-hand-icon')[0];
  icon.fire('error');
  eq('ícone que falha ao carregar mostra as 3 primeiras letras', byClass(byClass(byClass(rootEl, 'party-slot')[1], 'party-hand')[0], 'party-hand-fallback').map(n => n.textContent), ['MAÇ']);
  PartyHud.render();

  // Seleção: o primeiro personagem começa selecionado (borda branca); clicar ou usar Enter/Espaço no rosto seleciona
  const isSel = n => n.className.split(' ').includes('selected');
  const slotsNow = () => byClass(rootEl, 'party-slot');
  eq('começa com o primeiro selecionado', [PartyState.getSelectedIndex(), slotsNow().map(isSel)], [0, [true, false, false, false]]);
  eq('selecionado exposto pelo estado', PartyState.getSelectedMember().character.identity.name, 'Durgan Pedraforte');
  const before = slotsNow();
  let selectEvents = 0;
  PartyState.onSelect(() => { selectEvents++; });
  byClass(before[2], 'party-slot-top')[0].fire('click');
  eq('clicar no rosto seleciona o personagem', [PartyState.getSelectedIndex(), slotsNow().map(isSel)], [2, [false, false, true, false]]);
  check('selecionar não recria os slots (importante para o duplo clique)', slotsNow().every((n, i) => n === before[i]));
  eq('aria-pressed acompanha a seleção', slotsNow().map(n => byClass(n, 'party-slot-top')[0].attrs['aria-pressed']), ['false', 'false', 'true', 'false']);
  byClass(before[3], 'party-slot-top')[0].fire('keydown', { key: 'Enter', preventDefault() {} });
  eq('Enter seleciona', PartyState.getSelectedIndex(), 3);
  byClass(before[1], 'party-slot-top')[0].fire('keydown', { key: ' ', preventDefault() {} });
  eq('Espaço seleciona', PartyState.getSelectedIndex(), 1);
  byClass(before[0], 'party-slot-top')[0].fire('keydown', { key: 'a', preventDefault() {} });
  eq('outras teclas não selecionam', PartyState.getSelectedIndex(), 1);
  const countBefore = selectEvents;
  byClass(before[1], 'party-slot-top')[0].fire('click');
  eq('clicar no já selecionado não dispara aviso de mudança', selectEvents, countBefore);
  eq('posições inválidas são ignoradas', [-1, 4, 1.5, '1', null, undefined, NaN].map(v => PartyState.select(v)), [false, false, false, false, false, false, false]);
  eq('seleção continua a mesma após posições inválidas', PartyState.getSelectedIndex(), 1);
  eq('seleção sobrevive a uma nova renderização', [(PartyState.setVitals(0, 3, 3), PartyState.getSelectedIndex()), slotsNow().map(isSel)], [1, [false, true, false, false]]);
  eq('só um slot tem a borda branca', slotsNow().filter(isSel).length, 1);
  PartyState.select(0);

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
  eq('com erro, nada fica selecionado e selecionar falha', [PartyState.getSelectedIndex(), PartyState.getSelectedMember(), PartyState.select(0)], [null, null, false]);
  await PartyState.init(['preset-clerigo-anao-f', 'preset-patrulheiro-humano-f', 'preset-paladino-humano-m', 'preset-mago-elfo-f']);
  eq('equipe personalizada carrega', byClass(rootEl, 'party-name').map(n => n.textContent),
    ['Helga Forjaluz', 'Elara Bosquefundo', 'Cassian Valdoro', 'Aelindra Lúmen']);
  eq('ao recarregar a equipe, o primeiro volta a ser o selecionado', [PartyState.getSelectedIndex(), byClass(rootEl, 'party-slot').map(isSel)], [0, [true, false, false, false]]);
  eq('init sem raiz devolve false', (function () { const old = PartyHud.init; return new Function('PartyHud', 'return PartyHud.init(null);')(PartyHud); })(), false);

  console.log('\nTestes do HUD aprovados: ' + passed + ' | falhas: ' + failures.length);
  if (failures.length) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
})();
