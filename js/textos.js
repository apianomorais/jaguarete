// Textos "Na natureza": a ciência por trás de cada regra. Referências completas no README.
export const NATUREZA = {
  modelo: {
    titulo: 'Presa e predador',
    texto: 'Os jaguares e as presas silvestres seguem um modelo clássico de presa e predador. As presas crescem até o limite que a vegetação suporta. Cada jaguar come mais quando há mais presas, mas há um teto para o que consegue caçar numa estação (resposta funcional de Holling tipo II). Com comida sobrando, nascem mais jaguares; com mais jaguares, as presas diminuem; com menos presas, os jaguares passam fome e diminuem, e o ciclo recomeça. O pico de jaguares vem sempre depois do pico de presas.',
    ref: 'Lotka (1925); Volterra (1926); Holling (1959); Rosenzweig e MacArthur (1963).',
  },
  ataque: {
    titulo: 'Por que o jaguar ataca o rebanho',
    texto: 'Jaguares preferem capivaras, queixadas, veados e jacarés. No jogo, o rebanho que fica na borda da mata é uma segunda presa no mesmo modelo: quanto menos presas silvestres, maior a fração da caça que recai sobre bois e carneiros. Animais longe da mata, cercados ou recolhidos à noite ficam fora do cardápio.',
    ref: 'Holling (1959); Morato et al. (2013).',
  },
  desmate: {
    titulo: 'Menos mata, menos presas',
    texto: 'Cada área desmatada reduz o limite de presas silvestres que a região sustenta. Com menos presas, a mesma paisagem sustenta menos jaguares, e os que restam ficam mais perto do pasto. A perda e a fragmentação do habitat são a principal ameaça ao jaguar (onça-pintada) no Brasil.',
    ref: 'Morato et al. (2013).',
  },
  abate: {
    titulo: 'O que muda quando um jaguar morre',
    texto: 'Matar jaguar é crime ambiental (Lei nº 9.605/1998, art. 29), e a caça em retaliação a ataques ao rebanho está entre as principais ameaças à espécie. Sem o jaguar, gambás e cachorros-do-mato se multiplicam e atacam galinheiros: é a liberação de mesopredadores. As presas silvestres também crescem e passam a disputar o pasto. No jogo, o território vago ainda atrai jovens jaguares em dispersão, que se arriscam mais perto das fazendas.',
    ref: 'Crooks e Soulé (1999); Morato et al. (2013).',
  },
  desmate_araripe: {
    titulo: 'Menos mata, menos presas',
    texto: 'Cada área desmatada reduz o limite de presas silvestres, como tatus, cotias e veados, que sustentam a suçuarana. A perda e a fragmentação do habitat, ligadas à expansão agropecuária, estão entre as principais ameaças à espécie. Na APA, o novo plano de manejo só admite abrir área na Zona de Produção, fora das APPs e respeitando a reserva legal.',
    ref: 'Azevedo et al. (2013); ICMBio (2026).',
  },
  ataque_araripe: {
    titulo: 'Por que a suçuarana ataca o rebanho',
    texto: 'A suçuarana prefere presas silvestres de porte médio. No jogo, o rebanho na borda da mata é uma segunda presa no mesmo modelo, e os carneiros pesam mais que os bois, porque ela ataca sobretudo ovinos, caprinos e bezerros. Quanto menos presas silvestres, maior a fração de ataques ao rebanho.',
    ref: 'Holling (1959); Azevedo et al. (2013).',
  },
  abate_araripe: {
    titulo: 'O que muda quando uma suçuarana morre',
    texto: 'Matar suçuarana é crime ambiental (Lei nº 9.605/1998, art. 29), e a retaliação por ataques a animais domésticos está entre as principais ameaças à espécie. Sem ela, gambás e raposas se multiplicam e atacam galinheiros, e as presas silvestres crescem a ponto de disputar o pasto.',
    ref: 'Azevedo et al. (2013); Crooks e Soulé (1999).',
  },
  fogo_araripe: {
    titulo: 'Fogo na Chapada',
    texto: 'Na seca, o fogo corre pelo cerrado do alto da chapada e pode descer a encosta, transformando a mata úmida das nascentes em capoeira, que leva anos para voltar a ser mata. O novo plano de manejo limita o uso do fogo em toda a APA, e aceiros ajudam a conter as queimadas.',
    ref: 'ICMBio (2026).',
  },
  monitoramento_araripe: {
    titulo: 'Contar suçuaranas',
    texto: 'Armadilhas fotográficas registram suçuaranas, jaguatiricas, gatos-mouriscos e cotias na Chapada do Araripe. Como a suçuarana não tem rosetas, reconhecer cada indivíduo pelas fotos é mais difícil: pesquisadores usam cicatrizes e outras marcas, além de colares GPS, que mostram por onde ela anda.',
    ref: null,
  },
  herbivoros_araripe: {
    titulo: 'Cascata trófica',
    texto: 'Sem predadores suficientes, caititus, veados e cotias se multiplicam e comem pasto e roça. O predador do topo controla, de forma indireta, a vegetação que está dois níveis abaixo dele na cadeia alimentar.',
    ref: 'Rosenzweig e MacArthur (1963).',
  },
  mesopredador: {
    titulo: 'Liberação de mesopredadores',
    texto: 'Os grandes felinos caçam e intimidam predadores menores. Quando eles somem, esses mesopredadores aumentam e passam a atacar presas pequenas, como aves. O efeito foi descrito em fragmentos de mata na Califórnia, onde a ausência de coiotes coincidiu com mais gatos e gambás e menos aves.',
    ref: 'Crooks e Soulé (1999).',
  },
  mesopredador_caatinga: {
    titulo: 'A raposa no galinheiro',
    texto: 'No Nordeste, raposa é o nome popular do cachorro-do-mato. Tolerante à presença humana, ele visita as fazendas à noite e eventualmente ataca aves domésticas. Na Caatinga, onde o jaguar quase desapareceu, predadores médios como a raposa ficam mais livres: é a liberação de mesopredadores. O guia do ICMBio sobre conflitos com carnívoros lembra que o cachorro-do-mato muitas vezes leva a culpa por perdas causadas por outros animais noturnos. Galinheiro fechado à noite resolve a maior parte do problema.',
    ref: 'Cavalcanti, Paula e Gasparini-Morato (2015); Crooks e Soulé (1999).',
  },
  herbivoros: {
    titulo: 'Cascata trófica',
    texto: 'Sem predadores suficientes, capivaras e queixadas se multiplicam e comem pasto e roça. O predador do topo controla, de forma indireta, a vegetação que está dois níveis abaixo dele na cadeia alimentar.',
    ref: 'Rosenzweig e MacArthur (1963).',
  },
  defesa: {
    titulo: 'Proteger sem matar',
    texto: 'Cercas elétricas, currais noturnos e animais de guarda reduzem os ataques sem matar o predador. Na Venezuela, em seis fazendas estudadas, a chance de um bovino ser morto por predadores foi cerca de 25 vezes maior que a de um búfalo, que se defende em grupo.',
    ref: 'Hoogesteijn e Hoogesteijn (2008).',
  },
  monitoramento: {
    titulo: 'Contar jaguares',
    texto: 'Pesquisadores contam jaguares com armadilhas fotográficas: cada um tem um padrão próprio de rosetas, que identifica o indivíduo nas fotos. Colares GPS mostram por onde o jaguar anda e ajudam a prever onde o rebanho corre mais risco.',
    ref: null,
  },
  cheia: {
    titulo: 'O pulso das águas',
    texto: 'No Pantanal, a cheia cobre os campos nativos e empurra animais silvestres e gado para as partes altas. Os campos voltam a render quando a água baixa. O jaguar (onça-pintada) foi avaliado como vulnerável no Pantanal.',
    ref: 'Morato et al. (2013).',
  },
  seca: {
    titulo: 'Semiárido',
    texto: 'Na Caatinga, o jaguar (onça-pintada) foi avaliado como criticamente em perigo. Sem a vegetação nativa, o solo do semiárido fica exposto, perde água e fertilidade, e o pasto rende cada vez menos na seca. No jogo, quanto menos vegetação nativa na fazenda, menor a capacidade do pasto na seca.',
    ref: 'Morato et al. (2013).',
  },
  fogo: {
    titulo: 'Fogo no Cerrado',
    texto: 'Na seca, o fogo corre pelos campos do Cerrado e pode transformar mata em capoeira, que leva anos para voltar a ser mata. O jaguar (onça-pintada) foi avaliado como em perigo no Cerrado.',
    ref: 'Morato et al. (2013).',
  },
  reserva: {
    titulo: 'Reserva legal',
    texto: 'O Código Florestal obriga cada imóvel rural a manter parte da vegetação nativa como reserva legal: 80% nas áreas de floresta da Amazônia Legal, 35% no cerrado dentro da Amazônia Legal e 20% nas demais regiões. No jogo, o Cerrado usa a regra de 20%, válida fora da Amazônia Legal.',
    ref: 'Lei nº 12.651/2012, art. 12.',
  },
  cra: {
    titulo: 'Cota de Reserva Ambiental',
    texto: 'Quem mantém vegetação nativa além do exigido pode emitir Cotas de Reserva Ambiental e vendê-las a quem precisa compensar falta de reserva legal. No jogo, cada área nativa acima da reserva rende um pouco por estação depois do registro.',
    ref: 'Lei nº 12.651/2012, art. 44.',
  },
  onca_parda: {
    titulo: 'Suçuarana',
    texto: 'O jaguar (onça-pintada) é considerado provavelmente extinto no Ceará pela lista estadual de mamíferos ameaçados de 2022. Na Chapada do Araripe, as armadilhas fotográficas registram a suçuarana, nome tupi da onça-parda. Ela é oportunista e prefere presas de uns 15 kg, como tatus, cotias e veados; entre os animais domésticos, ataca mais ovinos, caprinos e bezerros. Está avaliada como vulnerável no Brasil e em perigo na Caatinga.',
    ref: 'Azevedo et al. (2013); lista de mamíferos ameaçados do Ceará (2022).',
  },
  plano: {
    titulo: 'O novo plano de manejo',
    texto: 'O plano de manejo da APA Chapada do Araripe, aprovado pelo ICMBio em agosto de 2026, dividiu a APA em zonas. A Zona de Produção, com 89,86% da área (cerca de 914 mil hectares), admite agricultura, pecuária e silvicultura, respeitando reserva legal, APP e licenciamento. Nas zonas de Uso Moderado só cabem roças de subsistência, e nas de Uso Restrito não se abrem áreas novas. Em toda a APA ficam proibidas a pulverização aérea de agrotóxicos e o plantio de transgênicos, o fogo é limitado e novas captações de água devem ficar a 50 metros das nascentes.',
    ref: 'ICMBio, plano de manejo da APA Chapada do Araripe (2026).',
  },
  soldadinho: {
    titulo: 'Soldadinho-do-araripe',
    texto: 'O soldadinho-do-araripe, ave criticamente em perigo e exclusiva do Ceará, vive nas matas úmidas da encosta da Chapada, ligadas às nascentes. A mata em volta de cada nascente é Área de Preservação Permanente, num raio mínimo de 50 metros. Em 2025 foi criado o Refúgio de Vida Silvestre do Soldadinho-do-Araripe, com cerca de 5.540 hectares em Crato, Barbalha e Missão Velha. No jogo, a população dele depende da mata em volta das nascentes, da recarga de água no alto da chapada e do fogo.',
    ref: 'Lei nº 12.651/2012, art. 4º; Brasil de Fato (2026).',
  },
  recarga: {
    titulo: 'A chapada é uma esponja',
    texto: 'A Chapada do Araripe é área de recarga das nascentes, aquíferos e rios que abastecem o Cariri: a chuva infiltra no alto e brota na encosta. No jogo, quanto menos vegetação nativa no alto da chapada, mais fracas correm as nascentes do vale na seca, o que reduz o pasto das fazendas de baixo e o habitat do soldadinho. É uma simplificação: o jogo não calcula a água de verdade.',
    ref: null,
  },
  javaporco: {
    titulo: 'Javaporco',
    texto: 'O javali (Sus scrofa) é uma das cem piores espécies exóticas invasoras do mundo, segundo a IUCN, e cruza com o porco doméstico, dando o javaporco. Ele revira o solo, provoca erosão e assoreamento e destrói lavouras. Em cerca de duas décadas, espalhou-se principalmente pelo Pampa, pela Mata Atlântica e pelo Cerrado.',
    ref: 'Plano Nacional do Javali (Ibama, 2017).',
  },
  javaporco_pantanal: {
    titulo: 'Porco-monteiro',
    texto: 'O porco-monteiro descende de porcos domésticos que se asselvajaram no Pantanal há mais de dois séculos. É da mesma espécie do javali (Sus scrofa), vive sobretudo onde há campo e pastagem e fuça os campos em busca de raízes. No jogo, ele reduz o pasto e serve de presa para o jaguar.',
    ref: 'Plano Nacional do Javali (Ibama, 2017); Cordeiro et al. (2018).',
  },
  javaporco_amazonia: {
    titulo: 'Javaporcos na Amazônia',
    texto: 'O javali avança em direção à Amazônia: o sistema do Ibama para manejo de fauna (SIMAF) registra varas no Acre, em Rondônia e no norte de Mato Grosso, na divisa com o Amazonas, desde 2018. No jogo, a invasão começa pequena; sem controle, ela cresce rápido.',
    ref: 'SIMAF, segundo RealTime1 (2023).',
  },
  manejo: {
    titulo: 'Caçadores de manejo',
    texto: 'O controle do javali é permitido por manejadores inscritos no Cadastro Técnico Federal, com autorização emitida pelo SIMAF e relatório ao fim de cada autorização, que vale no máximo 3 meses. Armas de fogo precisam de registro no Exército. A autorização vale para o javali e o javaporco: abater jaguar, caititu ou qualquer outro animal nativo continua sendo crime. Como os javaporcos se reproduzem rápido, o controle só funciona se for contínuo e feito por muitas propriedades.',
    ref: 'IN Ibama nº 3/2013; IN Ibama nº 12/2019.',
  },
  competicao: {
    titulo: 'Competição aparente',
    texto: 'Uma presa invasora que se multiplica rápido pode alimentar mais predadores, que então caçam também as presas nativas e o rebanho. É a competição aparente. No jogo, o jaguar também caça os porcos asselvajados: eles o sustentam, mas empurram a população dele para cima.',
    ref: 'Holt (1977).',
  },
  aceiro: {
    titulo: 'Aceiros',
    texto: 'Aceiros são faixas sem vegetação que impedem o fogo de passar. Na Chapada do Araripe, o fogo na seca ameaça a mata da encosta onde vive o soldadinho, e o novo plano de manejo limita o uso do fogo em toda a APA.',
    ref: null,
  },
  grilagem: {
    titulo: 'Grilagem',
    texto: 'Grilagem é a apropriação ilegal de terra alheia ou pública. Deslocar cerca ou marco para se apropriar de imóvel alheio é crime de alteração de limites (Código Penal, art. 161), e invadir terras públicas para ocupá-las também é crime (Lei nº 4.947/1966, art. 20). No jogo, cercar a terra aberta de um vizinho, ou uma unidade de conservação, tira o seu selo; a cada estação, a Justiça pode devolver a área e multar quem grilou.',
    ref: 'Código Penal, art. 161; Lei nº 4.947/1966, art. 20.',
  },
  dano: {
    titulo: 'Derrubar a cerca do vizinho',
    texto: 'Destruir coisa alheia, como a cerca de um vizinho, é crime de dano (Código Penal, art. 163), e quem causa o prejuízo responde também pela indenização. Quem tem a terra invadida pode retomá-la pela própria força, desde que o faça logo e sem ir além do necessário: é o desforço imediato (Código Civil, art. 1.210, § 1º). Passada essa hora, retomar por conta própria é fazer justiça com as próprias mãos (Código Penal, art. 345), e o caminho é a Justiça.',
    ref: 'Código Penal, arts. 163 e 345; Código Civil, art. 1.210, § 1º.',
  },
  cercas: {
    titulo: 'Cercas e mourões',
    texto: 'Uma cerca de arame depende dos mourões, as estacas que a sustentam. Madeira tirada da própria mata e sem tratamento apodrece mais rápido; eucalipto tratado dura mais; mourões de concreto duram décadas e não queimam. No jogo, o custo de cercar depende de quantos lados da área ficam expostos: áreas juntas saem mais baratas.',
    ref: null,
  },
  compensacao: {
    titulo: 'Compensação por ataques',
    texto: 'Alguns projetos de conservação pagam ao fazendeiro parte do valor dos animais mortos por grandes felinos, desde que não haja retaliação. A ideia é dividir o custo de conviver com um animal que interessa a todos.',
    ref: null,
  },
};

