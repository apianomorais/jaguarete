// Dados e parâmetros do jogo. Valores em "mil reais" (R$ mil); uma rodada = uma estação (chuva ou seca).

export const RODADAS = 20;            // 10 anos
export const ACOES_POR_RODADA = 3;
export const W = 11, H = 9;           // mapa hexagonal (linhas ímpares deslocadas)

export const ESPECIES = {
  boi:      { nome: 'boi', plural: 'bois', compra: 18, venda: 15, renda: 2.3, repro: 0.15, presa: 1.0 },
  carneiro: { nome: 'carneiro', plural: 'carneiros', compra: 6, venda: 5, renda: 0.9, repro: 0.25, presa: 0.6 },
};
export const GALINHA = { nome: 'lote de galinhas', plural: 'lotes de galinhas', compra: 4, venda: 3, renda: 1, repro: 0.3, cap: 6 };

export const CUSTOS = { desmatar: 8, reflorestar: 5, cerca: 5, justica: 3, guarda: 8, curral: 4, telar: 6, ampliar: 6,
                        camera: 4, colar: 12, matador: 8, seguro: 0, cra: 5, manejo: 5, aceiro: 3,
                        derrubar: 0, derrubarConcreto: 10, recolher: 2 };
export const CRA_POR_CELULA = 0.5;  // renda por célula de vegetação nativa acima da reserva legal, por estação
export const MANUTENCAO = { pasto: 1, cerca: 1, seguro: 2 };
export const MULTA = { desmateCelula: 12, abate: 40, abateReserva: 80, app: 30, zona: 20, grilagem: 15, grilagemUC: 40, dano: 10, indenizacao: 10 };
// Cercas: a posse de cada área é de quem a cercou. O custo é por lado exposto do hexágono (lado que não encosta
// em outra área cercada pela mesma fazenda). Estacas da mata vêm do próprio desmate; madeira e concreto se compram.
export const CERCAS = {
  nativa:   { nome: 'estacas da mata', preco: 0,   validade: 6 },
  madeira:  { nome: 'madeira tratada', preco: 1.2, validade: 10 },
  concreto: { nome: 'concreto',        preco: 2.5, validade: 999 },
};
export const ESTACAS_DESMATE = { mata: 4, capoeira: 2, campo: 0 }; // lotes de estacas (um lote cerca um lado)
// Justiça: chance por estação de decidir um caso. Em terra particular, a grilagem sem violência (Código Penal, art. 161, § 3º)
// e o crime de dano (art. 167) só são processados por queixa do dono: sem processo, nada acontece ("base" e "dano" = 0).
// Na reserva e nas unidades de conservação, o poder público age sozinho ("uc"). Com processo aberto, a chance sobe para "acionada".
// Quem teve a cerca derrubada tem "prazoQueixa" estações para processar; depois, o direito de queixa decai.
export const JUSTICA = { base: 0, uc: 0.3, acionada: 0.6, dano: 0, prazoQueixa: 2 };
// Usucapião (Código Civil, art. 1.238): a posse sem oposição de terra particular grilada vira propriedade de quem cercou.
// Prazos comprimidos para caber nos 10 anos do jogo: 8 estações em que a área foi usada (pasto com animais), como os
// 10 anos com uso produtivo, ou 12 estações de posse sem uso, como os 15 anos. Terra pública nunca (Constituição, art. 191).
export const USUCAPIAO = { comUso: 8, semUso: 12, alerta: 2 };
// Chance, por estação, de um fazendeiro do computador perceber que cercaram a terra dele (a pessoa sempre é avisada):
// mata parada é vigiada menos que pasto, e quem monitora a fazenda com câmeras percebe mais.
export const VIGILANCIA = { mata: 0.12, pasto: 0.25, monitora: 0.3 };
export const DESFORCO = 1;            // estações em que o dono pode derrubar a cerca de quem grilou a sua terra sem cometer crime
// Animais soltos (cerca derrubada ou caída): a cada estação cada animal vai para uma área aberta vizinha com chance "difusao",
// some com chance "extravio", e fica mais exposto aos predadores na mata ("mata" multiplica a exposição).
export const SOLTOS = { difusao: 0.5, extravio: 0.1, mata: 2 };
export const SELO_VOLTA = 4;          // estações sem nova infração para recuperar o selo (dois anos)
export const SELO_BONUS = 0.2;        // selo de pecuária que convive com o predador: +20% na receita e no valor do rebanho
export const VENDA_FORCADA = 0.6;     // excesso de animais vendido às pressas
export const JUROS_DIVIDA = 0.1;
export const MAX_CAMERAS = 4;

