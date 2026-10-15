# Documentação de Design do Jogo: Deepbound Krypta

## 1. Visão Geral do Projeto

**Deepbound Krypta** é um jogo de exploração de masmorras (*dungeon crawler*) procedural em primeira pessoa, incorporando um sistema de RPG clássico. O objetivo principal do jogador é explorar diferentes tipos de masmorras, sobreviver aos desafios, gerenciar seu inventário e coletar "dobrões de ouro". Estes dobrões servem como o principal incentivo para a exploração detalhada dos níveis, recompensando os jogadores mais curiosos com uma pontuação mais alta.

## 2. Estado Atual do Protótipo (Base Técnica)

O jogo possui um protótipo funcional construído com tecnologias web (HTML, CSS e JavaScript puro). A arquitetura atual é dividida em três frentes principais:

* **Interface (UI/UX)**: Separação clara entre "GUI do Jogador" e "GUI do Desenvolvedor". A interface do jogador inclui visão 3D em canvas, bússola, inventário com 20 slots, histórico de avisos e status do personagem com barras de Vida e Fadiga.

* **Geração Procedural (`dungeon.js`)**: O código gera masmorras aleatórias em um grid de 36x36, garantindo conectividade entre salas, becos sem saída, e posicionamento lógico de chaves, portas e espalhamento orgânico de dobrões de ouro pelo chão.

* **Renderização e Interação (`renderer.js`)**: Utiliza um *Fog of War* com visibilidade estrita (Line of Sight). A renderização das paredes e do chão responde dinamicamente ao tema da masmorra gerada.

> Nota: após a reorganização do projeto, `dungeon.js` e `renderer.js` foram divididos em vários arquivos dentro de `js/` (veja o README).

## 3. Exploração e Pontuação (Dobrões de Ouro)

A mecânica central de recompensa a curto prazo é o sistema de **Dobrões de Ouro**:

* **Incentivo**: Os dobrões são espalhados procedimentalmente pelas salas das masmorras, encorajando o jogador a não apenas procurar a saída, mas a vasculhar cada canto.

* **Pontuação**: Cada dobrão coletado aumenta a pontuação (*Score*) do jogador, gerando uma sensação de progressão a cada nível explorado.

* **Integração Web3 (Possibilidade Futura)**: No futuro, o jogo poderá ser integrado à blockchain Enjin. Nesse cenário, o *score* obtido através dos dobrões alimentará *leaderboards* que recompensarão os melhores jogadores com tokens da rede ou NFTs. No momento, o foco é inteiramente na experiência de jogo base.

## 4. Sistema de RPG e Progressão (D&D 5e SRD)

A estrutura de regras do jogo, incluindo combate, balanceamento e estatísticas, será baseada no **D&D 5e SRD (System Reference Document)** sob a licença **CC-BY-4.0**. Esta escolha fornece uma fundação matemática sólida e testada para os programadores traduzirem para código (o sistema d20).

* **Resolução de Ações e Combate**: Os ataques do jogador e dos inimigos utilizarão a lógica padrão do SRD: rola-se um dado de 20 faces (d20, em código: `Math.random()`), soma-se o bônus da habilidade (ex: Espada Larga) e compara-se com a Classe de Armadura (CA) do alvo para determinar acertos.
* **Atributos e Vigor**: O sistema já gerencia "Vida" (HP) e "Fadiga" (FP) baseados na raça (Humanos, Anões, Elfos). O HP seguirá os dados de vida das classes/monstros do SRD. A "Fadiga" será um recurso customizado consumido ao realizar ataques pesados, manobras evasivas ou utilizar habilidades especiais durante o combate.
* **Inimigos**: Os atributos base (CA, HP, Dano) dos inimigos que habitarão a masmorra (como esqueletos, goblins e limos) serão retirados diretamente das tabelas do SRD.

## 5. Itens e Gerenciamento de Inventário

O inventário atual suporta 20 slots visuais. Com a adoção do SRD, as propriedades dos itens ganham clareza mecânica.

* **Coletáveis Existentes**: Chaves de Ferro, Chaves de Ouro e "Mapa Encantado" (revela parte da masmorra).
* **Novos Itens a Desenvolver (Base SRD)**:
  * **Armas**: (Ex: Espada Longa causa 1d8 de dano; Adaga causa 1d4).
  * **Armaduras e Escudos**: Aumentam diretamente a Classe de Armadura (CA) do personagem.
  * **Poções Mágicas**: Itens de cura de Vida (ex: Cura Ferimentos leves recupera 1d8 + modificador) e itens de recuperação de Fadiga.
  * **Utensílios**: Kits de armadilhas e gazuas, que conferem bônus mecânicos em testes de habilidade d20 para abrir portas e desarmar perigos.

## 6. Design de Níveis, Temas e Atmosferas

Para evitar a repetição visual e garantir imersão, o gerador procedural conta com diferentes layouts e biomas para as masmorras. A aparência das paredes, chão e fontes de luz muda drasticamente dependendo do tema sorteado:

* **Castelo Polido**: Uma masmorra com aspecto limpo e refinado. Possui tijolos de pedras bem ordenados e polidos, chão de mármore e pilares de sustentação. A grande diferença visual é a ausência de tochas de fogo; o ambiente é iluminado por cristais mágicos encrustados nas paredes.

* **Caverna Verdejante**: Um ambiente orgânico e rústico. As paredes são de pedra bruta e natural, com trepadeiras descendo do teto. O chão é feito de pedra coberta com tufos de gramíneas e terra. A iluminação é feita por meio de **esmeraldas brilhantes** incrustadas nas rochas.

* **Fosso Infernal**: Um ambiente sombrio e opressivo. As estruturas são construídas com tijolos de uma cor vermelho sangue, pedras carbonizadas e chão com poças de sangue ou brasas. A iluminação também provém de tochas, contribuindo para o clima quente e hostil.

### Notas de Implementação para Programadores:

1. **Reaproveitamento de Código**: A lógica procedural e de portas/passagens secretas contida no `dungeon.js` é sólida e deve ser preservada.
2. **Texturas Condicionais**: O sistema no `dungeon.js` fornece os "nomes" dos blocos baseados no tema atual (ex: `blood_brick` ou `polished_brick`). O `renderer.js` deve ser alimentado com as texturas 2D correspondentes a estes nomes, bem como os novos emissores de luz (cristais e esmeraldas).
3. **Conversão de Dados**: Criar arquivos de configuração (ex: `monsters.json` e `items.json`) transcrevendo os dados pertinentes do D&D 5e SRD para que as funções de JavaScript possam consultar dano, vida e classe de armadura facilmente.
