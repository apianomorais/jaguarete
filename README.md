# Jaguaretê: no reino do jaguar

*Jaguaretê* é o nome tupi do jaguar, a onça-pintada: "jaguar verdadeiro". No jogo, o predador é chamado pelo nome nativo: jaguar, e suçuarana para a onça-parda.

Jogo de estratégia para o navegador sobre pecuária e grandes felinos no Pantanal, na Amazônia, no Cerrado, na Caatinga e na Chapada do Araripe. Você cria bois, carneiros e galinhas numa fazenda cercada de mata, disputa patrimônio com três fazendeiros controlados pelo computador e convive (ou não) com os jaguares e as suçuaranas que vivem na mata. A dinâmica entre predadores e presas segue modelos ecológicos clássicos de presa e predador.

> Versão MVP. Os ícones são provisórios e serão substituídos pelas ilustrações do autor.

## Como jogar

- **Objetivo:** terminar os 10 anos (20 estações, alternando chuva e seca) com o maior patrimônio, somando o dinheiro em caixa e o valor do rebanho.
- **Cada estação:** você tem 3 ações:
  - desmatar para abrir pasto;
  - deixar a mata voltar;
  - instalar cerca elétrica, curral noturno ou animais de guarda;
  - pôr armadilhas fotográficas;
  - capturar um jaguar para pôr colar GPS;
  - contratar um matador de jaguares.

  Comprar, vender e mover animais não gasta ação.
- **Os jaguares:** ficam ocultos na mata. Você só os descobre por pegadas, fotos, ataques e colares GPS. Eles comem presas silvestres e, quando as presas faltam, atacam o rebanho que fica na borda da mata.
- **O selo:** fazendas que não matam jaguares e respeitam a reserva legal ganham 20% a mais na produção e no valor do rebanho. Também podem aderir à compensação por ataques.
- **O matador:** abater jaguar é crime (Lei nº 9.605/1998, art. 29). O jogo permite, mas há quatro consequências:
  - você perde o selo;
  - arrisca multa;
  - pequenos predadores aumentam e atacam as galinhas;
  - capivaras e queixadas se multiplicam e comem o pasto.

  O território vago também atrai jovens jaguares em dispersão.

## Cenário da Chapada do Araripe

O cenário segue o plano de manejo da APA Chapada do Araripe aprovado pelo ICMBio em agosto de 2026.

- **Mapa:**
  - No alto fica a chapada, com a FLONA Araripe-Apodi e duas fazendas.
  - Na encosta úmida ficam quatro nascentes e o Refúgio de Vida Silvestre do Soldadinho-do-Araripe.
  - No vale do Cariri ficam a sua fazenda e a do Seu Brás.
- **Zonas do plano de manejo:** cada área das fazendas recebe uma zona.
  - **Produção:** sem marca no mapa; pode virar pasto.
  - **Uso Moderado:** pontilhada; só roças de subsistência, sem pasto novo.
  - **Uso Restrito:** riscada; sem abrir área nova.
  - **APP de nascente:** o entorno de cada nascente é APP e não pode ser desmatado.

  Desmatar fora das regras é possível, mas é ilegal: você perde o selo e pode ser multado.
- **Predador:** a suçuarana, nome tupi da onça-parda. O jaguar (onça-pintada) é considerado provavelmente extinto no Ceará. A suçuarana ataca mais carneiros que bois.
- **Soldadinho-do-araripe:** a população depende de quatro fatores:
  - a mata em volta das nascentes;
  - a recarga de água no alto da chapada;
  - o fogo.

  Com menos vegetação no alto, as nascentes do vale também correm mais fracas na seca, e isso reduz o pasto das fazendas de baixo. Essa ligação entre chapada e nascentes é uma simplificação: o jogo não calcula a água.
- **Aceiros:** protegem a fazenda do fogo por duas estações. A mesma ação existe no Cerrado.

O mapa é uma simplificação: no jogo, a Zona de Produção ocupa cerca de dois terços das terras das fazendas. Na APA real, ela cobre 89,86% da área.

## Raposas na Caatinga

