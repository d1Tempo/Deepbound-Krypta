/**
 * tests/party-hud.test.js
 * Testes do HUD da equipe (PartyState + PartyHud) com um DOM simulado (sem navegador).
 * Rode com Node, dentro da pasta do projeto:   node tests/party-hud.test.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'js');
const files = ['items/item-catalog.js', 'items/equipment-rules.js', 'party/character-rules.js', 'party/character-schema.js',
  'party/character-presets.js', 'party/character-provider.js', 'party/party-state.js', 'party/party-inventory.js', 'party/character-sheet.js', 'party/party-hud.js'];

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
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, right: 0, bottom: 0 }; }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach(c => c.find(pred, out)); return out; }
}
const docListeners = {};
const document = {
  createElement: tag => new El(tag), getElementById: () => null, body: new El('body'),
  addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
  removeEventListener(t, fn) { docListeners[t] = (docListeners[t] || []).filter(f => f !== fn); }
};
function fireDoc(t, ev) { (docListeners[t] || []).slice().forEach(fn => fn(ev)); }
function docCount(t) { return (docListeners[t] || []).length; }
const toasts = [];
function showToast(msg, kind) { toasts.push({ msg, kind }); }
const player = { keys: { iron: false, gold: false }, hasEnchantedMap: false, coins: 0 };
`;
const source = domStub + files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') +
  '\nreturn { El, PartyState, PartyHud, CharacterProviders, toasts, document, fireDoc, docCount };';
const { El, PartyState, PartyHud, CharacterProviders, toasts, document, fireDoc, docCount } = new Function(source)();

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
  const titleEl = new El('div');
  titleEl.textContent = 'Equipe';
  check('init encontra a raiz', PartyHud.init(rootEl, titleEl) === true);
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
  check('título explica as duas mãos', durganHands[0].attrs.title === 'Duas mãos: Montante (botão direito: guardar na bolsa)', durganHands[0].attrs.title);
  const helgaHands = byClass(slots[1], 'party-hand');
  eq('Helga: ícones da maça e do escudo', helgaHands.map(h => byClass(h, 'party-hand-icon')[0].src), ['assets/items/mace.png', 'assets/items/shield.png']);
  check('título da mão traz o nome do item e a dica', helgaHands[1].attrs.title === 'Mão esquerda: Escudo (botão direito: guardar na bolsa)', helgaHands[1].attrs.title);
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

  // Botão direito numa mão com item: guarda o item na bolsa
  const rc = (hand) => { let prevented = false; hand.fire('contextmenu', { preventDefault() { prevented = true; } }); return prevented; };
  const handsOf = i => byClass(byClass(rootEl, 'party-slot')[i], 'party-hand');
  const bagOf = i => PartyState.getMember(i).character.progress.inventory;
  toasts.length = 0;
  check('mão livre não tem menu de botão direito', handsOf(3)[1].listeners.contextmenu === undefined);
  const shieldHand = handsOf(1)[1];
  eq('botão direito no escudo da Helga: o menu do navegador é bloqueado', rc(shieldHand), true);
  eq('o escudo sai da mão e vai para a bolsa', [PartyState.getMember(1).character.progress.hands.left, bagOf(1)], [null, ['potion_healing', 'shield']]);
  eq('aviso de quem guardou o quê', toasts[0], { msg: 'Helga Forjaluz guardou Escudo na bolsa.', kind: 'info' });
  eq('a mão esquerda passa a mostrar a silhueta', byClass(handsOf(1)[1], 'party-hand-empty')[0].src, 'assets/ui/hand_left.png');
  eq('Classe de Armadura da Helga sem o escudo (brunea 14 + DES 0)', CharacterProviders.build(PartyState.getMember(1).character).derived.armorClass, 14);
  const gsHand = handsOf(0)[0];
  rc(gsHand);
  eq('botão direito no slot de duas mãos guarda o montante', [PartyState.getMember(0).character.progress.hands.right, bagOf(0)], [null, ['greatsword']]);
  eq('o slot largo some e voltam as duas mãos livres', [handsOf(0).length, handsOf(0).map(h => byClass(h, 'party-hand-empty').length)], [2, [1, 1]]);
  while (bagOf(2).length < 20) bagOf(2).push('dagger');
  PartyState.touch();
  toasts.length = 0;
  rc(handsOf(2)[0]);
  eq('bolsa cheia: avisa e o item continua na mão', [toasts[0] && toasts[0].kind, PartyState.getMember(2).character.progress.hands.right], ['warn', 'rapier']);
  check('o aviso da bolsa cheia cita o personagem e o item', toasts[0].msg === 'A bolsa de Sylvar Ventofino está cheia: não há espaço para guardar Rapieira.', toasts[0].msg);
  await PartyState.init();   // volta à equipe inicial para os testes seguintes

  // --- Arrastar o rosto para trocar de lugar
  const layout = () => byClass(rootEl, 'party-slot').forEach((n, i) => { const c = i % 2, r = Math.floor(i / 2); n.rect = { left: c * 100, top: r * 100, right: c * 100 + 90, bottom: r * 100 + 90 }; });
  const names = () => byClass(rootEl, 'party-name').map(n => n.textContent.split(' ')[0]);
  const faceOf = i => byClass(byClass(rootEl, 'party-slot')[i], 'party-portrait')[0];
  const down = (i, ev) => faceOf(i).fire('pointerdown', Object.assign({ button: 0, clientX: 150, clientY: 150 }, ev || {}));
  await PartyState.init();
  layout();
  eq('ordem inicial', names(), ['Durgan', 'Helga', 'Sylvar', 'Aelindra']);
  toasts.length = 0;
  down(3);
  eq('ao pressionar, só aguarda o movimento (ouvintes no documento)', [docCount('pointermove'), docCount('pointerup'), document.body.children.length], [1, 1, 0]);
  fireDoc('pointermove', { clientX: 152, clientY: 151 });
  eq('movimento pequeno não começa o arrasto', document.body.children.length, 0);
  fireDoc('pointermove', { clientX: 40, clientY: 40 });
  const ghost = document.body.children[0];
  eq('passando do limite, aparece o rosto que acompanha o ponteiro', [document.body.children.length, ghost.style.left, ghost.style.top, ghost.src], [1, '12px', '12px', 'assets/portraits/aelindra.png']);
  eq('o slot de origem fica esmaecido e o de destino é destacado', [byClass(rootEl, 'party-slot')[3].className.includes('dragging'), byClass(rootEl, 'party-slot')[0].className.includes('drop-target'), byClass(rootEl, 'party-slot')[3].className.includes('drop-target')], [true, true, false]);
  fireDoc('pointerup', { clientX: 40, clientY: 40 });
  eq('soltar sobre outro slot troca os dois de lugar', names(), ['Aelindra', 'Helga', 'Sylvar', 'Durgan']);
  eq('aviso da troca', toasts[0], { msg: 'Aelindra Lúmen e Durgan Pedraforte trocaram de lugar.', kind: 'info' });
  eq('o rosto e os ouvintes foram removidos', [document.body.children.length, docCount('pointermove'), docCount('pointerup'), docCount('pointercancel')], [0, 0, 0, 0]);
  eq('a seleção acompanha o personagem (Durgan agora na posição 3)', [PartyState.getSelectedIndex(), PartyState.getSelectedMember().character.identity.name], [3, 'Durgan Pedraforte']);
  eq('a borda branca mudou de posição', byClass(rootEl, 'party-slot').map(n => n.className.split(' ').includes('selected')), [false, false, false, true]);
  eq('a bolsa e a Classe de Armadura seguem o personagem (Durgan ainda tem o montante)', PartyState.getMember(3).character.progress.hands.right, 'greatsword');
  layout();
  byClass(byClass(rootEl, 'party-slot')[1], 'party-slot-top')[0].fire('click');
  eq('o clique logo depois do arrasto não seleciona', PartyState.getSelectedIndex(), 3);
  await new Promise(r => setTimeout(r, 15));
  byClass(byClass(rootEl, 'party-slot')[1], 'party-slot-top')[0].fire('click');
  eq('passado um instante, clicar volta a selecionar', PartyState.getSelectedIndex(), 1);

  // arrastos que não trocam nada
  layout();
  toasts.length = 0;
  down(2); fireDoc('pointermove', { clientX: 152, clientY: 152 }); fireDoc('pointerup', { clientX: 152, clientY: 152 });
  eq('apenas um clique: nada é arrastado nem trocado', [names(), document.body.children.length, docCount('pointermove')], [['Aelindra', 'Helga', 'Sylvar', 'Durgan'], 0, 0]);
  down(2); fireDoc('pointermove', { clientX: 600, clientY: 600 }); fireDoc('pointerup', { clientX: 600, clientY: 600 });
  eq('soltar fora dos slots não troca', [names(), document.body.children.length], [['Aelindra', 'Helga', 'Sylvar', 'Durgan'], 0]);
  down(2); fireDoc('pointermove', { clientX: 20, clientY: 130 }); fireDoc('pointermove', { clientX: 30, clientY: 140 }); fireDoc('pointerup', { clientX: 30, clientY: 140 });
  eq('soltar no próprio slot não troca', names(), ['Aelindra', 'Helga', 'Sylvar', 'Durgan']);
  down(2, { button: 2 });
  eq('botão direito não inicia arrasto', [docCount('pointermove'), docCount('pointerup')], [0, 0]);
  down(2); fireDoc('pointermove', { clientX: 40, clientY: 40 }); fireDoc('pointercancel', {});
  eq('cancelar o arrasto limpa tudo e não troca', [names(), document.body.children.length, docCount('pointerup'), byClass(rootEl, 'party-slot').filter(n => n.className.includes('dragging')).length], [['Aelindra', 'Helga', 'Sylvar', 'Durgan'], 0, 0, 0]);
  PartyState.setBattle(true);
  toasts.length = 0;
  down(2); fireDoc('pointermove', { clientX: 40, clientY: 40 });
  eq('em batalha o arrasto é recusado com aviso', [document.body.children.length, docCount('pointerup'), toasts[0] && toasts[0].msg], [0, 0, 'Não é possível trocar de posição durante a batalha.']);
  eq('em batalha a troca direta também é recusada', [PartyState.canSwap(), PartyState.swap(0, 1), names()], [false, false, ['Aelindra', 'Helga', 'Sylvar', 'Durgan']]);
  PartyState.setBattle(false);
  const selEvents = [];
  PartyState.onSelect(() => selEvents.push(PartyState.getSelectedIndex()));
  PartyState.select(0);
  eq('API de troca: posições inválidas', [PartyState.swap(1, 1), PartyState.swap(0, 9), PartyState.swap(-1, 2), PartyState.swap(1.5, 2), PartyState.swap('a', 2), PartyState.swap(null, 2)], [false, false, false, false, false, false]);
  eq('API de troca: válida (selecionado em 0 vai para 2)', [PartyState.swap(0, 2), PartyState.getSelectedIndex(), names()], [true, 2, ['Sylvar', 'Helga', 'Aelindra', 'Durgan']]);
  eq('a troca avisa a seleção só quando ela mudou de posição', selEvents, [0, 2]);
  PartyState.swap(1, 3);
  eq('trocar outros dois não mexe na seleção', [PartyState.getSelectedIndex(), selEvents.length], [2, 2]);
  await PartyState.init();
  await new Promise(r => setTimeout(r, 15));   // o aviso "acabou de arrastar" se desliga logo depois do arrasto

  // --- Ficha (duplo clique), no lugar dos 4 slots
  layout();
  const topOf = i => byClass(byClass(rootEl, 'party-slot')[i], 'party-slot-top')[0];
  topOf(2).fire('dblclick');
  eq('duplo clique abre a ficha e seleciona o personagem', [PartyState.getSheetIndex(), PartyState.getSelectedIndex()], [2, 2]);
  eq('a ficha ocupa o lugar dos 4 slots', [byClass(rootEl, 'party-slot').length, byClass(rootEl, 'sheet').length, rootEl.className.includes('sheet-open')], [0, 1, true]);
  eq('o título do painel muda', titleEl.textContent, 'Ficha do personagem');
  eq('a ficha é de quem recebeu o duplo clique', byClass(rootEl, 'sheet-name')[0].textContent, 'Sylvar Ventofino');
  eq('com a ficha aberta não se troca de lugar', [PartyState.canSwap(), PartyState.swap(0, 1)], [false, false]);
  byClass(rootEl, 'sheet-mini')[0].fire('click');
  eq('clicar na miniatura fecha a ficha e volta os 4 slots', [PartyState.getSheetIndex(), byClass(rootEl, 'party-slot').length, titleEl.textContent, rootEl.className.includes('sheet-open')], [null, 4, 'Equipe', false]);
  topOf(0).fire('dblclick');
  byClass(rootEl, 'sheet-close')[0].fire('click');
  eq('o X também fecha', [PartyState.getSheetIndex(), byClass(rootEl, 'party-slot').length], [null, 4]);
  topOf(1).fire('dblclick');
  fireDoc('keydown', { key: 'a' });
  check('outra tecla não fecha', PartyState.getSheetIndex() === 1);
  fireDoc('keydown', { key: 'Escape' });
  eq('Esc fecha a ficha', [PartyState.getSheetIndex(), byClass(rootEl, 'party-slot').length], [null, 4]);
  topOf(3).fire('keydown', { key: 'Enter', shiftKey: true, preventDefault() {} });
  eq('Shift+Enter abre a ficha pelo teclado', PartyState.getSheetIndex(), 3);
  PartyState.closeSheet();
  topOf(2).fire('keydown', { key: 'Enter', shiftKey: false, preventDefault() {} });
  eq('Enter sem Shift só seleciona', [PartyState.getSheetIndex(), PartyState.getSelectedIndex()], [null, 2]);
  eq('fechar sem ficha aberta', PartyState.closeSheet(), false);
  eq('abrir ficha com posições inválidas', [-1, 4, 1.5, '1', null].map(v => PartyState.openSheet(v)), [false, false, false, false, false]);
  PartyState.openSheet(0);
  await PartyState.init();
  eq('recarregar a equipe fecha a ficha', [PartyState.getSheetIndex(), byClass(rootEl, 'party-slot').length], [null, 4]);

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
