// Dados e parâmetros do jogo. Valores em "mil reais" (R$ mil); uma rodada = uma estação (chuva ou seca).

export const RODADAS = 20;            // 10 anos
export const ACOES_POR_RODADA = 3;
export const W = 11, H = 9;           // mapa hexagonal (linhas ímpares deslocadas)

export const ESPECIES = {
  boi:      { nome: 'boi', plural: 'bois', compra: 18, venda: 15, renda: 2, repro: 0.15, presa: 1.0 },
  carneiro: { nome: 'carneiro', plural: 'carneiros', compra: 5, venda: 4, renda: 1, repro: 0.25, presa: 0.5 },
};
export const GALINHA = { nome: 'lote de galinhas', plural: 'lotes de galinhas', compra: 4, venda: 3, renda: 1, repro: 0.3, cap: 6 };

export const CUSTOS = { desmatar: 8, reflorestar: 5, cerca: 5, justica: 3, guarda: 8, curral: 4, telar: 6, ampliar: 6,
                        camera: 4, colar: 12, matador: 8, seguro: 0, cra: 5, manejo: 5, aceiro: 3 };
export const CRA_POR_CELULA = 0.5;  // renda por célula de vegetação nativa acima da reserva legal, por estação
export const MANUTENCAO = { pasto: 1, cerca: 1, seguro: 2 };
export const MULTA = { desmateCelula: 12, abate: 40, abateReserva: 80, app: 30, zona: 20, grilagem: 15, grilagemUC: 40 };
// Cercas: a posse de cada área é de quem a cercou. O custo é por lado exposto do hexágono (lado que não encosta
// em outra área cercada pela mesma fazenda). Estacas da mata vêm do próprio desmate; madeira e concreto se compram.
export const CERCAS = {
  nativa:   { nome: 'estacas da mata', preco: 0,   validade: 6 },
  madeira:  { nome: 'madeira tratada', preco: 1.2, validade: 10 },
  concreto: { nome: 'concreto',        preco: 2.5, validade: 999 },
};
export const ESTACAS_DESMATE = { mata: 4, capoeira: 2, campo: 0 }; // lotes de estacas (um lote cerca um lado)
export const JUSTICA = { base: 0.15, uc: 0.3, acionada: 0.6 };    // chance por estação de a Justiça devolver uma área grilada
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
  },
  amazonia: {
    id: 'amazonia', nome: 'Amazônia', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'vulnerável',
    resumo: 'Floresta densa com reserva legal de 80%. Quase não há espaço legal para desmatar e a fiscalização por satélite é frequente. Os primeiros javaporcos começam a chegar.',
    reservaLegal: 0.8, Kcel: 9, r: 0.7, J0: 6, Jcap: 8, imigracao: 0.2, pegada: 0.3,
    fiscalDesmate: 0.5, fiscalAbate: 0.3, regen: 4, passos: 2, custoDesmate: 10,
    evento: null, agua: 6, campo: 0, pastoInicial: 4,
    javaporco: { nome: 'javaporco', plural: 'javaporcos', V0: 0.05, r: 0.8, Kcel: 3, preferencia: 0.6, conversao: 0.03, dano: 0.4 },
    rebanho: [['boi', 3], ['boi', 3], ['carneiro', 6]], caixa: 50,
  },
  cerrado: {
    id: 'cerrado', nome: 'Cerrado', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'em perigo',
    resumo: 'Savana de campos e matas. A seca traz fogo, o jaguar já é raro e os javaporcos se espalham pelas lavouras e pastos.',
    reservaLegal: 0.2, Kcel: 7, r: 0.6, J0: 4, Jcap: 6, imigracao: 0.1, pegada: 0.3,
    fiscalDesmate: 0.25, fiscalAbate: 0.25, regen: 6, passos: 2, custoDesmate: 7,
    evento: 'fogo', agua: 0, campo: 20, pastoInicial: 3,
    javaporco: { nome: 'javaporco', plural: 'javaporcos', V0: 0.25, r: 0.8, Kcel: 3, preferencia: 0.6, conversao: 0.03, dano: 0.4 },
    rebanho: [['boi', 3], ['boi', 3], ['carneiro', 6]], caixa: 50,
  },
  caatinga: {
    id: 'caatinga', nome: 'Caatinga', predador: { nome: 'jaguar', plural: 'jaguares', f: false, popular: 'onça-pintada' }, status: 'criticamente em perigo',
    resumo: 'Mata seca com poucas presas e secas longas. O jaguar está criticamente em perigo aqui: restam poucos, que andam longe.',
    reservaLegal: 0.2, Kcel: 4, r: 0.6, J0: 3, Jcap: 4, imigracao: 0.05, pegada: 0.35,
    fiscalDesmate: 0.15, fiscalAbate: 0.2, regen: 8, passos: 3, custoDesmate: 6,
    evento: 'seca', agua: 0, campo: 0, pastoInicial: 3, capPasto: 0.75, // solo raso do semiárido
    mesopredador: { nome: 'raposa', plural: 'raposas' }, // no Nordeste, "raposa" é o nome popular do cachorro-do-mato
    rebanho: [['carneiro', 6], ['carneiro', 6], ['boi', 2]], caixa: 50,
  },
  araripe: {
    id: 'araripe', nome: 'Chapada do Araripe', mapa: 'araripe', predador: { nome: 'suçuarana', plural: 'suçuaranas', f: true, popular: 'onça-parda' }, status: 'em perigo na Caatinga',
    resumo: 'APA com o novo plano de manejo: Zona de Produção, Uso Moderado e Uso Restrito, a FLONA no topo da chapada e as nascentes do soldadinho na encosta. Quem caça aqui é a suçuarana.',
    reservaLegal: 0.2, Kcel: 5, r: 0.7, J0: 4, Jcap: 5, imigracao: 0.08, pegada: 0.35,
    fiscalDesmate: 0.3, fiscalAbate: 0.25, regen: 6, passos: 2, custoDesmate: 7,
    evento: 'fogo', agua: 0, campo: 0, pastoInicial: 3,
    pref: 0.35, presaPeso: { boi: 0.45, carneiro: 1.0 }, // a suçuarana ataca mais ovinos, caprinos e bezerros
    soldadinho: true,
    rebanho: [['carneiro', 6], ['carneiro', 6], ['boi', 2]], caixa: 50,
  },
};