// Redução da exposição do rebanho ao ataque (multiplicativas).
export const DEFESAS = { cerca: 0.2, guarda: 0.5, curral: 0.4 };

// Contribuição de cada tipo de célula para a capacidade de suporte das presas silvestres (K) e para o habitat da onça.
export const TIPOS = {
  mata:     { nome: 'Mata', nativa: true,  K: 1.0, habitat: 1.0 },
  capoeira: { nome: 'Capoeira', nativa: true, K: 0.5, habitat: 0.6 },
  campo:    { nome: 'Campo nativo', nativa: true, K: 0.4, habitat: 0.4 },
  agua:     { nome: 'Água', nativa: true, K: 0.6, habitat: 0.8 },
  pasto:    { nome: 'Pasto', nativa: false, K: 0, habitat: 0 },
  sede:     { nome: 'Sede', nativa: false, K: 0, habitat: 0 },
};
// Capacidade de pastejo por célula.
export const CAPACIDADE = { pasto: { boi: 3, carneiro: 8 }, campo: { boi: 2, carneiro: 5 } };

// Modelo presa-predador (Rosenzweig-MacArthur com resposta funcional de Holling tipo II para duas presas,
// mais mesopredadores suprimidos pela onça). Unidades: presas em "unidades de presa", onças em indivíduos.
export const MODELO = {
  a: 0.1,      // taxa de ataque às presas silvestres (por onça, por unidade de presa, por estação)
  h: 1 / 30,   // tempo de manipulação: no máximo 30 unidades de presa por onça por estação
  pref: 0.25,  // preferência relativa pelo rebanho (a2 = a·pref); onças preferem presas silvestres
  e: 0.04,     // conversão de alimento em novas onças
  eRebanho: 0.04,
  m: 0.5,      // mortalidade e emigração por estação
  rm: 0.8,     // crescimento dos mesopredadores (gambás, raposas, iraras)
  cm: 0.07,    // supressão dos mesopredadores por onça
  perdaGalinha: 0.25, // fração de lotes perdidos por estação com mesopredadores no máximo
  passos: 8,   // subpassos de integração por estação
  ousadoPref: 1.5, // jovens dispersores atacam mais o rebanho
  territorio: 0.1, // autolimitação da onça por território (0 = Rosenzweig-MacArthur puro)
};

