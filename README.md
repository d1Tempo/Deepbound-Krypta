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
assets/             Texturas PNG e Áudios (pastas audio/bgm e audio/sfx)
docs/               Documento de design
js/
  core/             Constantes, temas, variáveis globais, áudio (audio.js) e utilidades
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
| Adicionar/Modificar Áudio e SFX           | `core/audio.js`, `player/interactions.js`, `player/movement.js`                                                                                                                    |
| Equipe de personagens e HUD 2×2           | `js/party/*` (arquivos novos, veja a seção "Equipe de personagens"), `index.html`, `css/style.css`, `ui/hud.js`, `player/state.js`, `player/character.js` (será substituído)                      |
| Itens e monstros (JSON do SRD)            | `player/character.js`, `ui/hud.js` (os JSON novos eu crio do zero)                                                                                                                 |
| Combate e monstros no 3D                  | `player/character.js`, `player/movement.js`, `world/queries.js`, `render/first-person.js`, `render/objects.js`                                                                     |
| Mudar a aparência da interface            | `index.html`, `css/style.css`, `ui/hud.js`                                                                                                                                         |
| Mudar como a masmorra é gerada            | `dungeon/generator.js` (43 KB; peça ajuda indicando a parte que quer mudar)                                                                                                        |

## Áudio e Efeitos Sonoros

O jogo utiliza um sistema de áudio em JavaScript puro, projetado para ser leve e não causar bloqueios no carregamento do navegador (`js/core/audio.js`).

- **Estrutura de Arquivos:** 
  - `assets/audio/bgm/`: Trilhas sonoras contínuas.
  - `assets/audio/sfx/`: Sons de ambiente em loop (vento) e efeitos sonoros curtos (passos, alavancas, portas). Todos os nomes de arquivos devem ser curtos, em letras minúsculas e **sem caracteres especiais** (`#`, `%`, etc.).
- **Loops Perfeitos (Web Audio API):** Para evitar o "estalo" natural que os navegadores geram ao reiniciar arquivos MP3, sons contínuos como o vento gélido são carregados, decodificados e processados nativamente na memória através da Web Audio API (`AudioContext`).
- **Prevenção de Latência (Clonagem):** Efeitos de repetição rápida, como os passos da equipe ou cliques de alavancas, são clonados dinamicamente na memória a cada execução (`cloneNode`). Isso permite que os sons se sobreponham de forma fluida sem engasgar o arquivo original.
- **Autoplay:** Para respeitar as políticas dos navegadores, a inicialização da paisagem sonora (BGM e Vento) só é disparada após a primeira interação do jogador com o jogo (o primeiro movimento ou giro).

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

## Equipe de personagens (diretrizes de design)

> **Estado: em planejamento.** A janela de personagem atual (ficha única com raça, Vida, Fadiga e 6 habilidades) será **substituída por completo**; nada dela deve ser reaproveitado. Esta seção é o contrato de design da nova interface. Código novo só entra depois que as diretrizes e os "pontos em aberto" abaixo estiverem fechados. Todo o código do jogo continua dependendo da ficha antiga (`player.character`, `generateHeroicCharacter`, `updateCharacterHUD`), então a troca deve ser feita em etapas (veja "Ordem de implementação"), e não apagando tudo de uma vez.

### Diretrizes

1. **Equipe de 4 personagens**, em formação 2 × 2: 2 na frente e 2 atrás. A formação inteira ocupa **1 casa** da masmorra (a casa que hoje o jogador ocupa). Posições: frente-esquerda, frente-direita, trás-esquerda, trás-direita.

2. **HUD com 4 slots em 2 × 2**, espelhando a formação. Proposta: a linha de cima é a **frente** e a de baixo é a **trás**.