// Escolhe o texto mais relevante para o relatório da estação.
export function dicaDaEstacao(st, rel, vistos) {
  const ja = st.dicasVistas || (st.dicasVistas = []);
  const cands = [];
  const meus = rel.ataques.filter(a => a.dono === 0);
  if (rel.abateNestaEstacao) cands.push('abate');
  if (meus.length) cands.push('ataque', 'defesa');
  if (rel.fazendas[0].perdas.galinha > 0 && st.onca.M > 0.4) cands.push('mesopredador');
  if (rel.eventos.some(e => e.startsWith('Capivaras') || e.startsWith('Caititus'))) cands.push('herbivoros');
  if (rel.eventos.some(e => e.startsWith('Cheia'))) cands.push('cheia');
  if (rel.eventos.some(e => e.startsWith('Seca'))) cands.push('seca');
  if (rel.eventos.some(e => e.startsWith('Fogo'))) cands.push('fogo');
  if (vistos.fotos.length) cands.push('monitoramento');
  if (rel.desmateNestaEstacao) cands.push('desmate', 'reserva');
  const araripe = st.bioma === 'araripe';
  if (rel.manejoNestaEstacao) cands.unshift('manejo');
  if (rel.grilagemNestaEstacao || rel.eventos.some(e => (e.includes('cercou') && e.includes('sem cerca')) || e.includes('devolve'))) cands.unshift('grilagem');
  if (rel.derrubouNestaEstacao || rel.derrubaramSuaCerca) cands.unshift('dano');
  if (rel.cercouNestaEstacao) cands.push('cercas');
  if (rel.javaporco > 0.3) cands.push('javaporco', 'competicao');
  if (araripe) {
    if (rel.soldadinho && rel.soldadinho.depois < rel.soldadinho.antes - 0.03) cands.push('soldadinho');
    if (rel.recarga != null && rel.recarga < 0.9) cands.push('recarga');
    if (rel.desmateNestaEstacao) cands.unshift('plano');
    if (rel.eventos.some(e => e.startsWith('Fogo'))) cands.push('aceiro');
  }
  if (st.bioma === 'caatinga' && rel.fazendas[0].perdas.galinha > 0) cands.unshift('mesopredador');
  if (rel.t === 0) cands.unshift(araripe ? 'onca_parda' : 'modelo');
  if (araripe) cands.push('plano', 'soldadinho', 'recarga', 'onca_parda', 'aceiro');
  if (rel.javaporco != null) cands.push('javaporco', 'manejo', 'competicao');
  cands.push('modelo', 'cercas', 'ataque', 'defesa', 'grilagem', 'desmate', 'reserva', 'cra', 'compensacao', 'monitoramento');
  const id = cands.find(c => !ja.includes(c)) || cands[0];
  ja.push(id);
  const n = NATUREZA[`${id}_${st.bioma}`] || NATUREZA[id];
  return { id, ...n };
}

