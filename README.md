# Deepbound Krypta

Dungeon crawler procedural em primeira pessoa (HTML + CSS + JavaScript puro, sem dependências).
O design do jogo está em [`docs/game_design_document.md`](docs/game_design_document.md).

## Como rodar

Abra o `index.html` no navegador (duplo clique). Não precisa instalar nada.

Quando o jogo passar a carregar arquivos de dados (`items.json`, `monsters.json`), o navegador
bloqueia isso em modo duplo clique. Nessa fase, rode um servidor local dentro da pasta do projeto:

```
python -m http.server 8000
```

e abra <http://localhost:8000>.

## Estrutura

```
index.html          Página (estrutura HTML e a lista de scripts, em ordem de carregamento)
css/style.css       Todo o visual da interface
assets/             Texturas PNG (walls, floors, ceilings, doors, buttons, keys, objects)
docs/               Documento de design
js/
  core/             Constantes, temas e variáveis globais do mapa; utilidades
  dungeon/          Geração procedural, portas/botões, variações de textura
  world/            Consultas do mapa (colisão, visão) e Fog of War
  player/           Estado, ficha do personagem, movimento, interações, teclado
  render/           Tudo que desenha no canvas (3D, piso/teto, paredes, portas, minimapa)
  ui/               HUD em HTML, bússola, avisos, modos de interface
  game.js           Carregar mapa, reiniciar, atalhos de desenvolvedor
  main.js           Ponto de entrada (sempre o ÚLTIMO script)
```

Os scripts compartilham variáveis globais (não são módulos). Por isso a **ordem** das tags `<script>` no `index.html` importa. Para criar um arquivo novo, coloque-o em `js/` e registre-o
no `index.html` antes de `js/game.js`.

## Qual arquivo enviar ao Claude para cada tarefa

Envie só o necessário: economiza o limite de uso e deixa a resposta mais precisa.
Comece cada conversa colando este README e descrevendo o que quer fazer.

| Tarefa                                    | Arquivos                                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gastar/trocar moedas e pontuação          | `player/state.js`, `player/interactions.js`, `ui/hud.js`, `index.html` (veja a seção "Dobrões de ouro")                                                                            |
| Novos objetos coletáveis                  | `core/config.js`, `dungeon/generator.js`, `render/objects.js`, `render/first-person.js`, `render/hitboxes.js`, `render/textures.js`, `player/interactions.js`, `ui/hud.js`         |
| Novos temas (Castelo, Caverna, Fosso)     | `core/config.js`, `dungeon/variants.js`, `render/textures.js`, `render/walls.js`, `render/floor-ceiling.js`                                                                        |
| Itens e monstros (JSON do SRD)            | `player/character.js`, `ui/hud.js` (os JSON novos eu crio do zero)                                                                                                                 |
| Combate e monstros no 3D                  | `player/character.js`, `player/movement.js`, `world/queries.js`, `render/first-person.js`, `render/objects.js`                                                                     |
| Mudar a aparência da interface            | `index.html`, `css/style.css`, `ui/hud.js`                                                                                                                                         |
| Mudar como a masmorra é gerada            | `dungeon/generator.js` (43 KB; peça ajuda indicando a parte que quer mudar)                                                                                                        |

## Dobrões de ouro (moedas)

### Regras

- **Quantidade por mapa** (sorteada ao gerar a masmorra): 0 moedas (50%), 1 moeda (35%), 2 moedas (10%), 3 moedas (5%).
- **Local de cada moeda**: passagem secreta (60%), beco sem saída (30%), sala ou salão (10%).
  - "Passagem secreta" é a casa escondida atrás da parede de um beco com porta secreta.
  - Se o local sorteado não tiver nenhuma casa livre (por exemplo, o mapa não tem passagem secreta), a moeda vai para o próximo da lista de reserva: **passagem secreta → beco sem saída → sala**. A quantidade de moedas do mapa não muda, só a distribuição dos locais.
  - Cada casa recebe no máximo uma moeda. Elas nunca ficam no ponto de partida, no ponto de chegada nem em casas com chave ou Mapa Encantado.
- **Coleta**: o jogador clica na moeda, estando na casa dela ou em uma casa ao lado (distância de 1 casa). De longe, aparece um aviso pedindo para se aproximar.
- **Limite**: no máximo **99 moedas** (`MAX_COINS`). Com 99, a moeda continua no chão e aparece um aviso de que a bolsa está cheia.
- **Persistência**: as moedas passam de um mapa para o seguinte. Elas só zeram ao gerar uma nova masmorra (`resetGame()`, botão "Gerar Nova Masmorra" da GUI do Desenvolvedor).
- **Inventário**: as moedas aparecem como uma **pilha no slot 1**, com o ícone da moeda e a quantidade no canto superior direito do slot. O slot só existe quando o jogador tem pelo menos 1 moeda, conta no "n / 20" do inventário e ganha um brilho dourado ao chegar a 99.