export const BIOMAS = {
  pantanal: {
    id: 'pantanal', nome: 'Pantanal', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'vulnerável',
    resumo: 'Planície que alaga na chuva. Muitas presas e a maior densidade de jaguares: o campo nativo alimenta o gado sem desmatar, mas fica submerso na cheia. Porcos-monteiros, asselvajados há mais de dois séculos, fuçam os campos.',
    reservaLegal: 0.2, Kcel: 10, r: 0.9, J0: 7, Jcap: 9, imigracao: 0.15, pegada: 0.45,
    fiscalDesmate: 0.2, fiscalAbate: 0.25, regen: 6, passos: 2, custoDesmate: 8,
    evento: 'cheia', agua: 9, campo: 16, pastoInicial: 2,
    javaporco: { nome: 'porco-monteiro', plural: 'porcos-monteiros', V0: 0.5, r: 0.8, Kcel: 3, preferencia: 0.6, conversao: 0.03, dano: 0.4 },
    rebanho: [['boi', 3], ['boi', 3], ['boi', 2]], caixa: 50,
    capCarneiro: 0.6, // ovinos sofrem com a umidade e a verminose
    vantagemVizinhos: 45, // R$ mil a mais no caixa inicial dos vizinhos, que já estão na região (calibrado na simulação)
  },
  amazonia: {
    id: 'amazonia', nome: 'Amazônia', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'vulnerável',
    resumo: 'Floresta densa com reserva legal de 80%. Quase não há espaço legal para desmatar e a fiscalização por satélite é frequente. Os primeiros javaporcos começam a chegar.',
    reservaLegal: 0.8, Kcel: 9, r: 0.7, J0: 6, Jcap: 8, imigracao: 0.2, pegada: 0.3,
    fiscalDesmate: 0.5, fiscalAbate: 0.3, regen: 4, passos: 2, custoDesmate: 10,
    evento: null, agua: 6, campo: 0, pastoInicial: 4,
    sedes: [[1, 6], [9, 6], [1, 3], [9, 3]], // fazendas abertas ao longo de uma estrada, encostadas umas nas outras
    javaporco: { nome: 'javaporco', plural: 'javaporcos', V0: 0.05, r: 0.8, Kcel: 3, preferencia: 0.6, conversao: 0.03, dano: 0.4 },
    rebanho: [['boi', 3], ['boi', 3], ['carneiro', 6]], caixa: 50,
    capCarneiro: 0.65,
    vantagemVizinhos: 45,
  },
  cerrado: {
    id: 'cerrado', nome: 'Cerrado', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'em perigo',
    resumo: 'Savana de campos e matas. A seca traz fogo, o jaguar já é raro e os javaporcos se espalham pelas lavouras e pastos.',
    reservaLegal: 0.2, Kcel: 7, r: 0.6, J0: 4, Jcap: 6, imigracao: 0.1, pegada: 0.3,
    fiscalDesmate: 0.25, fiscalAbate: 0.25, regen: 6, passos: 2, custoDesmate: 7,
    evento: 'fogo', agua: 0, campo: 20, pastoInicial: 3,
    javaporco: { nome: 'javaporco', plural: 'javaporcos', V0: 0.25, r: 0.8, Kcel: 3, preferencia: 0.6, conversao: 0.03, dano: 0.4 },
    rebanho: [['boi', 3], ['boi', 3], ['carneiro', 6]], caixa: 50,
    capCarneiro: 0.85,
  },
  caatinga: {
    id: 'caatinga', nome: 'Caatinga', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'criticamente em perigo',
    resumo: 'Mata seca com poucas presas e secas longas. O jaguar está criticamente em perigo aqui: restam poucos, que andam longe.',
    reservaLegal: 0.2, Kcel: 4, r: 0.6, J0: 3, Jcap: 4, imigracao: 0.05, pegada: 0.35,
    fiscalDesmate: 0.15, fiscalAbate: 0.2, regen: 8, passos: 3, custoDesmate: 6,
    evento: 'seca', agua: 0, campo: 0, pastoInicial: 3, capPasto: 0.75, // solo raso do semiárido
    sedes: [[1, 6], [9, 6], [1, 2], [9, 2]],
    mesopredador: { nome: 'raposa', plural: 'raposas' }, // no Nordeste, "raposa" é o nome popular do cachorro-do-mato
    rebanho: [['carneiro', 6], ['carneiro', 6], ['boi', 2]], caixa: 50,
  },
  araripe: {
    id: 'araripe', nome: 'Chapada do Araripe', mapa: 'araripe', predador: { nome: 'suçuarana', plural: 'suçuaranas', f: true, popular: 'onça-parda' }, status: 'em perigo na Caatinga',
    resumo: 'APA com o novo plano de manejo: Zona de Produção, Uso Moderado e Uso Restrito, a FLONA no topo da chapada e as nascentes do soldadinho na encosta. Quem caça aqui é a suçuarana.',
    reservaLegal: 0.2, Kcel: 5, r: 0.7, J0: 4, Jcap: 5, imigracao: 0.08, pegada: 0.35,
    fiscalDesmate: 0.3, fiscalAbate: 0.25, regen: 6, passos: 2, custoDesmate: 7,
    evento: 'fogo', agua: 0, campo: 0, pastoInicial: 3,
    sedes: [[3, 7], [7, 7], [1, 1], [9, 1]], // no vale, as duas fazendas de baixo ficam mais próximas
    vantagemVizinhos: 45,
    pref: 0.35, presaPeso: { boi: 0.45, carneiro: 1.0 }, // a suçuarana ataca mais ovinos, caprinos e bezerros
    soldadinho: true,
    rebanho: [['carneiro', 6], ['carneiro', 6], ['boi', 2]], caixa: 50,
  },
};