Na Caatinga, os pequenos predadores do galinheiro são as raposas, nome popular do cachorro-do-mato no Nordeste. Com poucos jaguares, elas ficam mais numerosas (liberação de mesopredadores) e levam mais galinhas. Telar o galinheiro reduz as perdas em 70%.

## Javaporcos

Os porcos asselvajados (*Sus scrofa*) só aparecem nos cenários onde há registro:

- **Pantanal:** o porco-monteiro, asselvajado há mais de dois séculos, começa numeroso.
- **Cerrado:** é um dos biomas por onde o javali mais se espalhou; a invasão começa média.
- **Amazônia:** o SIMAF registra varas no Acre, em Rondônia e no norte de Mato Grosso desde 2018; a invasão começa pequena.

Na Caatinga e na Chapada do Araripe não há javaporcos, porque não encontrei registro confirmado. O relatório do Ibama de 2013 a 2016 não tinha registro confirmado no Ceará.

Os porcos entram como terceira presa do jaguar, de crescimento rápido. Eles fuçam e reduzem a capacidade dos pastos das fazendas sem manejo. Também alimentam o jaguar, o que empurra a população dele para cima (competição aparente).

Na sede, a ação **caçadores de manejo** chama manejadores com autorização no SIMAF. Eles retiram metade dos porcos da região e protegem os seus pastos por três estações. Como a população se recupera rápido, o controle só funciona se for repetido e feito por várias fazendas.

## Como publicar no GitHub Pages