3. **Cada slot mostra:**
   1. o **rosto** do personagem;
   2. o **nome**;
   3. a barra de **Vida** e a barra de **Fadiga**, cada uma com os pontos atuais e o total (ex.: `9 / 12`);
   4. **dois slots de mão** (direita e esquerda), onde o jogador coloca o que o personagem segura: arma, escudo, scroll, poção, ou nada (mão livre). **Clicar** no item ou na mão executa a ação própria do que está ali:

   | Na mão          | Ação ao clicar                                                        |
   | --------------- | --------------------------------------------------------------------- |
   | Arma            | ataca o inimigo exatamente à frente (veja a diretriz 10)              |
   | Scroll          | conjura a magia do pergaminho                                         |
   | Poção           | o personagem bebe; altera Vida, Fadiga ou atributos (força, destreza…) |
   | Mão livre       | ataque desarmado                                                      |
   | Escudo          | bônus passivo na Classe de Armadura (proposta: sem ação ao clicar)    |

   Fora de batalha, poções e scrolls utilitários podem ser usados a qualquer momento; um ataque só tem efeito com inimigo à frente. Durante a batalha, valem as regras da diretriz 10. As ações de mão dependem do sistema de combate, que **não faz parte** da primeira entrega da interface (veja "Ordem de implementação").

4. **Seleção.** Clicar no rosto seleciona o personagem. A área de **Inventário** passa a mostrar **somente os itens daquele personagem**, e o título indica de quem é: `Inventário | Nome do personagem`.

5. **Trocar de posição.** Clicar e **segurar** o rosto de um personagem e **arrastá-lo** até o slot de outro faz os dois trocarem de posição (inclusive entre frente e trás). Deve funcionar com mouse e com toque (segurar). A seleção continua no mesmo personagem depois da troca. **Durante uma batalha a troca de posição não é permitida**, com uma única exceção: quando um personagem da frente cai, um de trás pode **avançar para o lugar vago** (veja a diretriz 10).

6. **Ficha do personagem.** Um **duplo clique** em um personagem troca a janela dos 4 slots por uma janela com os **atributos, habilidades e estatísticas** dele, com uma **miniatura do rosto** para deixar claro de quem é. Clicar na miniatura ou em um ícone de fechar (✕) volta para os 4 slots. O primeiro clique do duplo clique apenas seleciona o personagem, sem efeito colateral. Durante uma batalha, o tempo do turno **continua correndo** com a ficha aberta.

7. **Regras: D&D 5ª edição, pelo SRD** (System Reference Document, em português costuma-se escrever "SRD", e não "SDR"), mostrando apenas o básico para um dungeon crawler. Habilidades sociais **não** entram.

   | Entram na ficha                          | Atributo | Uso no jogo                                                   |
   | ---------------------------------------- | -------- | ------------------------------------------------------------- |
   | Atletismo                                | FOR      | forçar portas, escalar                                        |
   | Acrobacia                                | DES      | esquivar de armadilhas, equilíbrio                            |
   | Furtividade                              | DES      | não ser notado                                                |
   | Prestidigitação / Ferramentas de ladrão  | DES      | **desarmar armadilhas** e abrir fechaduras                    |
   | Percepção                                | SAB      | **descobrir portas secretas** e armadilhas (passiva e ativa)  |
   | Investigação                             | INT      | procurar e **detectar armadilhas** e mecanismos               |
   | Arcanismo                                | INT      | magia, glifos e itens mágicos                                 |
   | Religião                                 | INT      | preces, mortos-vivos, símbolos sagrados                       |
   | Medicina                                 | SAB      | estabilizar aliados                                           |

   **Ficam de fora (primeira versão):** Adestrar Animais, Atuação, Enganação, Intimidação, Intuição, Persuasão, História, Natureza e Sobrevivência.

   **Na ficha aparecem:** os 6 atributos com modificadores; Classe de Armadura; Vida e Fadiga; nível e bônus de proficiência; testes de resistência; as habilidades da tabela acima; magias e preces (quando houver); traços de classe e raça; e **estatísticas de jogo** (inimigos derrotados, dano causado, armadilhas desarmadas, portas secretas descobertas, portas abertas…).

   **Fadiga** não existe no SRD: é uma regra própria do jogo (proposta: Fadiga máxima = valor de Constituição; gasta em ataques e magias; recupera com o tempo e com poções). Regra a fechar junto com o combate.

   A versão de regras adotada é o **SRD 5.1** (as regras de 2014, que usam "raça"). Veja "Licenças e créditos" para a atribuição obrigatória.