export const COMO_JOGAR = [
  ['Objetivo', 'Termine os 10 anos (20 estações) com o maior patrimônio: dinheiro em caixa mais o valor do rebanho. Você disputa com três fazendas vizinhas controladas pelo computador.'],
  ['Cada estação', 'Você tem 3 ações: cercar, desmatar, deixar a mata voltar, instalar defesas, pôr câmeras, capturar um jaguar para pôr colar ou chamar o matador. Comprar, vender e mover animais não gasta ação.'],
  ['Cercas e terra', 'As divisas são abertas: a posse de cada área é de quem a cerca. Animais só ficam em pasto cercado. Cercar custa por lado exposto; as estacas podem vir do seu desmate, de madeira tratada ou de concreto, que não apodrece. Cercar a terra aberta de um vizinho é grilagem: dá área, mas tira o selo e a Justiça pode devolvê-la e multar. Derrubar a cerca de um vizinho solta os animais dele, que se espalham, se perdem e viram presa fácil; é crime de dano, salvo quando você retoma logo a própria terra que ele acabou de cercar.'],
  ['Os vizinhos', 'A cada partida, três vizinhos são sorteados de um elenco de sete: um cuidadoso, um tradicional e um encrenqueiro, em lugares sorteados do mapa. Cada um tem o seu jeito de lidar com a mata, os felinos e a lei. Quem tem a terra grilada ou a cerca derrubada guarda rancor, e os vingativos revidam.'],
  ['Os jaguares', 'Vivem na mata e ninguém os vê. Você descobre por onde andam pelas pegadas na sua terra, pelas fotos das câmeras, pelos ataques e pelos colares GPS. Eles comem presas silvestres; quando faltam presas, atacam o rebanho que fica na borda da mata.'],
  ['A mata', 'A mata sustenta as presas silvestres, que sustentam os jaguares. Desmatar dá pasto, mas reduz as presas e deixa mais rebanho na borda. Abaixo da reserva legal, você perde o selo e pode ser multado.'],
  ['O selo', 'Fazendas que não matam jaguares e respeitam a reserva legal têm um selo que paga 20% a mais pela produção e pelo rebanho, e podem aderir à compensação por ataques. Quem perde o selo o recupera depois de dois anos sem nova infração.'],
  ['O matador', 'Abater um jaguar é crime. O jogo permite, mas você perde o selo, arrisca multa, e a ausência do jaguar mexe na cadeia alimentar: mais pequenos predadores nas galinhas, mais capivaras no pasto e jovens jaguares ocupando o território vago.'],
];
