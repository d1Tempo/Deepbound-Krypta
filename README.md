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

e abra http://localhost:8000.

## Estrutura

```
index.html          Página (estrutura HTML e a lista de scripts, em ordem de carregamento)
css/style.css       Todo o visual da interface
assets/             Texturas PNG (walls, floors, ceilings, doors, buttons, keys)
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

Os scripts compartilham variáveis globais (não são módulos). Por isso a **ordem** das tags
`<script>` no `index.html` importa. Para criar um arquivo novo, coloque-o em `js/` e registre-o
no `index.html` antes de `js/game.js`.

## Qual arquivo enviar ao Claude para cada tarefa

Envie só o necessário: economiza o limite de uso e deixa a resposta mais precisa.
Comece cada conversa colando este README e descrevendo o que quer fazer.

| Tarefa | Arquivos |
|---|---|
| Dobrões de ouro e pontuação | `core/config.js`, `player/interactions.js`, `render/objects.js`, `render/textures.js`, `ui/hud.js`, `index.html` |
| Novos temas (Castelo, Caverna, Fosso) | `core/config.js`, `dungeon/variants.js`, `render/textures.js`, `render/walls.js`, `render/floor-ceiling.js` |
| Itens e monstros (JSON do SRD) | `player/character.js`, `ui/hud.js` (os JSON novos eu crio do zero) |
| Combate e monstros no 3D | `player/character.js`, `player/movement.js`, `world/queries.js`, `render/first-person.js`, `render/objects.js` |
| Mudar a aparência da interface | `index.html`, `css/style.css`, `ui/hud.js` |
| Mudar como a masmorra é gerada | `dungeon/generator.js` (43 KB; peça ajuda indicando a parte que quer mudar) |

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
bússola, inventário (20 slots), ficha do personagem (raça, Vida, Fadiga, 6 habilidades).

Ainda não existe: dobrões de ouro e pontuação, monstros e combate (d20), itens do SRD,
os três temas do documento (hoje há 6 paletas de cor em `core/config.js`), integração Web3.