8. **Pronto para NFTs (web3), em etapa futura.** O código novo deve nascer preparado para carregar personagens de uma fonte externa. Princípios:

   - **Dados puros, sem tela.** O personagem é um objeto de dados; a interface só lê. Nada de regra escondida em código de desenho.
   - **Identidade imutável × progresso mutável.** A identidade (nome, raça, gênero, classe, atributos base, retrato) é o que viria do NFT. Nível, pontos de experiência, Vida e Fadiga atuais, inventário, mãos e estatísticas pertencem ao **progresso do jogo** e ficam separados.
   - **Tudo o que é derivado é recalculado** pelas regras locais (modificadores, Vida máxima, Classe de Armadura, bônus de habilidades). Valores derivados vindos de metadados externos nunca são aceitos.
   - **Metadados externos são entrada não confiável.** Validar o formato ao carregar (limites dos atributos, listas permitidas de raça e classe, tamanho e endereço do retrato) e **nunca inserir texto externo como HTML** (usar `textContent`, e não `innerHTML`).
   - **Carregamento por "provedor" assíncrono.** Hoje: `PresetProvider` (os 6 personagens fixos). No futuro: `NftProvider` (lê o token, busca os metadados e monta o mesmo objeto). A interface mostra um estado de "carregando" e trata falhas.
   - **Retrato por endereço** (URI), com imagem de reserva, para aceitar `https://` e `ipfs://` no futuro.

   Formato previsto (versão 1; pontuações base **antes** dos bônus de raça):

   ```json
   {
     "schemaVersion": 1,
     "id": "preset-guerreiro-anao-m",
     "source": { "type": "preset", "chainId": null, "contract": null, "tokenId": null, "metadataUri": null },
     "identity": {
       "name": "Durgan Pedraforte",
       "race": "dwarf", "subrace": "hill", "gender": "male", "class": "fighter",
       "portrait": "assets/portraits/durgan.png"
     },
     "base": {
       "abilities": { "str": 15, "dex": 14, "con": 13, "int": 8, "wis": 12, "cha": 10 },
       "skillProficiencies": ["athletics", "perception"]
     },
     "progress": {
       "level": 1, "xp": 0, "hp": 13, "fp": 15,
       "hands": { "right": null, "left": null },
       "inventory": [],
       "stats": { "kills": 0, "damageDealt": 0, "trapsDisarmed": 0, "secretDoorsFound": 0, "doorsOpened": 0 }
     }
   }
   ```