// Fazendeiros. O índice 0 é a pessoa; os outros três são sorteados do elenco de vizinhos a cada partida:
// um de cada grupo (cuidadoso, tradicional e encrenqueiro), em posições sorteadas no mapa.
export const JOGADOR = { nome: 'Sua fazenda', apelido: 'Você', perfil: null };
export const COR_FAZENDA = ['var(--voce)', 'var(--ia1)', 'var(--ia2)', 'var(--ia3)'];
// Perfil dos fazendeiros do computador (0 a 1):
//   desmata: vontade de abrir pasto · abate: chamar o matador depois de ataques · defende: cercas elétricas e guarda
//   monitora: câmeras · respeitaLei: cumprir reserva legal, zonas e APP · grila: cercar terra aberta alheia
//   sabota: derrubar a cerca de pasto do vizinho · vinganca: revidar contra quem grilou a sua terra ou derrubou a sua cerca
//   publica: grila também a reserva e as unidades de conservação · especula: abre pasto toda estação, mesmo sem lotação
//   restaura: deixa pasto vazio virar mata para vender cotas de reserva
export const VIZINHOS = {
  bras: { grupo: 'encrenqueiro', nome: 'Fazenda Boa Vista', apelido: 'Seu Brás', tipo: 'grileiro e sabotador',
    perfil: { desmata: 0.9, abate: 0.7, defende: 0.1, monitora: 0.0, respeitaLei: 0.4, grila: 0.7, sabota: 0.3, vinganca: 0.3 },
    descricao: 'Cerca terra alheia sempre que pode, derruba a cerca dos vizinhos e chama o matador depois de um ataque.' },
  firmino: { grupo: 'encrenqueiro', nome: 'Fazenda Serra Alta', apelido: 'Coronel Firmino', tipo: 'grileiro de terra pública',
    perfil: { desmata: 0.7, abate: 0.4, defende: 0.3, monitora: 0.0, respeitaLei: 0.5, grila: 0.5, sabota: 0.05, vinganca: 0.2, publica: true },
    descricao: 'Avança sobre a reserva e as terras públicas; diz que terra parada é terra de ninguém.' },
  celeste: { grupo: 'cuidadoso', nome: 'Fazenda Santa Clara', apelido: 'Dona Celeste', tipo: 'conservacionista',
    perfil: { desmata: 0.8, abate: 0.0, defende: 0.9, monitora: 0.8, respeitaLei: 1.0, grila: 0, sabota: 0, vinganca: 0 },
    descricao: 'Mantém a reserva, cerca a borda da mata, monitora a fauna com câmeras e entra no programa de compensação.' },
  lucia: { grupo: 'cuidadoso', nome: "Fazenda Olho d'Água", apelido: 'Professora Lúcia', tipo: 'conservacionista que restaura',
    perfil: { desmata: 0.0, abate: 0.0, defende: 0.7, monitora: 1.0, respeitaLei: 1.0, grila: 0, sabota: 0, vinganca: 0, restaura: 0.5 },
    descricao: 'Bióloga que herdou a fazenda: cria carneiros, deixa pasto vazio virar mata, vende cotas de reserva e fotografa os felinos da mata.' },
  ze: { grupo: 'tradicional', nome: 'Fazenda Três Marias', apelido: 'Zé Ramos', tipo: 'pecuarista tradicional',
    perfil: { desmata: 0.75, abate: 0.25, defende: 0.5, monitora: 0.3, respeitaLei: 0.9, grila: 0.04, sabota: 0.02, vinganca: 0.2 },
    descricao: 'Expande dentro da lei e só pensa em abate depois de vários prejuízos.' },
  otavio: { grupo: 'tradicional', nome: 'Fazenda Nova Fronteira', apelido: 'Doutor Otávio', tipo: 'desmatador especulador',
    perfil: { desmata: 1.0, abate: 0.5, defende: 0.2, monitora: 0.0, respeitaLei: 0.5, grila: 0.2, sabota: 0, vinganca: 0.1, especula: true },
    descricao: 'Abre pasto a cada estação, enche de boi e aposta que a multa não chega.' },
  zefa: { grupo: 'tradicional', nome: 'Fazenda Juazeiro', apelido: 'Dona Zefa', tipo: 'vingativa',
    perfil: { desmata: 0.7, abate: 0.3, defende: 0.6, monitora: 0.3, respeitaLei: 0.8, grila: 0.03, sabota: 0, vinganca: 1.0 },
    descricao: 'Não mexe com ninguém, mas não esquece: quem cerca a terra dela ou derruba a cerca dela leva o troco.' },
};
// Posição das sedes (coluna, linha). Um bioma pode trocar com "sedes" (fazendas mais próximas, com mais contato).
export const SEDES = [[1, 7], [9, 7], [1, 1], [9, 1]];