1. Crie um repositório e envie todo o conteúdo desta pasta.
2. No GitHub, abra **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`, e salve.
3. Em um ou dois minutos o jogo estará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

O `index.html` usa módulos JavaScript, por isso precisa ser servido por um servidor (GitHub Pages ou `npx serve .`). Para abrir com duplo clique, sem servidor, use `dist/jaguarete.html`, que é o jogo inteiro num arquivo só.

## Estrutura

```
index.html            página do jogo (módulos ES, sem etapa de compilação)
estilo.css            visual, com tema claro e escuro
js/dados.js           parâmetros: preços, biomas, modelo ecológico, fazendeiros
js/motor.js           regras, modelo presa-predador, economia e fazendeiros do computador (sem DOM)
js/textos.js          textos "na natureza" e regras resumidas
js/interface.js       mapa SVG, painel, relatórios e gráficos
dist/jaguarete.html   versão em arquivo único (gerada)
sim/                  simulação de Monte Carlo usada no balanceamento
ferramentas/          script que gera dist/jaguarete.html
```

Comandos (Node 18 ou mais recente):

```
npm install          # instala o esbuild, usado só para gerar o arquivo único
npm run build        # gera dist/jaguarete.html
npm run sim          # roda 300 partidas por bioma e estratégia e grava sim/resultados.json
```

Para trocar os ícones pelas ilustrações, substitua os `<symbol>` no fim do `index.html`. Os ids (`i-boi`, `i-carneiro`, `i-galinha`, `i-sede`, `i-pegada` etc.) são usados pelo mapa e pela legenda.

## O modelo ecológico

A cada estação o motor integra, em 8 subpassos, um modelo de Rosenzweig-MacArthur com resposta funcional de Holling tipo II para duas presas. A primeira presa são as silvestres; a segunda é o rebanho exposto na borda da mata, menos preferido. O modelo inclui ainda mesopredadores suprimidos pela onça.

```
dN/dt = r·N·(1 − N/K) − J·f(N)              presas silvestres
dJ/dt = J·[e·f(N) + e·g(L) − m] − q·J² + I  jaguares (q: território; I: imigração)
f(N)  = a·N  / (1 + a·h·N + a'·h·L)          resposta funcional de Holling tipo II
g(L)  = a'·L / (1 + a·h·N + a'·h·L)          ataques ao rebanho exposto (L)
dP/dt = s·P·(1 − P) − c·J·P                  pequenos predadores (P)
```

- **K, o limite de presas silvestres:** é a soma da contribuição de cada área (mata 1,0; água 0,6; capoeira 0,5; campo nativo 0,4). Cai a cada desmate.
- **L, a exposição do rebanho:** vem dos animais em pastos vizinhos à mata. Cerca elétrica, animais de guarda e curral noturno reduzem esse valor.
- **Jaguares no mapa:** o número esperado de ataques (∫J·g dt) vira um sorteio de Poisson, e cada ataque cai num pasto exposto perto de um jaguar. Os jaguares do mapa acompanham a população contínua J: quando J sobe, surge um jaguar; quando cai, um some.

Com os parâmetros padrão, Pantanal e Amazônia mostram oscilações amortecidas: o pico de jaguares vem por volta do ano 3, depois do pico de presas. O plano de fase, no fim da partida, mostra a espiral.

## Balanceamento

Resultado de `npm run sim` com 300 partidas por bioma e estratégia (semente 20261116). Cada coluna é uma estratégia de teste para a fazenda da pessoa:

- **Conviver:** cercas na borda, compensação, cotas de reserva, manejo de javaporcos e expansão só dentro da lei.
- **Desmatar legal:** abre pasto até o limite da reserva.
- **Passiva:** só repõe animais.
- **Abater:** chama o matador após cada ataque.
- **Desmatar e abater:** combina as duas anteriores.

Vitória (%) e patrimônio médio (R$ mil):

| Bioma    | Conviver | Desmatar legal | Passiva | Abater | Desmatar e abater |
|----------|---------:|---------------:|--------:|-------:|------------------:|
| Pantanal | 67% · 504 | 0% · 153 | 0% · 122 | 0% · 72 | 0% · 90 |
| Amazônia | 87% · 515 | 9% · 305 | 9% · 304 | 0% · 159 | 0% · 22 |
| Cerrado  | 60% · 773 | 10% · 485 | 0% · 350 | 0% · 203 | 0% · 239 |
| Caatinga | 9% · 240 | 67% · 320 | 45% · 293 | 2% · 160 | 0% · 162 |
| Araripe  | 60% · 699 | 78% · 786 | 0% · 485 | 0% · 284 | 0% · 275 |

Onde há javaporcos, "conviver" inclui chamar os caçadores de manejo quando os porcos ocupam mais de 30% da capacidade. Sem o manejo, a mesma estratégia cai para 10% de vitórias no Pantanal, 68% na Amazônia e 2% no Cerrado. No Araripe, desmatar dentro da Zona de Produção é o que mais rende ao fazendeiro. O soldadinho termina com 75% a 81% da população inicial, pressionado pelo fogo e pelo desmate no alto da chapada.

Na Caatinga há poucos jaguares e poucos ataques. Lá, desmatar até o limite legal rende mais ao fazendeiro, enquanto a população de jaguares cai de 3 para cerca de 1,5 em dez anos.

## Referências

AZEVEDO, F. C. et al. Avaliação do risco de extinção da onça-parda *Puma concolor* (Linnaeus, 1771) no Brasil. **Biodiversidade Brasileira**, v. 3, n. 1, p. 107-121, 2013.

BRASIL. Lei nº 9.605, de 12 de fevereiro de 1998. Dispõe sobre as sanções penais e administrativas derivadas de condutas e atividades lesivas ao meio ambiente. Brasília, DF, 1998.

BRASIL. Lei nº 12.651, de 25 de maio de 2012. Dispõe sobre a proteção da vegetação nativa. Brasília, DF, 2012.

BRASIL DE FATO. Refúgios de vida silvestre do soldadinho-do-araripe fortalecem luta contra extinção de única ave exclusiva do Ceará. 13 jan. 2026. Disponível em: https://www.brasildefato.com.br/2026/01/13/refugios-de-vida-silvestre-do-soldadinho-do-araripe-fortalecem-luta-contra-extincao-de-unica-ave-exclusiva-do-ceara/.

DIÁRIO DO NORDESTE. Plano de Manejo da Chapada do Araripe não elimina proteção ambiental, diz ICMBio. 27 ago. 2026. Disponível em: https://diariodonordeste.verdesmares.com.br/ceara/plano-de-manejo-da-chapada-do-araripe-nao-elimina-protecao-ambiental-diz-icmbio-1.3787491.

CAVALCANTI, S. M. C.; PAULA, R. C.; GASPARINI-MORATO, R. L. (org.). **Conflitos com mamíferos carnívoros**: uma referência para o manejo e a convivência. Brasília: ICMBio; Atibaia: CENAP, 2015.

CORDEIRO, J. L. P. et al. Achilles heel of a powerful invader: restrictions on distribution and disappearance of feral pigs from a protected area in Northern Pantanal, Western Brazil. **PeerJ**, v. 6, e4200, 2018. DOI: https://doi.org/10.7717/peerj.4200.

CROOKS, K. R.; SOULÉ, M. E. Mesopredator release and avifaunal extinctions in a fragmented system. **Nature**, v. 400, p. 563-566, 1999. DOI: https://doi.org/10.1038/23028.

HOLLING, C. S. Some characteristics of simple types of predation and parasitism. **The Canadian Entomologist**, v. 91, n. 7, p. 385-398, 1959.

HOLT, R. D. Predation, apparent competition, and the structure of prey communities. **Theoretical Population Biology**, v. 12, n. 2, p. 197-229, 1977.

HOOGESTEIJN, R.; HOOGESTEIJN, A. Conflicts between cattle ranching and large predators in Venezuela: could use of water buffalo facilitate felid conservation? **Oryx**, v. 42, n. 1, p. 132-138, 2008. DOI: https://doi.org/10.1017/S0030605308001105.

IBAMA. **Relatório técnico de gestão do manejo de javalis no Brasil: 2013 a 2016**. Brasília: Ibama, 2019. Disponível em: https://www.ibama.gov.br/phocadownload/javali/2019/Ibama-relatorio_javali_2013_a_2016_final.pdf.

IBAMA. **Plano Nacional de Prevenção, Controle e Monitoramento do Javali (Sus scrofa) no Brasil**. Brasília: Ibama, 2017. Disponível em: https://www.ibama.gov.br/phocadownload/javali/2017/2017-PlanoJavali-2017.2022.pdf.

IBAMA. Instrução Normativa nº 3/2013, alterada pela Instrução Normativa nº 12, de 25 de março de 2019 (manejo e controle do javali; SIMAF). Ver: https://www.gov.br/ibama/pt-br/assuntos/biodiversidade/especies-exoticas-invasoras/manejo-e-controle-do-javali.

LOTKA, A. J. **Elements of physical biology**. Baltimore: Williams & Wilkins, 1925.

MORATO, R. G. et al. Avaliação do risco de extinção da onça-pintada *Panthera onca* (Linnaeus, 1758) no Brasil. **Biodiversidade Brasileira**, v. 3, n. 1, p. 122-132, 2013.

MOVIMENTO ECONÔMICO. Plano de manejo destina 89,86% da APA da Chapada do Araripe ao agronegócio. 15 ago. 2026. Disponível em: https://movimentoeconomico.com.br/agronegocio/2026/08/15/plano-de-manejo-destina-8986-da-apa-da-chapada-do-araripe-ao-agronegocio/.

O ECO. Onça-pintada e tamanduá-bandeira estão provavelmente extintos no Ceará. 2022. Disponível em: https://oeco.org.br/reportagens/onca-pintada-e-tamandua-bandeira-estao-provavelmente-extintos-no-ceara/.

REALTIME1. Exóticos e perigosos, javalis estão nas portas do Amazonas. 23 out. 2023. Disponível em: https://realtime1.com.br/exoticos-e-perigosos-javalis-estao-nas-portas-do-amazonas/.

ROSENZWEIG, M. L.; MACARTHUR, R. H. Graphical representation and stability conditions of predator-prey interactions. **The American Naturalist**, v. 97, n. 895, p. 209-223, 1963.

VOLTERRA, V. Fluctuations in the abundance of a species considered mathematically. **Nature**, v. 118, p. 558-560, 1926.

## Créditos

Concepção: Apiano Ferreira Morais. Código, modelo e textos desenvolvidos com apoio do assistente de inteligência artificial Claude (Anthropic), sob direção do autor.