// Fazendeiros. O índice 0 é a pessoa; os demais são controlados pelo computador.
export const FAZENDAS = [
  { nome: 'Sua fazenda', apelido: 'Você', perfil: null, cor: 'var(--voce)' },
  { nome: 'Fazenda Boa Vista', apelido: 'Seu Brás', perfil: { desmata: 0.9, abate: 0.7, defende: 0.1, monitora: 0.0, respeitaLei: 0.4 }, cor: 'var(--ia1)',
    descricao: 'Abre pasto sempre que pode e chama o matador depois de um ataque.' },
  { nome: 'Fazenda Santa Clara', apelido: 'Dona Celeste', perfil: { desmata: 0.2, abate: 0.0, defende: 0.9, monitora: 0.8, respeitaLei: 1.0 }, cor: 'var(--ia2)',
    descricao: 'Mantém a reserva, cerca a borda da mata e monitora a fauna com câmeras.' },
  { nome: 'Fazenda Três Marias', apelido: 'Zé Ramos', perfil: { desmata: 0.5, abate: 0.25, defende: 0.5, monitora: 0.3, respeitaLei: 0.9 }, cor: 'var(--ia3)',
    descricao: 'Expande dentro da lei e só pensa em abate depois de vários prejuízos.' },
];
// Posição das sedes (coluna, linha).
export const SEDES = [[1, 7], [9, 7], [1, 1], [9, 1]];