9. **Elenco inicial: 6 personagens fixos, o jogador escolhe 4.** Classes: guerreiro, ladino, mago, clérigo, paladino e patrulheiro. Raças: humano, anão e elfo (com as sub-raças do SRD 5.1: anão da colina e elfo alto). Os dois gêneros. A combinação abaixo é a **proposta** inicial (nomes provisórios), com 2 de cada raça e 3 de cada gênero, usando personagens de nível 1 e os valores-padrão (15, 14, 13, 12, 10, 8) distribuídos conforme a classe:

   | Personagem          | Classe       | Raça (sub-raça)    | Gênero    | FOR | DES | CON | INT | SAB | CAR | Vida | Fadiga | CA  |
   | ------------------- | ------------ | ------------------ | --------- | --- | --- | --- | --- | --- | --- | ---- | ------ | --- |
   | Durgan Pedraforte   | Guerreiro    | Anão (da colina)   | masculino | 15  | 14  | 15  | 8   | 13  | 10  | 13   | 15     | 16  |
   | Helga Forjaluz      | Clérigo      | Anã (da colina)    | feminino  | 13  | 10  | 16  | 8   | 16  | 12  | 12   | 16     | 16  |
   | Sylvar Ventofino    | Ladino       | Elfo (alto)        | masculino | 8   | 17  | 14  | 14  | 12  | 10  | 10   | 14     | 14  |
   | Aelindra Lúmen      | Mago         | Elfa (alta)        | feminino  | 8   | 16  | 13  | 16  | 12  | 10  | 7    | 13     | 13  |
   | Cassian Valdoro     | Paladino     | Humano             | masculino | 16  | 11  | 14  | 9   | 13  | 15  | 12   | 14     | 18  |
   | Elara Bosquefundo   | Patrulheira  | Humana             | feminino  | 13  | 16  | 14  | 11  | 15  | 9   | 12   | 14     | 15  |

   Os valores já incluem os bônus de raça do SRD 5.1 (humano +1 em tudo; anão +2 CON e, o da colina, +1 SAB; elfo +2 DES e, o alto, +1 INT). A Vida do anão da colina inclui +1 pelo traço "Robustez Anã". A Classe de Armadura considera a armadura inicial típica da classe (guerreiro com cota de malha e arma de duas mãos; paladino com cota de malha e escudo; clériga com brunea e escudo; patrulheira com couro batido; ladino com couro; maga sem armadura).

   Habilidades iniciais propostas: guerreiro (Atletismo, Percepção), clériga (Medicina, Religião), ladino (Furtividade, Investigação, Prestidigitação, Acrobacia, mais Percepção do elfo e especialização em Ferramentas de ladrão), maga (Arcanismo, Investigação, mais Percepção do elfo), paladino (Atletismo, Religião), patrulheira (Percepção, Furtividade, Investigação).