### Onde está cada parte do código

| O quê                                          | Onde                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Lista de moedas do mapa (`coinsOnFloor`)       | `js/core/config.js`                                                                          |
| Contador e limite (`player.coins`, `MAX_COINS`) | `js/player/state.js`                                                                         |
| Sorteio de quantidade e de locais              | `js/dungeon/generator.js` (bloco "G. SORTEIO E POSICIONAMENTO DAS MOEDAS", perto do fim)     |
| Imagens (caminhos e carregamento)              | `js/render/textures.js` (`OBJECT_TEXTURE_PATHS`, `OBJECT_TEXTURE_IMAGES`)                    |
| Desenho da moeda no chão em 3D                 | `js/render/objects.js` (`drawCoinIn3D`) e `js/render/first-person.js` (laço de `coinsOnFloor`) |
| Hover e clique do mouse                        | `js/render/hitboxes.js` (tipo de hitbox `'coin'`)                                            |
| Coleta (`collectCoinByClick`)                  | `js/player/interactions.js`                                                                  |
| Pilha de moedas no inventário                  | `js/ui/hud.js` (`updateInventoryHUD`) e `css/style.css` (`.filled-coin`, `.inv-slot-count`)  |
| Zerar moedas ao gerar nova masmorra            | `js/game.js` (`resetGame`)                                                                   |

Os dados de cada moeda em `coinsOnFloor`:

```js
{
  id: 'coin-1',
  type: 'coin',
  name: 'Dobrão de Ouro',
  x: 32, y: 26,            // casa do mapa
  place: 'dead_end',       // onde ficou: 'secret' | 'dead_end' | 'room'
  rolledPlace: 'secret',   // o que foi sorteado (pode diferir de place por causa da reserva)
  spot: 'floor',           // posição física: 'floor' (chão); no futuro, 'niche' (nicho na parede)
  collected: false
}
```

### Arte

PNGs em pixel art na pasta `assets/objects/` (a pasta é para todos os objetos coletáveis encontrados nas masmorras):

- `coin_floor.png` (160×112): moeda no chão, projetada em perspectiva sobre o piso (a elipse 1,5:1 compensa o esticamento da textura).
- `coin_icon.png` (64×64): ícone usado na pilha do inventário.

### Como testar no Console do navegador (F12)

```js
coinsOnFloor                       // moedas sorteadas neste mapa (JSON.stringify(coinsOnFloor) mostra os detalhes)
coinsOnFloor.push({ id: 'coin-teste', type: 'coin', name: 'Dobrão de Ouro', x: player.x + DIRECTIONS[player.dir].dx, y: player.y + DIRECTIONS[player.dir].dy, place: 'room', spot: 'floor', collected: false }); renderFirstPerson();   // cria uma moeda na casa à frente
player.coins = 7; updateInventoryHUD();   // simula 7 moedas no inventário
```

No Safari, o recarregamento forçado é Shift + clique no botão de recarregar (Ctrl+Shift+R é do Chrome e do Firefox).

### Ainda não existe

- Perder moedas e trocá-las por itens ou melhorias de atributos (quando isso for feito, a pilha deve sair do inventário ao chegar a 0 moedas, o que já acontece automaticamente porque ela é calculada a partir de `player.coins`).
- Moedas em nichos nas paredes (o campo `spot` já prevê `'niche'`).
- Dica de hover da moeda no modo desenvolvedor (`drawHoverTooltip` em `js/render/canvas-hud.js`): sem ela, o jogo funciona normalmente, só não mostra a etiqueta.

## Git (guardar versões e poder desfazer)

Uma vez, dentro da pasta do projeto:

```
git init
git add .
git commit -m "Estado inicial reorganizado"
```

Depois de cada mudança que funcionar:

```
git add .
git commit -m "Descreva o que mudou"
```

Se uma alteração quebrar o jogo, `git restore nome_do_arquivo` volta o arquivo ao último commit.
Para ter backup online, crie um repositório no GitHub e siga as instruções que ele mostra.

## Estado atual (em relação ao documento de design)

Existe: geração procedural 36x36, portas, alavancas, portas secretas, chaves de ferro/ouro,
Mapa Encantado, Fog of War com linha de visão, renderizador 3D com texturas, minimapa,
bússola, inventário (20 slots), dobrões de ouro (sorteio por mapa, coleta por clique, pilha no
inventário, limite de 99), ficha do personagem (raça, Vida, Fadiga, 6 habilidades).

Ainda não existe: pontuação e uso das moedas (perder ou trocar), monstros e combate (d20), itens do SRD,
os três temas do documento (hoje há 6 paletas de cor em `core/config.js`), integração Web3.