10. **Combate por turnos, com tempo limite para cada ação.** Durante as batalhas o jogo é **por turnos**, e cada personagem tem **10 segundos** (constante `COMBAT_TURN_SECONDS`, ajustável) para executar a sua ação. Se o jogador não agir com aquele personagem nesse tempo, o personagem **perde o turno** e a vez passa ao próximo.

    **Quando há batalha.** Depende da posição da equipe em relação ao grupo de inimigos:

    | Situação                                                                                   | Contador de tempo | Quem ataca                                                         |
    | ------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------ |
    | Há **uma casa vazia** entre a equipe e os inimigos (ou não há inimigos)                    | não aparece       | ninguém; a equipe **não sofre dano**                               |
    | A equipe está **de frente** para os inimigos, em casa adjacente                            | **aparece**       | batalha por turnos: os dois lados                                  |
    | A equipe está em casa adjacente aos inimigos, mas **não de frente** (por exemplo, girou)   | some              | **só os inimigos atacam**; a equipe sofre dano e não consegue atacar |

    A equipe só deixa de sofrer dano quando consegue colocar **uma casa vazia** entre ela e os inimigos. O contador só aparece na segunda situação; fora dela não há contagem de tempo.

    **Movimento livre.** Andar **para trás ou para os lados** é livre e não consome o turno de ninguém. Se isso coloca uma casa vazia entre a equipe e os inimigos, o contador **encerra**. Se o inimigo avançar, ou se a equipe voltar a avançar até a casa adjacente, o contador e os turnos **voltam**.

    **Ritmo dos inimigos fora do contador (proposta, a calibrar).** Quando os inimigos estão em casa adjacente e a equipe não está de frente, eles atacam **de tempos em tempos**: uma rodada a cada **8 segundos** (`ENEMY_IDLE_ATTACK_SECONDS`), com uma **carência de 3 segundos** antes da primeira rodada (`ENEMY_IDLE_GRACE_SECONDS`), contada a partir do início do contato. Fugir leva uma só tecla (um passo para trás ou para o lado), então a carência dá tempo de reagir antes do primeiro golpe. Os inimigos podem **perseguir** a equipe que foge: proposta de **1 casa a cada 4 segundos** (`ENEMY_STEP_SECONDS`, menos para inimigos rápidos e mais para lentos, conforme o deslocamento do SRD), o que permite escapar, a não ser que a equipe esteja encurralada. Em uma simulação com números do SRD, nesse ritmo um goblin sozinho não derrota o guerreiro nem o paladino em menos de 10 segundos, e a mediana até a morte do guerreiro é de cerca de 43 segundos. Contra inimigos fortes (como um ogro), a Vida de nível 1 é frágil em qualquer ritmo; por isso o equilíbrio de quais monstros aparecem em cada mapa é o que protege a equipe.

    **Segunda fileira e avanço.** Os inimigos da segunda fileira atacam **somente se tiverem arma de longo alcance** (lanças, arco e flecha). Quando um inimigo da frente cai, um de trás pode **avançar para o lugar dele**. O mesmo vale para a equipe: quando um personagem da frente cai, um de trás pode avançar para o lugar vago, e isso **consome o turno do personagem que avança**. É a única troca de posição permitida durante a batalha.

    - **Uma ação por turno:** atacar com uma das mãos, conjurar um scroll, beber uma poção ou "Passar" (botão explícito, para quem quer abrir mão do turno sem esperar o tempo acabar).
    - **A HUD mostra de quem é a vez:** o slot do personagem ativo fica em destaque, com uma **barra de contagem regressiva**. Ao esgotar o tempo, aparece um aviso de "turno perdido".
    - **Só o personagem da vez age.** Clicar nas mãos dos outros não tem efeito durante a batalha. Selecionar um personagem para ver o inventário e abrir a ficha continuam permitidos, e **o tempo continua correndo com a ficha aberta**. **Trocar a posição dos personagens não é permitido durante a batalha**, exceto avançar para o lugar vago de um companheiro caído da frente (veja "Segunda fileira e avanço").
    - **Ordem dos turnos (proposta, a confirmar):** iniciativa do SRD, isto é, um d20 mais o modificador de Destreza de cada combatente, equipe e inimigos juntos, do maior para o menor. Os turnos dos inimigos são automáticos, sem tempo.
    - **Pausa (proposta):** o tempo pausa quando a aba do navegador fica oculta e quando um menu do jogo está aberto, para o jogador não perder o turno por algo fora do jogo. A ficha **não** pausa o tempo.
    - **Acessibilidade (proposta):** nas configurações, uma opção de tempo estendido ou sem limite, para quem não consegue jogar com pressão de tempo.

    **Inimigos à frente da equipe.** Pode haver de **1 a 4** inimigos na casa à frente da equipe, agrupados em **pares** (interpretação a confirmar): 1 inimigo fica sozinho; 2 formam uma fileira de 2; 3 formam uma fileira de 2 e, atrás, 1; 4 formam um bloco 2 × 2.

    **Ataque sem escolha de alvo.** O jogador não escolhe o alvo. Ao clicar na arma que está usando, o personagem ataca o **primeiro inimigo exatamente à frente dele** (o da mesma coluna, na fileira inimiga mais próxima). Se não houver inimigo na sua coluna, o ataque acerta o **inimigo mais próximo**.

    - Armas de **longo alcance** (arcos, bestas, armas de arremesso), que os personagens da **fileira de trás** podem usar, atacam **qualquer inimigo, escolhido ao acaso**.
    - **Lanças empunhadas** (não arremessadas) atacam os inimigos da **primeira fileira** inimiga, mesmo nas mãos de um personagem de trás.

    **Magias e preces.** Contra inimigos, o alvo é **escolhido ao acaso**. Quando o alvo é **amigo** (curas e melhorias), o jogador o escolhe **clicando na foto** do personagem na janela da equipe.

    **Ataques dos inimigos.** Cada inimigo ataca quem está **à sua frente, no início da fileira** (o personagem da frente da sua coluna). Se esse personagem cair, o ataque passa ao **próximo da mesma fileira** (o de trás). Interpretação a confirmar: aqui "fileira" é a linha de personagens à frente de cada inimigo, da frente para trás.

    **Fuga.** A equipe foge andando **para trás ou para os lados**, até colocar uma casa vazia entre ela e os inimigos. **Apenas girar** não é fuga: a equipe deixa de atacar e continua sofrendo dano se estiver em casa adjacente.

### Decisões já tomadas

- Combate **por turnos**, com **10 segundos** por ação e perda do turno se o tempo acabar.
- O contador de tempo só aparece quando a equipe está **de frente** para os inimigos, em casa adjacente; o tempo **corre com a ficha aberta**.
- Com os inimigos em casa adjacente e a equipe **não de frente**, só os inimigos atacam, **de tempos em tempos** (proposta: rodadas de 8 s, carência de 3 s). A equipe só fica a salvo com **uma casa vazia** entre ela e os inimigos.
- **Andar para trás ou para os lados é livre** e encerra o contador; se o inimigo avançar ou a equipe voltar a avançar, o contador e os turnos voltam.
- **Não se troca a posição** dos personagens durante a batalha, exceto avançar para o lugar vago de um companheiro caído da frente (consome o turno de quem avança).
- **De 1 a 4 inimigos** à frente da equipe, agrupados em pares. Os da segunda fileira só atacam com arma de longo alcance, e um deles pode avançar quando um da frente cai.
- **Sem escolha de alvo:** a arma ataca o primeiro inimigo exatamente à frente (sem inimigo na coluna, o mais próximo); armas de longo alcance de quem está atrás atacam ao acaso; lanças empunhadas atacam a primeira fileira inimiga.
- **Magias contra inimigos:** alvo ao acaso. **Curas e melhorias:** o jogador clica na foto do aliado.
- **Ataques dos inimigos:** quem está à frente do inimigo, no início da fileira; se cair, o próximo da mesma fileira.
- **Fuga** andando para trás ou para os lados; girar não é fuga.

### Pontos em aberto (decidir antes de programar)

1. **Versão do SRD:** 5.1 (2014, "raças") ou 5.2.1 (2024, "espécies"). Proposta: 5.1.
2. **Nível inicial:** 1 (simples, mas as classes de combate têm poucas opções) ou 3.
3. **Ordem dos turnos:** iniciativa do SRD, com equipe e inimigos misturados (proposta), ou a equipe inteira primeiro, na ordem da formação, e depois os inimigos? Quando o contador volta (o inimigo avançou ou a equipe voltou a avançar), a ordem recomeça do início ou continua de onde parou?
4. **Pausa do tempo:** pausar com a aba oculta e com menu aberto (proposta)?
5. **Detalhes de alcance:** a lança empunhada de quem está atrás escolhe o alvo ao acaso entre os da primeira fileira, ou usa a sua coluna? Armas de longo alcance de quem está na frente atacam o inimigo à frente ou ao acaso? Armas corpo a corpo comuns nas mãos de quem está atrás têm algum efeito (proposta: nenhum)?
6. **Magias em aliados:** como é o clique? (proposta: clicar no scroll ou na magia e, em seguida, na foto do aliado, tudo dentro dos 10 segundos). Um aliado derrotado pode receber cura?
7. **Calibrar o ritmo dos inimigos** com monstros reais: rodadas de 8 s e carência de 3 s fora do contador, perseguição de 1 casa a cada 4 s, e se o avanço de um inimigo consome o turno dele (proposta: sim, no lugar do ataque).
8. **Chaves, Mapa Encantado e moedas:** pertencem à equipe (proposta: uma "bolsa da equipe", fora dos slots de cada personagem) ou a um personagem? Hoje eles ficam no inventário único, e a pilha de moedas ocupa o slot 1.
9. **Armas de duas mãos** ocupam as duas mãos?
10. **Fadiga:** regra de gasto (por ação?) e de recuperação (por turno, por descanso, com poções).
11. **Arte:** rostos dos 6 personagens (proposta: pixel art 64×64, no mesmo estilo das texturas) e ícones de itens e de mãos. Quem produz?
12. **Persistência:** salvar e carregar a equipe e o progresso (local, e depois com web3).
13. **Vida zero e derrota:** o que acontece com um personagem derrotado (inconsciente, morto, reanimável)? E se a equipe inteira cair?

### Arquitetura prevista (arquivos novos)

```
js/party/
  character-schema.js     Formato dos dados e validação (rejeita metadados inválidos)
  character-rules.js      Regras do SRD: modificadores, Vida máxima, Classe de Armadura, bônus de habilidades
  character-presets.js    Os 6 personagens fixos (dados puros)
  character-provider.js   PresetProvider (agora) e NftProvider (futuro), carregamento assíncrono
  party-state.js          A equipe: 4 posições, personagem selecionado, janela aberta (equipe ou ficha)
  party-hud.js            Desenho dos 4 slots, seleção, arrastar para trocar, duplo clique
  character-sheet.js      Janela de atributos, habilidades e estatísticas
js/combat/
  turn-manager.js         Iniciativa, fila de turnos, temporizador de 10 s por ação, turno perdido, pausas
  enemy-group.js          Formação dos inimigos (1 a 4, em pares) e regra de alvo (à frente, alcance, lanças)
  combat-actions.js       Ações de uma mão: atacar, conjurar, beber, passar (depende dos pontos 5 a 7)
assets/portraits/         Rostos dos personagens (PNG, pixel art)
```

As regras (`character-rules.js`) e o formato (`character-schema.js`) são funções puras, sem tela, para poderem ser testadas fora do navegador. Isso permite rodar centenas de verificações automáticas, como já fazemos com o gerador de masmorras.

### Ordem de implementação

1. **Diretrizes** (esta seção) e decisão dos pontos em aberto.
2. **Camada de dados:** formato, regras do SRD, os 6 personagens e o `PresetProvider`, com testes automáticos.
3. **HUD 2 × 2 estático:** os 4 slots (rosto, nome, barras, mãos), sem interação. Aqui a janela de personagem antiga sai de cena.
4. **Seleção e inventário por personagem** (e a decisão sobre chaves, Mapa e moedas).
5. **Arrastar para trocar de posição** e **duplo clique para abrir a ficha**.
6. **Remoção do código antigo** (`player/character.js`, as funções de personagem em `ui/hud.js`, a janela antiga no `index.html` e o CSS correspondente).
7. **Combate por turnos:** gerenciador de turnos (iniciativa, fila, temporizador, turno perdido e pausas), destaque do personagem ativo e contagem regressiva na HUD. Pode ser testado antes dos inimigos existirem, com combatentes de teste.
8. **Ações das mãos** (atacar, conjurar, beber, passar), sobre o gerenciador de turnos.
9. **NFTs:** `NftProvider` e carregamento a partir da carteira.

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
inventário, limite de 99), ficha do personagem (raça, Vida, Fadiga, 6 habilidades), sistema de áudio (ambiente, passos, interações).

Em planejamento: equipe de 4 personagens com HUD 2 × 2, inventário por personagem, ficha e combate por turnos com tempo limite (veja "Equipe de personagens").

Ainda não existe: pontuação e uso das moedas (perder ou trocar), monstros e combate (d20), itens do SRD,
os três temas do documento (hoje há 6 paletas de cor em `core/config.js`), integração Web3.

## Licenças e créditos

Este jogo usa regras do SRD 5.1 de Dungeons & Dragons. A licença exige a declaração abaixo, **sem acrescentar nenhuma outra atribuição à Wizards of the Coast**:

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

A licença permite dizer que o jogo é "compatível com a 5ª edição" ("5E compatible"). Não use o nome, o logotipo nem outros elementos de marca de Dungeons & Dragons, nem conteúdo que não esteja no SRD. Se o jogo vier a vender NFTs, vale conversar com um advogado sobre o uso comercial.