// Motor do jogo: estado, modelo presa-predador, regras, economia e fazendeiros do computador.
// Não usa o DOM; roda no navegador e no Node (para a simulação de balanceamento).
import { RODADAS, ACOES_POR_RODADA, W, H, ESPECIES, GALINHA, CUSTOS, MANUTENCAO, MULTA, SELO_BONUS, VENDA_FORCADA,
         JUROS_DIVIDA, MAX_CAMERAS, CRA_POR_CELULA, DEFESAS, TIPOS, CAPACIDADE, MODELO, BIOMAS, JOGADOR, VIZINHOS, SEDES,
         CERCAS, ESTACAS_DESMATE, JUSTICA, DESFORCO, SOLTOS, SELO_VOLTA, USUCAPIAO, VIGILANCIA } from './dados.js';

// ---------------------------------------------------------------- aleatoriedade com semente
export function rnd(st) {
  st.semente = (st.semente + 0x6D2B79F5) | 0;
  let t = st.semente;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function poisson(st, lam) {
  if (lam <= 0) return 0;
  const L = Math.exp(-Math.min(lam, 30)); let k = 0, p = 1;
  do { k++; p *= rnd(st); } while (p > L);
  return k - 1;
}
function binom(st, n, p) { let k = 0; for (let i = 0; i < n; i++) if (rnd(st) < p) k++; return k; }
function sorteia(st, itens, peso) {
  const ps = itens.map(peso); const tot = ps.reduce((a, b) => a + b, 0);
  if (tot <= 0) return null;
  let x = rnd(st) * tot;
  for (let i = 0; i < itens.length; i++) { x -= ps[i]; if (x <= 0) return itens[i]; }
  return itens[itens.length - 1];
}

// ---------------------------------------------------------------- geometria hexagonal (linhas ímpares deslocadas)
export const linha = id => Math.floor(id / W), coluna = id => id % W;
export function vizinhos(id) {
  const r = linha(id), c = coluna(id);
  const d = r % 2 === 0 ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  const out = [];
  for (const [dr, dc] of d) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < H && cc >= 0 && cc < W) out.push(rr * W + cc); }
  return out;
}
function cubo(id) { const r = linha(id), c = coluna(id); const x = c - (r - (r & 1)) / 2; return [x, r, -x - r]; }
export function distancia(a, b) { const p = cubo(a), q = cubo(b); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); }

// ---------------------------------------------------------------- consultas
export const bioma = st => BIOMAS[st.bioma];
export const habitat = cel => TIPOS[cel.tipo].habitat > 0;
export const pastejavel = cel => cel.tipo === 'pasto' || cel.tipo === 'campo';
export function estacao(st, t = st.t) { return t % 2 === 0 ? 'chuva' : 'seca'; }
export function ano(st, t = st.t) { return Math.floor(t / 2) + 1; }
export const celulasDe = (st, f) => st.celulas.filter(c => c.dono === f);          // terra com título da fazenda
export const posse = c => c.cercaDe >= 0 ? c.cercaDe : c.dono;                    // quem controla: quem cercou, ou o dono
export const controladas = (st, f) => st.celulas.filter(c => posse(c) === f);
export const grilada = c => c.cercaDe >= 0 && c.cercaDe !== c.dono;
// lados do hexágono que precisam de cerca: os que não encostam em área já cercada pela mesma fazenda
// estações que faltam para uma área grilada virar usucapião, se o dono não reclamar (Infinity para terra pública)
export const faltaUsucapiao = c => !grilada(c) || c.reserva || c.dono < 0 ? Infinity
  : Math.max(0, Math.min(USUCAPIAO.comUso - (c.posseUso || 0), USUCAPIAO.semUso - (c.posse || 0)));
export function ladosExpostos(st, f, id) { return 6 - vizinhos(id).filter(v => st.celulas[v].cercaDe === f).length; }
// animais soltos: grupos { f, especie, n, cel } que ficaram fora de cerca
export const soltosEm = (st, id) => (st.soltos || []).filter(g => g.cel === id && g.n > 0);
export const soltosDe = (st, f) => (st.soltos || []).filter(g => g.f === f && g.n > 0);
export const totalSoltos = (st, f) => soltosDe(st, f).reduce((s, g) => s + g.n, 0);
function soltar(st, f, especie, n, cel) {
  if (n <= 0) return;
  st.soltos = st.soltos || [];
  const g = st.soltos.find(x => x.f === f && x.especie === especie && x.cel === cel);
  if (g) g.n += n; else st.soltos.push({ f, especie, n, cel });
}
const limpaSoltos = st => { st.soltos = (st.soltos || []).filter(g => g.n > 0); };
const abertaParaSoltos = c => c.cercaDe < 0 && c.tipo !== 'agua' && c.tipo !== 'sede';
export function exposicaoSoltos(st, g) {
  return g.n * ESPECIES[g.especie].presa * (bioma(st).presaPeso?.[g.especie] ?? 1) * (habitat(st.celulas[g.cel]) ? SOLTOS.mata : 1);
}
// processos por cerca derrubada que a vítima ainda pode abrir
export const processosAbertos = (st, f) => (st.danos || []).filter(d => d.vitima === f && (d.processo ?? -1) < st.t);
// quem teve a terra grilada ou a cerca derrubada guarda rancor de quem fez (os vingativos revidam)
function guardaRancor(st, V, f) {
  V.rancor = V.rancor || {}; V.rancor[f] = (V.rancor[f] || 0) + 2;
  if (f === 0 && (V.perfil?.vinganca ?? 0) >= 0.5) st.avisosRancor = [...new Set([...(st.avisosRancor || []), V.id])];
}
// toda infração tira o selo e zera a contagem para recuperá-lo
export function perdeSelo(st, F, motivo) { if (F.selo) { F.selo = false; F.seguro = false; F.motivoSelo = motivo; } F.ultimaInfracao = st.t; }
// estações (contando a atual) até o selo voltar, se não houver nova infração
export const voltaDoSelo = (st, f) => { const F = st.fazendas[f]; return F.selo ? 0 : Math.max(1, (F.ultimaInfracao ?? -99) + SELO_VOLTA - st.t); };

export function nativaFrac(st, f) {
  const cs = celulasDe(st, f).filter(c => c.tipo !== 'sede');
  return cs.filter(c => TIPOS[c.tipo].nativa).length / cs.length;
}
// quantas células nativas a fazenda pode converter sem ficar abaixo da reserva legal
export function folgaReserva(st, f) {
  const cs = celulasDe(st, f).filter(c => c.tipo !== 'sede');
  const nat = cs.filter(c => TIPOS[c.tipo].nativa).length;
  return nat - Math.ceil(bioma(st).reservaLegal * cs.length - 1e-9);
}
export const app = (st, cel) => cel.nascente || vizinhos(cel.id).some(v => st.celulas[v].nascente);
// motivo pelo qual desmatar esta célula é ilegal (ou null se for permitido)
export function desmateIlegal(st, f, id) {
  const c = st.celulas[id];
  if (c.reserva) return 'unidade de conservação';
  if (c.dono !== f) return 'terra de outro fazendeiro';
  if (app(st, c)) return 'APP de nascente';
  if (c.zona === 'restrito') return 'Zona de Uso Restrito';
  if (c.zona === 'moderado') return 'Zona de Uso Moderado';
  if (folgaReserva(st, f) <= 0) return 'abaixo da reserva legal';
  return null;
}
export function capacidadeKV(st) {
  const J = bioma(st).javaporco; if (!J) return 0;
  return st.celulas.reduce((s, c) => s + (habitat(c) ? 1 : c.tipo === 'pasto' ? 0.6 : 0), 0) * J.Kcel;
}
export function recarga(st) {
  const alto = st.celulas.filter(c => c.regiao === 'chapada' && c.tipo !== 'sede');
  if (!alto.length) return 1;
  const nat = alto.filter(c => TIPOS[c.tipo].nativa).length / alto.length;
  return Math.min(1, nat / (st.nativaChapada0 || nat));
}
export function qualidadeSoldadinho(st) {
  const nasc = st.celulas.filter(c => c.nascente);
  if (!nasc.length) return 1;
  const q = nasc.reduce((s, c) => { const vz = vizinhos(c.id).map(v => st.celulas[v]); return s + vz.filter(u => u.tipo === 'mata' || u.nascente).length / vz.length; }, 0) / nasc.length;
  const V = st.onca.V ? st.onca.V / capacidadeKV(st) : 0;
  return Math.max(0.02, q * (1 - 0.5 * V) * (0.4 + 0.6 * recarga(st)));
}
export function naBorda(st, cel) { return vizinhos(cel.id).some(v => habitat(st.celulas[v]) && st.celulas[v].tipo !== 'campo'); }

export function capacidade(st, cel, especie, t = st.t) {
  if (!pastejavel(cel)) return 0;
  let cap = CAPACIDADE[cel.tipo][especie];
  const B = bioma(st), est = estacao(st, t);
  let fator = cel.tipo === 'pasto' ? (B.capPasto ?? 1) : 1;
  if (especie === 'carneiro') fator *= B.capCarneiro ?? 1;
  if (B.evento === 'cheia' && est === 'chuva' && cel.tipo === 'campo') fator *= 0.5;
  // na seca o pasto rende menos, e rende ainda menos onde a vegetação nativa foi removida (solo exposto, desertificação)
  if (B.evento === 'seca' && est === 'seca') fator *= cel.dono >= 0 ? 0.3 + 0.5 * nativaFrac(st, cel.dono) : 0.6;
  if (cel.queimado) fator *= 0.5;
  fator *= st.fatorHerbivoros ?? 1;
  if (B.javaporco && !(posse(cel) >= 0 && (st.fazendas[posse(cel)]?.manejoAte ?? -1) >= t)) fator *= st.fatorJavaporco ?? 1;
  // a chapada é área de recarga: com menos vegetação no alto, as nascentes do vale correm mais fracas na seca
  if (B.mapa === 'araripe' && est === 'seca' && cel.regiao === 'vale') fator *= 0.6 + 0.4 * recarga(st);
  return Math.floor(cap * fator + 1e-9);
}
export function exposicao(st, cel) {
  if (!pastejavel(cel) || !cel.n || !naBorda(st, cel)) return 0;
  let x = cel.n * ESPECIES[cel.especie].presa * (bioma(st).presaPeso?.[cel.especie] ?? 1);
  if (cel.eletrica) x *= DEFESAS.cerca;
  if (cel.guarda) x *= DEFESAS.guarda;
  if (cel.curral) x *= DEFESAS.curral;
  return x;
}
export function valorRebanho(st, f) {
  const F = st.fazendas[f];
  let v = F.galinhas * GALINHA.venda;
  for (const c of controladas(st, f)) if (c.n) v += c.n * ESPECIES[c.especie].venda;
  for (const g of soltosDe(st, f)) v += g.n * ESPECIES[g.especie].venda;   // soltos continuam marcados com o ferro da fazenda
  return v * (F.selo ? 1 + SELO_BONUS : 1);
}
export function patrimonio(st, f) { return Math.round(st.fazendas[f].caixa + valorRebanho(st, f)); }
export function cabecas(st, f) {
  const out = { boi: 0, carneiro: 0, galinha: st.fazendas[f].galinhas };
  for (const c of controladas(st, f)) if (c.n) out[c.especie] += c.n;
  return out;
}
export function capacidadeK(st) {
  return st.celulas.reduce((s, c) => s + TIPOS[c.tipo].K, 0) * bioma(st).Kcel;
}

// ---------------------------------------------------------------- novo jogo
export function novoJogo(biomaId, semente = (Date.now() & 0x7fffffff), opcoes = {}) {
  const B = BIOMAS[biomaId];
  const st = { versao: 1, bioma: biomaId, semente, sementeInicial: semente, t: 0, fim: false,
               celulas: [], fazendas: [], tokens: [], soltos: [], danos: [], proxToken: 1, hist: [], diario: [], relatorio: null,
               ousadosPendentes: 0, bonusImigracao: 0, fatorHerbivoros: 1, vistos: novoVisto() };
  const centro = 4 * W + 5;
  const sedes = (B.sedes || SEDES).map(([c, r]) => r * W + c);
  if (B.mapa === 'araripe') gerarAraripe(st, sedes);
  else {
  for (let id = 0; id < W * H; id++) {
    const reserva = distancia(id, centro) <= 2;
    let dono = -1;
    if (!reserva) {
      let melhor = 1e9;
      sedes.forEach((s, i) => { const d = distancia(id, s) + i * 1e-3; if (d < melhor) { melhor = d; dono = i; } });
    }
    st.celulas.push({ id, tipo: 'mata', dono, reserva, regen: 0, especie: null, n: 0, cercaDe: -1, material: null, validade: 0,
                      eletrica: false, guarda: false, curral: false, camera: -1, queimado: false });
  }
  // água: um rio que serpenteia da esquerda para a direita pelo meio do mapa
  if (B.agua) {
    let r = 3 + Math.floor(rnd(st) * 3), c = 0, postos = 0;
    while (c < W && postos < B.agua + 4) {
      const cel = st.celulas[r * W + c];
      if (!sedes.includes(cel.id)) { cel.tipo = 'agua'; postos++; }
      c++; const sobe = rnd(st); if (sobe < 0.3 && r > 2) r--; else if (sobe > 0.7 && r < H - 3) r++;
    }
  }
  // campos nativos (Pantanal, Cerrado), em manchas
  if (B.campo) {
    let postos = 0, guarda = 0;
    while (postos < B.campo && guarda++ < 500) {
      const base = Math.floor(rnd(st) * W * H); const cel = st.celulas[base];
      if (cel.tipo !== 'mata' || sedes.includes(base)) continue;
      const proxAgua = vizinhos(base).some(v => st.celulas[v].tipo === 'agua' || st.celulas[v].tipo === 'campo');
      if (B.agua && !proxAgua && rnd(st) < 0.7) continue;
      cel.tipo = 'campo'; postos++;
    }
  }
  }
  equilibraTerras(st, sedes);
  // fazendas: a pessoa e três vizinhos sorteados do elenco
  let chaves = opcoes.vizinhos;
  if (!chaves) {
    // um vizinho de cada grupo, em posições sorteadas
    chaves = ['cuidadoso', 'tradicional', 'encrenqueiro'].map(g => { const ks = Object.keys(VIZINHOS).filter(k => VIZINHOS[k].grupo === g); return ks[Math.floor(rnd(st) * ks.length)]; });
    for (let i = chaves.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [chaves[i], chaves[j]] = [chaves[j], chaves[i]]; }
  }
  [JOGADOR, ...chaves.map(k => ({ ...VIZINHOS[k], chave: k }))].forEach((def, i) => {
    const F = { id: i, nome: def.nome, apelido: def.apelido, perfil: def.perfil, humano: i === 0, chave: def.chave || null, tipo: def.tipo || null,
                descricao: def.descricao || null, rancor: {},
                sede: sedes[i], caixa: B.caixa + (i > 0 ? B.vantagemVizinhos ?? 0 : 0), selo: true, seguro: false, galinhas: 2, galCap: GALINHA.cap, telado: false,
                acoes: ACOES_POR_RODADA, cra: false, abates: 0, multas: 0, perdas: { boi: 0, carneiro: 0, galinha: 0 },
                perdasRodada: { boi: 0, carneiro: 0, galinha: 0 }, ataquesUltimos: [], ataquesTotal: 0, motivoSelo: null,
                receitaTotal: 0, desmatadas: 0, infracoes: [], manejos: 0, estacas: 0 };
    st.fazendas.push(F);
    const sede = st.celulas[F.sede]; sede.tipo = 'sede';
    const minhas = celulasDe(st, i).filter(c => c.tipo !== 'sede' && c.tipo !== 'agua')
      .sort((a, b) => distancia(a.id, F.sede) - distancia(b.id, F.sede) || a.id - b.id);
    let convertidas = 0;
    for (const c of minhas) {
      if (convertidas >= B.pastoInicial || folgaReserva(st, i) <= 0) break;
      if (c.tipo === 'campo' && B.agua) continue; // mantém o campo nativo do Pantanal
      if (B.mapa === 'araripe' && (app(st, c) || c.zona !== 'producao')) continue; // pasto consolidado só na Zona de Produção
      c.tipo = 'pasto'; convertidas++;
    }
    // rebanho inicial: primeiro nos pastos, depois nos campos nativos mais próximos
    const pastos = celulasDe(st, i).filter(pastejavel).sort((a, b) => (a.tipo === 'pasto' ? 0 : 1) - (b.tipo === 'pasto' ? 0 : 1) || distancia(a.id, F.sede) - distancia(b.id, F.sede));
    B.rebanho.forEach(([esp, n], k) => { const c = pastos[k]; if (c) { c.especie = esp; c.n = Math.min(n, capacidade(st, c, esp)); } });
    // cercas iniciais: a sede (permanente) e os pastos já abertos, com estacas de madeira de idades diferentes
    sede.cercaDe = i; sede.material = 'concreto'; sede.validade = 999;
    for (const c of celulasDe(st, i)) if (c.tipo === 'pasto' || c.n) { c.cercaDe = i; c.material = 'madeira'; c.validade = 4 + Math.floor(rnd(st) * 7); }
  });
  // onças iniciais
  const K = capacidadeK(st);
  st.onca = { N: 0.55 * K, J: B.J0, M: 0.5, K, K0: K };
  if (B.javaporco) { const KV = capacidadeKV(st); st.onca.V = B.javaporco.V0 * KV; st.onca.KV = KV; }
  if (B.mapa === 'araripe') { const alto = st.celulas.filter(c => c.regiao === 'chapada' && c.tipo !== 'sede'); st.nativaChapada0 = alto.filter(c => TIPOS[c.tipo].nativa).length / alto.length; }
  if (B.soldadinho) st.soldadinho = { S: 1, Q: qualidadeSoldadinho(st) };
  for (let k = 0; k < B.J0; k++) criaToken(st, false);
  registraHistorico(st);
  return st;
}
function novoVisto() { return { pegadas: [], fotos: [], ataques: [], presasFoto: 0, individuos: [], fucados: [] }; }

// Divide a terra em partes de valor quase igual: passa áreas de divisa da fazenda maior para uma vizinha menor, sem
// partir a fazenda que cede. Água não conta; no Araripe, área fora da Zona de Produção ou em APP vale menos.
function equilibraTerras(st, sedes) {
  const peso = c => c.tipo === 'agua' ? 0 : c.zona && (c.zona !== 'producao' || app(st, c)) ? 0.3 : 1;
  const conta = f => st.celulas.filter(c => c.dono === f).reduce((s, c) => s + peso(c), 0);
  const inteira = (f, sem) => {
    const vis = new Set([sedes[f]]), fila = [sedes[f]];
    while (fila.length) { const x = fila.pop(); for (const v of vizinhos(x)) if (v !== sem && !vis.has(v) && st.celulas[v].dono === f) { vis.add(v); fila.push(v); } }
    return vis.size === st.celulas.filter(c => c.dono === f).length - 1;
  };
  for (let it = 0; it < 300; it++) {
    const n = sedes.map((_, f) => conta(f));
    let moveu = false;
    for (const A of [...n.keys()].sort((a, b) => n[b] - n[a])) {
      const cands = st.celulas.filter(c => c.dono === A && c.id !== sedes[A] && c.tipo !== 'agua')
        .flatMap(c => vizinhos(c.id).map(v => st.celulas[v].dono).filter(B => B >= 0 && B !== A && n[A] - n[B] >= 2 * peso(c) && peso(c) > 0).map(B => ({ c, B })))
        .sort((x, y) => n[x.B] - n[y.B] || distancia(y.c.id, sedes[A]) - distancia(x.c.id, sedes[A]) || x.c.id - y.c.id);
      for (const { c, B } of cands) if (inteira(A, c.id)) { c.dono = B; moveu = true; break; }
      if (moveu) break;
    }
    if (!moveu) break;
  }
}

// Chapada do Araripe: chapada (FLONA e fazendas do alto), encosta úmida com nascentes (Revis) e vale.
function gerarAraripe(st, sedes) {
  const flona = id => linha(id) <= 2 && coluna(id) >= 3 && coluna(id) <= 7;
  const revis = id => (linha(id) === 3 || linha(id) === 4) && coluna(id) >= 3 && coluna(id) <= 7;
  for (let id = 0; id < W * H; id++) {
    const uc = flona(id) ? 'flona' : revis(id) ? 'revis' : null;
    let dono = -1;
    if (!uc) { let melhor = 1e9; sedes.forEach((s, i) => { const d = distancia(id, s) + i * 1e-3; if (d < melhor) { melhor = d; dono = i; } }); }
    st.celulas.push({ id, tipo: 'mata', dono, reserva: !!uc, uc, zona: null, nascente: false,
                      regiao: linha(id) <= 2 ? 'chapada' : linha(id) <= 4 ? 'encosta' : 'vale',
                      regen: 0, especie: null, n: 0, cercaDe: -1, material: null, validade: 0,
                      eletrica: false, guarda: false, curral: false, camera: -1, queimado: false });
  }
  for (const [r, c] of [[4, 1], [4, 4], [4, 6], [4, 9]]) { const cel = st.celulas[r * W + c]; cel.tipo = 'agua'; cel.nascente = true; }
  // cerrado aberto no alto da chapada
  for (const cel of st.celulas) if (cel.regiao === 'chapada' && !sedes.includes(cel.id) && rnd(st) < 0.3) cel.tipo = 'campo';
  // zoneamento do plano de manejo
  for (const cel of st.celulas) {
    if (cel.dono < 0) continue;
    if (cel.regiao === 'encosta') cel.zona = 'restrito';
    else if (vizinhos(cel.id).some(v => st.celulas[v].reserva)) cel.zona = 'moderado';
    else cel.zona = 'producao';
  }
}

function criaToken(st, ousado) {
  const ocupadas = new Set(st.tokens.map(t => t.cel));
  const cel = sorteia(st, st.celulas.filter(habitat), c => TIPOS[c.tipo].habitat * (c.reserva ? 2 : 1) * (ocupadas.has(c.id) ? 0.1 : 1)
    * (Math.min(...st.fazendas.map(F => distancia(c.id, F.sede))) <= 1 ? 0.2 : 1));
  if (!cel) return null;
  const tk = { id: st.proxToken++, cel: cel.id, colar: false, ousado: ousado ? 4 : 0, caminho: [cel.id] };
  st.tokens.push(tk); return tk;
}

// ---------------------------------------------------------------- ações
export function acoesCelula(st, f, id) {
  const F = st.fazendas[f], c = st.celulas[id], B = bioma(st);
  const out = [];
  const add = (acao, rotulo, custo, ok, motivo) => out.push({ acao, rotulo, custo, ok: ok && F.acoes > 0 && F.caixa >= custo, motivo:
    !ok ? motivo : F.acoes <= 0 ? 'Sem ações nesta estação' : F.caixa < custo ? 'Dinheiro insuficiente' : null });
  const minha = posse(c) === f;
  // cercar: área livre (ou cerca própria perto de vencer) encostada em área controlada pela fazenda
  const encostada = vizinhos(id).some(v => posse(st.celulas[v]) === f);
  const renovar = c.cercaDe === f && c.material !== 'concreto' && c.validade <= 2 && c.tipo !== 'sede';
  if (c.tipo !== 'agua' && c.tipo !== 'sede' && (c.cercaDe < 0 || renovar)) {
    const lados = ladosExpostos(st, f, id);
    const ilegal = c.dono !== f ? (c.reserva ? 'grilagem de área pública' : `grilagem de terra da ${st.fazendas[c.dono].nome}`) : null;
    const pode = minha || encostada;
    const verbo = renovar ? 'Renovar a cerca' : 'Cercar';
    for (const mat of ['nativa', 'madeira', 'concreto']) {
      const M_ = CERCAS[mat], custo = Math.round(lados * M_.preco * 10) / 10;
      const temEstaca = mat !== 'nativa' || F.estacas >= lados;
      add(`cercar_${mat}`, `${verbo} com ${M_.nome}${ilegal ? ` (ilegal: ${ilegal})` : ''}`, custo, pode && temEstaca,
          !pode ? 'Só dá para cercar ao lado de uma área que você controla' : `Precisa de ${lados} lotes de estacas da mata; você tem ${F.estacas}`);
      Object.assign(out[out.length - 1], { ilegal, lados, material: mat });
    }
  }
  // derrubar a cerca de outra fazenda: crime de dano, salvo o desforço imediato na própria terra recém-grilada
  if (c.cercaDe >= 0 && c.cercaDe !== f && c.tipo !== 'sede' && encostada) {
    const desforco = c.dono === f && grilada(c) && st.t - (c.tomadaEm ?? -99) <= DESFORCO;
    const ilegal = desforco ? null : c.dono === f ? 'fazer justiça com as próprias mãos' : 'crime de dano';
    add('derrubar', `Derrubar a cerca de ${st.fazendas[c.cercaDe].apelido}${ilegal ? ` (ilegal: ${ilegal})` : ' (desforço imediato)'}`,
        c.material === 'concreto' ? CUSTOS.derrubarConcreto : CUSTOS.derrubar, true, null);
    Object.assign(out[out.length - 1], { ilegal, desforco });
  }
  if (c.dono === f && grilada(c)) add('justica', 'Entrar na Justiça para reaver a área', CUSTOS.justica, (c.processo ?? -1) < st.t, 'Processo já em andamento');
  if (minha && TIPOS[c.tipo].nativa && c.tipo !== 'agua') {
    const vizinhoUsado = vizinhos(id).some(v => posse(st.celulas[v]) === f && !TIPOS[st.celulas[v].tipo].nativa);
    const ilegal = desmateIlegal(st, f, id);
    add('desmatar', ilegal ? `Desmatar (ilegal: ${ilegal})` : 'Desmatar para pasto', B.custoDesmate, vizinhoUsado,
        'Só é possível abrir pasto ao lado de outro pasto ou da sede');
    out[out.length - 1].ilegal = ilegal;
  }
  if (minha && c.tipo === 'pasto') add('reflorestar', 'Deixar a mata voltar', CUSTOS.reflorestar, !c.n, 'Retire os animais antes');
  if (minha && pastejavel(c)) {
    add('cerca', 'Eletrificar a cerca', CUSTOS.cerca, c.cercaDe === f && !c.eletrica, c.eletrica ? 'Cerca já eletrificada' : 'Cerque a área antes');
    add('guarda', B.id === 'pantanal' ? 'Búfalos de guarda' : 'Cães de guarda', CUSTOS.guarda, !c.guarda, 'Já tem animais de guarda');
    add('curral', 'Curral noturno', CUSTOS.curral, !c.curral && distancia(id, F.sede) <= 1, c.curral ? 'Já tem curral' : 'Só ao lado da sede');
  }
  if (c.dono === f && c.tipo === 'sede') {
    add('telar', 'Telar o galinheiro', CUSTOS.telar, !F.telado, 'Galinheiro já telado');
    add('ampliar', 'Ampliar o galinheiro', CUSTOS.ampliar, true, null);
    if (!F.seguro) add('seguro', 'Aderir à compensação por ataques', CUSTOS.seguro, F.selo, 'Exige o selo de convivência');
    if (!F.cra) add('cra', 'Registrar cotas de reserva (CRA)', CUSTOS.cra, true, null);
    const soltos = totalSoltos(st, f);
    if (soltos) add('recolher', `Recolher os animais soltos (${soltos})`, CUSTOS.recolher, true, null);
    if ((st.danos || []).some(d => d.vitima === f)) add('processar', 'Processar quem derrubou suas cercas', CUSTOS.justica, processosAbertos(st, f).length > 0, 'Processo já em andamento');
    if (B.evento === 'fogo') add('aceiro', 'Abrir aceiros contra o fogo', CUSTOS.aceiro, (F.aceiroAte ?? -1) < st.t, 'Aceiros já abertos neste ano');
    if (B.javaporco) add('manejo', `Contratar caçadores de manejo de ${B.javaporco.nome}`, CUSTOS.manejo, (st.onca.V || 0) >= 1, `Não há ${B.javaporco.plural} para manejar`);
  }
  const acessivel = minha || (c.reserva && c.cercaDe < 0);
  if (habitat(c) && acessivel) {
    const nCam = st.celulas.filter(x => x.camera === f).length;
    add('camera', 'Armadilha fotográfica', CUSTOS.camera, c.camera < 0 && nCam < MAX_CAMERAS, c.camera >= 0 ? 'Já há câmera aqui' : `Máximo de ${MAX_CAMERAS} câmeras`);
    const detectado = st.tokens.some(t => t.cel === id && !t.colar && detectadoPor(st, f, t));
    const Pd = B.predador;
    add('colar', 'Capturar e pôr colar GPS', CUSTOS.colar, detectado, `Precisa de ${Pd.f ? 'uma' : 'um'} ${Pd.nome} ${Pd.f ? 'detectada' : 'detectado'} aqui nesta estação`);
    add('matador', `Contratar matador de ${Pd.plural}`, CUSTOS.matador, true, null);
  }
  return out;
}
function detectadoPor(st, f, tk) {
  if (tk.colar) return true;
  if (f !== 0) return (st.fazendas[f].ataquesUltimos || []).some(a => a.onca === tk.cel);
  return st.vistos.fotos.some(x => x.cel === tk.cel) || st.vistos.ataques.some(x => x.onca === tk.cel);
}
export function oncasVisiveis(st) {
  // o que a pessoa enxerga: colares GPS, fotos e locais de ataque desta estação
  const out = [];
  for (const tk of st.tokens) {
    if (tk.colar) out.push({ cel: tk.cel, tipo: 'colar', id: tk.id });
  }
  for (const x of st.vistos.fotos) out.push({ cel: x.cel, tipo: 'foto' });
  for (const x of st.vistos.ataques) if (x.onca != null) out.push({ cel: x.onca, tipo: 'ataque' });
  return out;
}

export function executar(st, f, acao, id) {
  const disponiveis = acoesCelula(st, f, id); const a = disponiveis.find(x => x.acao === acao);
  if (!a) return { ok: false, msg: 'Ação indisponível aqui' };
  if (!a.ok) return { ok: false, msg: a.motivo };
  const F = st.fazendas[f], c = st.celulas[id], B = bioma(st);
  F.caixa -= a.custo; F.acoes--;
  if (f === 0) { st.marcas = st.marcas || {}; if (acao === 'matador') st.marcas.abate = true; if (acao === 'desmatar') st.marcas.desmate = true; if (acao === 'manejo') st.marcas.manejo = true; if (acao === 'derrubar') st.marcas.derrubou = true; }
  let msg = '';
  switch (acao) {
    case 'desmatar': {
      const ilegal = desmateIlegal(st, f, id);
      const estacas = ESTACAS_DESMATE[c.tipo] || 0; F.estacas += estacas;
      c.tipo = 'pasto'; c.regen = 0; c.camera = -1; F.desmatadas++;
      for (const tk of st.tokens) if (tk.cel === id) moveTokenParaHabitat(st, tk);
      if (ilegal) perdeSelo(st, F, `desmate ilegal (${ilegal})`);
      if (ilegal && ilegal !== 'abaixo da reserva legal') F.infracoes.push({ cel: id, tipo: ilegal === 'APP de nascente' ? 'app' : 'zona' });
      msg = (ilegal ? `Pasto aberto de forma ilegal (${ilegal}). O selo foi perdido e a fiscalização pode multar.` : 'Pasto aberto. A mata e suas presas diminuíram.')
        + (estacas ? ` A madeira rendeu ${estacas} lotes de estacas.` : '') + (c.cercaDe !== f ? ' Cerque a área para pôr animais.' : '');
      break;
    }
    case 'aceiro': F.aceiroAte = st.t + 1; msg = 'Aceiros abertos: o fogo não entra na sua fazenda nesta estação nem na próxima.'; break;
    case 'manejo': {
      const antes = st.onca.V; st.onca.V *= 0.5; F.manejos++; F.manejoAte = st.t + 2;
      st.onca.N *= 0.98; // cães e tiros espantam a fauna nativa
      msg = `Os caçadores de manejo, com autorização no SIMAF, retiraram cerca de ${Math.round(antes - st.onca.V)} ${B.javaporco.plural} da região e mantêm as varas longe dos seus pastos por três estações.`;
      break;
    }
    case 'reflorestar': c.tipo = 'capoeira'; c.regen = B.regen; c.eletrica = c.guarda = c.curral = false;
      msg = `A capoeira vira mata em ${B.regen} estações.`; break;
    case 'cerca': c.eletrica = true; msg = 'Cerca eletrificada: o risco de ataque neste pasto caiu 80%.'; break;
    case 'cercar_nativa': case 'cercar_madeira': case 'cercar_concreto': {
      const mat = a.material, M_ = CERCAS[mat];
      if (mat === 'nativa') F.estacas -= a.lados;
      const tomou = c.cercaDe < 0 && c.dono !== f;
      if (f === 0) { st.marcas = st.marcas || {}; st.marcas.cercou = true; if (tomou) st.marcas.grilagem = true; }
      c.cercaDe = f; c.material = mat; c.validade = M_.validade;
      // animais soltos nesta área: os da fazenda ficam presos no novo cercado; os de outras fazendas são tocados para fora
      let presos = 0;
      for (const g of soltosEm(st, id)) {
        if (g.f === f && pastejavel(c) && (!c.n || c.especie === g.especie)) { const k = Math.min(g.n, capacidade(st, c, g.especie) - c.n); if (k > 0) { c.especie = g.especie; c.n += k; g.n -= k; presos += k; } }
        if (g.n) { const fora = vizinhos(id).filter(v => abertaParaSoltos(st.celulas[v])); if (fora.length) g.cel = fora[Math.floor(rnd(st) * fora.length)]; }
      }
      limpaSoltos(st);
      if (tomou) {
        c.tomadaEm = st.t; c.posse = 0; c.posseUso = 0; c.notada = c.dono === 0;   // a pessoa é avisada; o computador precisa perceber
        perdeSelo(st, F, 'grilagem de terra');
        if (c.dono >= 0) { (st.invasoes = st.invasoes || []).push({ por: f, de: c.dono, cel: id }); guardaRancor(st, st.fazendas[c.dono], f); }
      }
      msg = `Área cercada com ${M_.nome} (${a.lados} lados${M_.validade < 999 ? `, dura ${M_.validade} estações` : ', permanente'}).`
        + (presos ? ` ${presos} ${presos > 1 ? 'animais seus que estavam soltos ficaram' : 'animal seu que estava solto ficou'} no cercado.` : '')
        + (tomou ? ` É grilagem: o selo foi perdido e a Justiça pode devolver a área ${c.reserva ? 'ao poder público' : 'ao dono'} e multar.` : '');
      break;
    }
    case 'justica': c.processo = st.t + 1; c.posse = 0; c.posseUso = 0;
      msg = 'Processo aberto: a contagem da usucapião foi zerada, e a Justiça pode devolver a área nesta estação ou na próxima.'; break;
    case 'processar': for (const d of processosAbertos(st, f)) d.processo = st.t + 1;
      msg = 'Processo aberto: a chance de a Justiça condenar quem derrubou suas cercas sobe nesta estação e na próxima.'; break;
    case 'derrubar': {
      const g = c.cercaDe, Fg = st.fazendas[g], fugiram = c.n, esp = c.especie;
      F.derrubadas = (F.derrubadas || 0) + 1; Fg.cercasDerrubadas = (Fg.cercasDerrubadas || 0) + 1;
      if (c.n) { soltar(st, g, esp, c.n, id); c.n = 0; c.especie = null; }
      c.cercaDe = -1; c.material = null; c.validade = 0; c.eletrica = false; c.processo = undefined; c.tomadaEm = undefined; c.posse = 0; c.posseUso = 0;
      if (a.ilegal) {
        perdeSelo(st, F, a.ilegal === 'crime de dano' ? 'derrubou a cerca de um vizinho' : 'fez justiça com as próprias mãos');
        (st.danos = st.danos || []).push({ por: f, vitima: g, cel: id, t: st.t, processo: -1 });
        guardaRancor(st, Fg, f);
      }
      (st.derrubadas = st.derrubadas || []).push({ por: f, de: g, cel: id, fugiram, especie: esp, legal: !a.ilegal });
      msg = `Você derrubou a cerca de ${Fg.apelido}.` + (fugiram ? ` ${fugiram} ${fugiram > 1 ? ESPECIES[esp].plural : ESPECIES[esp].nome} ficaram soltos e vão se espalhar.` : '')
        + (!a.ilegal ? ' Desforço imediato: retomar logo a própria terra é permitido. Cerque a área de novo.'
          : a.ilegal === 'crime de dano' ? ' É crime de dano: o selo foi perdido e a Justiça pode condenar você a pagar multa e indenização.'
          : ' Passou a hora do desforço imediato: é fazer justiça com as próprias mãos. O selo foi perdido e a Justiça pode condenar você.');
      break;
    }
    case 'recolher': {
      let voltaram = 0, vendidos = 0, valor = 0; const bonus = F.selo ? 1 + SELO_BONUS : 1;
      for (const g of soltosDe(st, f)) {
        for (const d of st.celulas.filter(d => d.cercaDe === f && pastejavel(d) && (!d.n || d.especie === g.especie))) {
          const k = Math.min(g.n, capacidade(st, d, g.especie) - d.n); if (k > 0) { d.especie = g.especie; d.n += k; g.n -= k; voltaram += k; } if (!g.n) break;
        }
        if (g.n) { vendidos += g.n; valor += g.n * ESPECIES[g.especie].venda * VENDA_FORCADA * bonus; g.n = 0; }
      }
      F.caixa += valor; limpaSoltos(st);
      msg = `Os vaqueiros recolheram ${voltaram} ${voltaram === 1 ? 'animal' : 'animais'} para os pastos cercados`
        + (vendidos ? ` e venderam às pressas ${vendidos === 1 ? 'o que não coube' : `os ${vendidos} que não couberam`} (R$ ${valor.toFixed(1).replace('.', ',')} mil).` : '.');
      break;
    }
    case 'guarda': c.guarda = true; msg = 'Animais de guarda soltos com o rebanho.'; break;
    case 'curral': c.curral = true; msg = 'O rebanho dorme no curral.'; break;
    case 'telar': F.telado = true; msg = 'Galinheiro telado.'; break;
    case 'ampliar': F.galCap += 4; msg = 'Galinheiro ampliado em 4 lotes.'; break;
    case 'seguro': F.seguro = true; msg = 'Você entrou no programa de compensação por ataques.'; break;
    case 'cra': F.cra = true; msg = 'A vegetação nativa acima da reserva legal passa a render cotas vendidas a quem precisa compensar.'; break;
    case 'camera': c.camera = f; msg = 'Armadilha fotográfica instalada.'; break;
    case 'colar': {
      const tk = st.tokens.find(t => t.cel === id && !t.colar && detectadoPor(st, f, t));
      const Pd = B.predador, o = Pd.f ? 'a' : 'o';
      if (rnd(st) < 0.75) { tk.colar = true; msg = `${Pd.f ? 'A' : 'O'} ${Pd.nome} foi capturad${o} pela equipe de biólogos e solt${o} com colar GPS.`; }
      else msg = `A equipe não conseguiu capturar ${o} ${Pd.nome}.`;
      break;
    }
    case 'matador': msg = abate(st, f, id); break;
  }
  return { ok: true, msg };
}

function abate(st, f, id) {
  const F = st.fazendas[f], B = bioma(st), c = st.celulas[id];
  const aqui = st.tokens.filter(t => t.cel === id);
  const perto = st.tokens.filter(t => distancia(t.cel, id) === 1);
  let alvo = null;
  if (aqui.length) { const tk = aqui[0]; if (rnd(st) < (detectadoPor(st, f, tk) ? 0.85 : 0.5)) alvo = tk; }
  else if (perto.length && rnd(st) < 0.2) alvo = perto[0];
  const Pd = B.predador, o = Pd.f ? 'a' : 'o';
  perdeSelo(st, F, `contratou matador de ${Pd.plural}`);
  if (!alvo) return `O matador passou a noite na mata e voltou sem ${o} ${Pd.nome}. O selo foi perdido mesmo assim.`;
  st.tokens = st.tokens.filter(t => t !== alvo);
  st.onca.J = Math.max(0, st.onca.J - 1);
  F.abates++; st.ousadosPendentes++; st.bonusImigracao = 3;
  st.abatesTotal = (st.abatesTotal || 0) + 1;
  const pFiscal = alvo.colar ? 0.9 : B.fiscalAbate;
  let msg = alvo.colar ? `O matador abateu ${o} ${Pd.nome} de colar GPS. Os pesquisadores perceberam o sinal parado.` : `O matador abateu ${Pd.f ? 'uma' : 'um'} ${Pd.nome}.`;
  if (rnd(st) < pFiscal) {
    const multa = c.reserva ? MULTA.abateReserva : MULTA.abate;
    F.caixa -= multa; F.multas += multa; msg += ` A fiscalização descobriu: multa de R$ ${multa} mil.`;
  }
  return msg;
}
function moveTokenParaHabitat(st, tk) {
  const viz = vizinhos(tk.cel).filter(v => habitat(st.celulas[v]));
  if (viz.length) tk.cel = viz[Math.floor(rnd(st) * viz.length)];
  else { const h = st.celulas.filter(habitat); if (h.length) tk.cel = h[Math.floor(rnd(st) * h.length)].id; }
}

// mercado: não gasta ação
export function comprar(st, f, id, especie, n = 1) {
  const F = st.fazendas[f], c = st.celulas[id];
  if (especie === 'galinha') {
    const k = Math.min(n, F.galCap - F.galinhas, Math.floor(F.caixa / GALINHA.compra));
    if (k <= 0) return { ok: false, msg: F.galinhas >= F.galCap ? 'Galinheiro cheio' : 'Dinheiro insuficiente' };
    F.galinhas += k; F.caixa -= k * GALINHA.compra; return { ok: true, n: k };
  }
  if (posse(c) !== f || !pastejavel(c)) return { ok: false, msg: 'Escolha um pasto seu' };
  if (c.cercaDe !== f) return { ok: false, msg: 'Cerque o pasto antes de pôr animais' };
  if (c.n && c.especie !== especie) return { ok: false, msg: 'Cada pasto tem uma só espécie' };
  const k = Math.min(n, capacidade(st, c, especie) - c.n, Math.floor(F.caixa / ESPECIES[especie].compra));
  if (k <= 0) return { ok: false, msg: c.n >= capacidade(st, c, especie) ? 'Pasto lotado' : 'Dinheiro insuficiente' };
  c.especie = especie; c.n += k; F.caixa -= k * ESPECIES[especie].compra; return { ok: true, n: k };
}
export function vender(st, f, id, n = 1) {
  const F = st.fazendas[f], c = st.celulas[id], bonus = F.selo ? 1 + SELO_BONUS : 1;
  if (id === F.sede) {
    const k = Math.min(n, F.galinhas); if (k <= 0) return { ok: false, msg: 'Sem galinhas' };
    F.galinhas -= k; F.caixa += k * GALINHA.venda * bonus; return { ok: true, n: k };
  }
  if (posse(c) !== f || !c.n) return { ok: false, msg: 'Nada para vender aqui' };
  const k = Math.min(n, c.n); F.caixa += k * ESPECIES[c.especie].venda * bonus; c.n -= k; if (!c.n) c.especie = null;
  return { ok: true, n: k };
}
export function mover(st, f, de, para, n = 1) {
  const a = st.celulas[de], b = st.celulas[para];
  if (posse(a) !== f || !a.n || !pastejavel(b)) return { ok: false, msg: 'Movimento inválido' };
  if (b.cercaDe !== f) return { ok: false, msg: 'O destino precisa ser um pasto cercado por você' };
  if (b.n && b.especie !== a.especie) return { ok: false, msg: 'Cada pasto tem uma só espécie' };
  const k = Math.min(n, a.n, capacidade(st, b, a.especie) - b.n);
  if (k <= 0) return { ok: false, msg: 'Destino lotado' };
  b.especie = a.especie; b.n += k; a.n -= k; if (!a.n) a.especie = null;
  return { ok: true, n: k };
}

// ---------------------------------------------------------------- fazendeiros do computador
export function jogaIA(st, f) {
  const F = st.fazendas[f], P = F.perfil, B = bioma(st);
  const minhas = () => controladas(st, f);
  const cercar = (c, preferido) => {
    const opcoes = acoesCelula(st, f, c.id).filter(a => a.acao.startsWith('cercar_') && a.ok);
    const escolha = opcoes.find(a => a.material === 'nativa') || opcoes.find(a => a.material === preferido) || opcoes.find(a => a.material === 'madeira');
    return escolha && F.caixa >= escolha.custo + 8 ? executar(st, f, escolha.acao, c.id).ok : false;
  };
  const rancor = F.rancor || (F.rancor = {});
  const pGrila = P.grila ?? (1 - P.respeitaLei) * 1.2, pSabota = P.sabota ?? (1 - P.respeitaLei) * 0.5;
  const encosta = c => vizinhos(c.id).some(v => posse(st.celulas[v]) === f);
  // prudência: jogadas arriscadas (grilar, derrubar, revidar) só com caixa folgado e pastos cheios
  const pastosF = () => controladas(st, f).filter(c => pastejavel(c) && c.cercaDe === f);
  const cheio = () => { const ps = pastosF(); const cap = ps.reduce((a, c) => a + capacidade(st, c, c.especie || 'boi'), 0); return !cap || ps.reduce((a, c) => a + c.n, 0) >= 0.7 * cap; };
  let guarda = 0, derrubou = false, abriu = 0, tentouAbrir = false;
  // repõe o rebanho antes de gastar com o resto (animais rendem todas as estações); quem respeita menos a lei guarda mais caixa
  const repoe = base => mercadoIA(st, f, base + (P.respeitaLei >= 0.75 ? 0 : 5));
  repoe(25);
  while (F.acoes > 0 && guarda++ < 12) {
    // 0) defender a terra: desforço imediato, processos, recolher animais soltos, renovar cercas, cercar pasto aberto
    const recem = celulasDe(st, f).find(c => grilada(c) && c.notada !== false && st.t - (c.tomadaEm ?? -99) <= DESFORCO && vizinhos(c.id).some(v => posse(st.celulas[v]) === f));
    if (recem && rnd(st) < 0.3 + 0.5 * P.defende && executar(st, f, 'derrubar', recem.id).ok) continue;
    if (processosAbertos(st, f).length && rnd(st) < 0.4 + 0.5 * P.respeitaLei && executar(st, f, 'processar', F.sede).ok) continue;
    if (totalSoltos(st, f) && F.caixa >= CUSTOS.recolher + 5 && executar(st, f, 'recolher', F.sede).ok) continue;
    const invadida = celulasDe(st, f).filter(c => grilada(c) && c.notada !== false && (c.processo ?? -1) < st.t).sort((a, b) => faltaUsucapiao(a) - faltaUsucapiao(b))[0];
    if (invadida && rnd(st) < (faltaUsucapiao(invadida) <= 3 ? 0.95 : 0.4 + 0.5 * P.respeitaLei) && executar(st, f, 'justica', invadida.id).ok) continue;
    // renova cercas vencendo dos pastos com animais e das áreas griladas (para não perder a contagem da usucapião)
    const vencendo = minhas().find(c => c.cercaDe === f && (c.n || grilada(c)) && c.material !== 'concreto' && c.validade <= 2 && c.tipo !== 'sede');
    if (vencendo && cercar(vencendo, P.respeitaLei >= 0.9 ? 'concreto' : 'madeira')) continue;
    const aberto = minhas().find(c => c.cercaDe < 0 && pastejavel(c) && c.dono === f);
    if (aberto && cercar(aberto, 'madeira')) continue;
    // compensação por ataques: quem tem o selo e cuida do rebanho entra no programa
    if (!F.seguro && F.selo && executar(st, f, 'seguro', F.sede).ok) continue;
    // vingança: revida contra quem grilou a sua terra ou derrubou a sua cerca
    const inimigo = Object.keys(rancor).map(Number).filter(g => rancor[g] > 0).sort((a, b) => rancor[b] - rancor[a])[0];
    if (inimigo != null && P.vinganca && F.caixa >= 25 && rnd(st) < P.vinganca * 0.7) {
      const pasto = !derrubou && st.celulas.filter(c => c.cercaDe === inimigo && c.tipo !== 'sede' && c.n > 0 && encosta(c) && (c.material !== 'concreto' || F.caixa >= CUSTOS.derrubarConcreto + 20))
        .sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)[0];
      if (pasto && executar(st, f, 'derrubar', pasto.id).ok) { derrubou = true; rancor[inimigo] -= 2; F.revides = (F.revides || 0) + 1; st.revides = [...(st.revides || []), { por: f, contra: inimigo }]; continue; }
      const terra = st.celulas.find(c => c.cercaDe < 0 && c.dono === inimigo && c.tipo !== 'agua' && c.tipo !== 'sede' && encosta(c));
      if (terra && cercar(terra, 'madeira')) { rancor[inimigo] -= 2; F.revides = (F.revides || 0) + 1; st.revides = [...(st.revides || []), { por: f, contra: inimigo }]; continue; }
    }
    if (!F.cra && P.respeitaLei >= 0.75 && folgaReserva(st, f) > 1 && F.caixa > CUSTOS.cra + 15 && executar(st, f, 'cra', F.sede).ok) continue;
    // manejo de javaporco: protege a capacidade dos pastos por três estações
    if (B.javaporco && st.onca.V / capacidadeKV(st) > 0.3 && (F.manejoAte ?? -1) < st.t && rnd(st) < 0.85 + 0.15 * P.defende && F.caixa >= CUSTOS.manejo + 8
        && executar(st, f, 'manejo', F.sede).ok) continue;
    const atacadas = F.ataquesUltimos.map(a => st.celulas[a.cel]).filter(c => posse(c) === f);
    // 1) reação a ataques
    if (atacadas.length) {
      const alvoDef = atacadas.find(c => !c.eletrica || !c.guarda);
      if (alvoDef && rnd(st) < P.defende) {
        const ac = !alvoDef.eletrica && alvoDef.cercaDe === f && F.caixa >= CUSTOS.cerca + 5 ? 'cerca' : alvoDef.eletrica && !alvoDef.guarda && F.ataquesTotal >= 4 && F.caixa >= CUSTOS.guarda + 20 ? 'guarda' : null;
        if (ac && executar(st, f, ac, alvoDef.id).ok) continue;
      }
      if (rnd(st) < P.abate * Math.min(1, F.ataquesUltimos.length / (P.abate > 0.5 ? 1 : 3)) && F.caixa >= CUSTOS.matador + 25) {
        const lugar = F.ataquesUltimos.find(a => a.onca != null);
        const alvo = lugar ? lugar.onca : vizinhos(atacadas[0].id).find(v => habitat(st.celulas[v]) && (posse(st.celulas[v]) === f || st.celulas[v].reserva));
        if (alvo != null && executar(st, f, 'matador', alvo).ok) { F.ataquesUltimos = []; continue; }
      }
    }
    // 2) cumprir a reserva legal
    if (folgaReserva(st, f) < 0 && rnd(st) < P.respeitaLei) {
      const vazio = minhas().find(c => c.tipo === 'pasto' && !c.n);
      if (vazio && executar(st, f, 'reflorestar', vazio.id).ok) continue;
    }
    // galinheiro telado quando os pequenos predadores aumentam
    if (!F.telado && st.onca.M > 0.45 && P.defende >= 0.3 && F.caixa >= CUSTOS.telar + 15 && executar(st, f, 'telar', F.sede).ok) continue;
    // restauração: pasto vazio vira mata e rende cotas de reserva
    if (P.restaura && rnd(st) < P.restaura) {
      const vazio = minhas().find(c => c.tipo === 'pasto' && !c.n && c.dono === f);
      if (vazio && minhas().filter(c => pastejavel(c) && c.cercaDe === f).length > 2 && executar(st, f, 'reflorestar', vazio.id).ok) continue;
    }
    // 6) expansão: abrir pasto na própria terra (as estacas da mata servem para cercar depois)
    const lotado = (() => { const ps = pastosF(); const cap = ps.reduce((a, c) => a + capacidade(st, c, c.especie || 'boi'), 0); return !ps.length || ps.reduce((a, c) => a + c.n, 0) >= 0.85 * cap; })();
    const quaseCheio = (() => { const ps = pastosF(); const cap = ps.reduce((a, c) => a + capacidade(st, c, c.especie || 'boi'), 0); return !ps.length || ps.reduce((a, c) => a + c.n, 0) >= 0.6 * cap; })();
    const querAbrir = P.especula ? quaseCheio && abriu < 2 : lotado && abriu === 0;   // o especulador abre até duas áreas por estação, sem esperar lotar
    if (querAbrir && !tentouAbrir && F.caixa >= B.custoDesmate + (P.especula ? 12 : 22)) {
     tentouAbrir = !P.especula;
     if (rnd(st) < P.desmata) {
      const cands = minhas().filter(c => c.dono === f && TIPOS[c.tipo].nativa && c.tipo !== 'agua' && vizinhos(c.id).some(v => posse(st.celulas[v]) === f && !TIPOS[st.celulas[v].tipo].nativa))
        .sort((a, b) => distancia(a.id, F.sede) - distancia(b.id, F.sede));
      const legais = cands.filter(c => !desmateIlegal(st, f, c.id));
      // desmate ilegal: só para quem respeita pouco a lei, e menos onde a fiscalização é forte
      const cand = legais[0] || (rnd(st) > P.respeitaLei && rnd(st) > 2 * B.fiscalDesmate && folgaReserva(st, f) > -2 ? cands[0] : null);
      if (cand && executar(st, f, 'desmatar', cand.id).ok) { abriu++; continue; }
     }
    }
    // 3) prevenção na borda
    const risco = st.onca.J / B.Jcap > 0.45 || F.ataquesTotal >= 2;   // eletrifica a borda quando há muitos predadores ou já houve ataques
    if (risco && rnd(st) < P.defende) {
      const borda = minhas().filter(c => pastejavel(c) && c.n && naBorda(st, c) && !c.eletrica && c.cercaDe === f).sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)[0];
      if (borda && F.caixa >= CUSTOS.cerca + 15 && executar(st, f, 'cerca', borda.id).ok) continue;
    }
    // 7) grilagem: cerca a terra aberta dos vizinhos (e, para quem grila terra pública, a reserva) encostada na sua
    if (rnd(st) < pGrila && F.caixa >= 30 && cheio()) {
      const alheias = st.celulas.filter(c => c.cercaDe < 0 && (c.reserva ? P.publica && pastejavel(c) : c.dono >= 0 && c.dono !== f) && c.tipo !== 'agua' && c.tipo !== 'sede' && encosta(c)
        && (pastejavel(c) || rnd(st) < 0.25))
        .sort((a, b) => (pastejavel(b) ? 1 : 0) - (pastejavel(a) ? 1 : 0) || distancia(a.id, F.sede) - distancia(b.id, F.sede));
      if (alheias[0] && cercar(alheias[0], 'madeira')) { st.grileiros = [...new Set([...(st.grileiros || []), f])]; continue; }
    }
    // 8) sabotagem: quem respeita pouco a lei derruba, no máximo uma vez por estação, a cerca de um pasto cheio do vizinho
    if (!derrubou && F.caixa >= 30 && rnd(st) < pSabota) {
      const alvos = st.celulas.filter(c => c.cercaDe >= 0 && c.cercaDe !== f && c.tipo !== 'sede' && c.n > 0 && vizinhos(c.id).some(v => posse(st.celulas[v]) === f)
        && (c.material !== 'concreto' || F.caixa >= CUSTOS.derrubarConcreto + 30))
        .sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda);
      if (alvos[0] && executar(st, f, 'derrubar', alvos[0].id).ok) { derrubou = true; st.grileiros = [...new Set([...(st.grileiros || []), f])]; continue; }
    }
    // 10) monitoramento, com as ações que sobrarem
    if (rnd(st) < P.monitora * 0.3 && st.celulas.filter(x => x.camera === f).length < 1) {
      const local = minhas().filter(c => habitat(c) && c.camera < 0 && vizinhos(c.id).some(v => pastejavel(st.celulas[v]) && posse(st.celulas[v]) === f))[0];
      if (local && F.caixa >= CUSTOS.camera + 15 && executar(st, f, 'camera', local.id).ok) continue;
    }
    // 9) cerca de proteção: depois de alguém grilar na região, cerca a própria terra aberta que encosta na do vizinho
    const grileiros = (st.grileiros || []).filter(g => g !== f);
    if (grileiros.length && rnd(st) < P.defende * 0.7) {
      // só a terra que encosta num grileiro e vale a pena guardar: campo, ou mata colada num pasto seu
      const divisa = celulasDe(st, f).filter(c => c.cercaDe < 0 && c.tipo !== 'agua' && c.tipo !== 'sede' && encosta(c)
        && vizinhos(c.id).some(v => grileiros.includes(posse(st.celulas[v])))
        && (pastejavel(c) || vizinhos(c.id).some(v => st.celulas[v].cercaDe === f && pastejavel(st.celulas[v]))))[0];
      if (divisa && cercar(divisa, 'madeira')) continue;
    }
    break;
  }
  F.acoes = 0;
  repoe(10);
}
// mercado do computador: repõe o rebanho nos pastos cercados, primeiro os longe da mata
function mercadoIA(st, f, reserva) {
  const F = st.fazendas[f], P = F.perfil, B = bioma(st);
  // carneiros onde a terra favorece ovinos (semiárido); fora dele, só para quem quer perder pouco por ataque, e nunca no Pantanal
  const capC = B.capCarneiro ?? 1;
  const pastos = controladas(st, f).filter(pastejavel).sort((a, b) => (naBorda(st, a) ? 1 : 0) - (naBorda(st, b) ? 1 : 0));
  for (const c of pastos) {
    const esp = c.especie || (capC > 0.9 || (P.restaura && capC >= 0.85) || (P.defende > 0.8 && capC >= 0.65) ? 'carneiro' : 'boi');
    // quem planeja não enche o pasto acima do que ele vai suportar na próxima estação (o excesso seria vendido às pressas)
    const teto = P.especula ? capacidade(st, c, esp) : Math.min(capacidade(st, c, esp), capacidade(st, c, esp, st.t + 1));
    while (c.n < teto && F.caixa > reserva + ESPECIES[esp].compra && comprar(st, f, c.id, esp, 1).ok) {}
  }
  while (F.caixa > reserva + 5 + GALINHA.compra && comprar(st, f, F.sede, 'galinha', 1).ok) {}
}

// ---------------------------------------------------------------- noite: modelo presa-predador
function integraModelo(st) {
  const B = bioma(st), P = MODELO, O = st.onca;
  const K = capacidadeK(st); O.K = K;
  const L = st.celulas.reduce((s, c) => s + exposicao(st, c), 0) + (st.soltos || []).reduce((s, g) => s + exposicaoSoltos(st, g), 0);
  const fracOusado = st.tokens.length ? st.tokens.filter(t => t.ousado > 0).length / st.tokens.length : 0;
  const a2 = P.a * (B.pref ?? P.pref) * (1 + P.ousadoPref * fracOusado);
  const Jmax = Math.max(0.5, B.Jcap * K / O.K0);
  const q = P.territorio * (P.e / P.h - P.m) / Jmax;
  let r = B.r; if (B.evento === 'seca' && estacao(st) === 'seca') r *= 0.5;
  const imig = (B.imigracao + (st.bonusImigracao > 0 ? 0.35 : 0)) * Math.min(1, K / O.K0 * 1.5);
  const dt = 1 / P.passos;
  const JV = B.javaporco, KV = JV ? capacidadeKV(st) : 1; if (JV) O.KV = KV;
  const aV = JV ? P.a * JV.preferencia : 0;
  let comidoRebanho = 0, comidoSilv = 0;
  for (let s = 0; s < P.passos; s++) {
    const V = O.V || 0;
    const den = 1 + P.a * P.h * O.N + a2 * P.h * L + aV * P.h * V;
    const fN = P.a * O.N / den, fL = a2 * L / den, fV = aV * V / den;
    const dN = r * O.N * (1 - O.N / K) - O.J * fN;
    const dJ = O.J * (P.e * fN + P.eRebanho * fL + (JV ? JV.conversao * fV : 0) - P.m) - q * O.J * O.J + imig;
    if (JV) O.V = Math.max(0, V + (JV.r * V * (1 - V / KV) - O.J * fV) * dt);
    const dM = P.rm * O.M * (1 - O.M) - P.cm * O.J * O.M;
    comidoRebanho += O.J * fL * dt; comidoSilv += O.J * fN * dt;
    O.N = Math.max(1, O.N + dN * dt); O.J = Math.max(0, O.J + dJ * dt); O.M = Math.min(1, Math.max(0.02, O.M + dM * dt));
  }
  return { L, comidoRebanho, comidoSilv, K };
}

function moveTokens(st) {
  const B = bioma(st);
  const fome = st.onca.N / st.onca.K < 0.35;
  const comAnimais = new Set([...st.celulas.filter(c => c.n > 0).map(c => c.id), ...(st.soltos || []).filter(g => g.n > 0).map(g => g.cel)]);
  for (const tk of st.tokens) {
    tk.caminho = [tk.cel];
    for (let p = 0; p < B.passos; p++) {
      const ocup = new Set(st.tokens.filter(o => o !== tk).map(o => o.cel));
      const cand = [tk.cel, ...vizinhos(tk.cel)].filter(v => habitat(st.celulas[v]));
      if (!cand.length) { moveTokenParaHabitat(st, tk); break; }
      const prox = sorteia(st, cand, v => {
        const c = st.celulas[v];
        let w = TIPOS[c.tipo].habitat * (v === tk.cel ? 0.6 : 1) * (ocup.has(v) ? 0.25 : 1);
        if (fome || tk.ousado) { if (comAnimais.has(v) || vizinhos(v).some(u => comAnimais.has(u))) w *= 2.2; }
        return w;
      });
      tk.cel = prox; tk.caminho.push(prox);
    }
  }
}

function ajustaPopulacao(st) {
  const O = st.onca;
  let guarda = 0;
  while (O.J - st.tokens.length >= 0.6 && guarda++ < 5) {
    const ousado = st.ousadosPendentes > 0; if (ousado) st.ousadosPendentes--;
    if (!criaToken(st, ousado)) break;
  }
  guarda = 0;
  while (st.tokens.length - O.J >= 0.6 && guarda++ < 5) {
    const semColar = st.tokens.filter(t => !t.colar); const pool = semColar.length ? semColar : st.tokens;
    const tk = pool[Math.floor(rnd(st) * pool.length)];
    st.tokens = st.tokens.filter(t => t !== tk);
  }
}

function resolveAtaques(st, esperado) {
  const n = poisson(st, esperado);
  const ataques = [];
  for (let k = 0; k < n; k++) {
    // alvos: pastos expostos na borda e grupos de animais soltos
    const cand = [...st.celulas.filter(c => exposicao(st, c) > 0).map(c => ({ id: c.id, exp: exposicao(st, c) })),
                  ...(st.soltos || []).filter(g => g.n > 0).map(g => ({ id: g.cel, exp: exposicaoSoltos(st, g), g }))];
    if (!cand.length) break;
    const alvo = sorteia(st, cand, x => {
      const d = Math.min(99, ...st.tokens.map(t => distancia(t.cel, x.id)));
      return x.exp * (d <= 1 ? 3 : d === 2 ? 1.2 : 0.25);
    });
    const cel = st.celulas[alvo.id], grupo = alvo.g;
    // a onça responsável: a mais próxima
    let onca = null, dmin = 99;
    for (const t of st.tokens) { const d = distancia(t.cel, cel.id); if (d < dmin) { dmin = d; onca = t; } }
    let local = null;
    const viz = grupo && habitat(cel) ? [cel.id] : vizinhos(cel.id).filter(v => habitat(st.celulas[v]));
    if (onca && dmin <= 2) {
      if (viz.length) { onca.cel = viz.sort((a, b) => distancia(a, onca.cel) - distancia(b, onca.cel))[0]; local = onca.cel; }
    } else local = viz.length ? viz[0] : null;
    const esp = grupo ? grupo.especie : cel.especie, qtd = grupo ? grupo.n : cel.n;
    const mortos = esp === 'carneiro' ? Math.min(qtd, 1 + (rnd(st) < 0.5 ? 1 : 0) + (rnd(st) < 0.2 ? 1 : 0)) : 1;   // num rebanho de ovinos, um ataque pode matar vários
    const dono = grupo ? grupo.f : posse(cel);
    if (grupo) grupo.n -= mortos; else { cel.n -= mortos; if (!cel.n) cel.especie = null; }
    const F = st.fazendas[dono];
    F.perdas[esp] += mortos; F.perdasRodada[esp] += mortos; F.ataquesTotal++;
    const a = { cel: cel.id, onca: local, especie: esp, mortos, dono, solto: !!grupo };
    F.ataquesUltimos.push(a); ataques.push(a);
  }
  limpaSoltos(st);
  return ataques;
}

function eventosBioma(st, rel) {
  const B = bioma(st), est = estacao(st);
  for (const c of st.celulas) c.queimado = false;
  if (B.evento === 'cheia' && est === 'chuva') rel.eventos.push('Cheia: os campos nativos ficaram alagados e suportam menos gado.');
  if (B.evento === 'seca' && est === 'seca') rel.eventos.push('Seca: o pasto rendeu menos e as presas silvestres quase não se reproduziram.');
  if (B.evento === 'fogo' && est === 'seca' && rnd(st) < 0.45) {
    const protegida = c => posse(c) >= 0 && (st.fazendas[posse(c)].aceiroAte ?? -1) >= st.t;
    const inicio = sorteia(st, st.celulas.filter(c => (c.tipo === 'campo' || c.tipo === 'mata' || c.tipo === 'pasto') && !protegida(c)), c => c.tipo === 'campo' ? 3 : 1);
    if (inicio) {
      const queimadas = [inicio]; let frente = [inicio];
      for (let k = 0; k < 2; k++) {
        const nova = [];
        for (const c of frente) for (const v of vizinhos(c.id)) { const u = st.celulas[v]; if (!queimadas.includes(u) && !protegida(u) && ['campo', 'mata', 'pasto', 'capoeira'].includes(u.tipo) && rnd(st) < 0.35) { queimadas.push(u); nova.push(u); } }
        frente = nova;
      }
      for (const u of queimadas) {
        if (u.tipo === 'mata') { u.tipo = 'capoeira'; u.regen = B.regen; u.camera = -1; }
        u.queimado = true;
        if (u.cercaDe >= 0 && u.material !== 'concreto' && u.tipo !== 'sede') { const dono = u.cercaDe; perdeCerca(st, u, rel, -1, 'fogo'); if (dono === 0) rel.eventos.push('O fogo queimou uma cerca de madeira sua.'); }
      }
      const daPessoa = queimadas.filter(u => posse(u) === 0).length;
      const encosta = queimadas.filter(u => u.regiao === 'encosta').length;
      rel.eventos.push(`Fogo ${B.id === 'araripe' ? 'na Chapada' : 'no Cerrado'}: ${queimadas.length} ${queimadas.length === 1 ? 'área queimou' : 'áreas queimaram'}${daPessoa ? `, ${daPessoa} na sua fazenda` : ''}${encosta ? `, ${encosta} na encosta das nascentes` : ''}. Matas queimadas viraram capoeira.`);
      rel.queimadas = queimadas.map(u => u.id);
    }
  }
}

function detectar(st, rel) {
  const B = bioma(st), v = novoVisto();
  const minhas = new Set(st.celulas.filter(c => posse(c) === 0 || c.dono === 0).map(c => c.id));
  const proximas = new Set([...minhas].flatMap(id => [id, ...vizinhos(id)]));
  for (const tk of st.tokens) {
    for (const id of tk.caminho) {
      if (proximas.has(id) && habitat(st.celulas[id]) && rnd(st) < B.pegada && !v.pegadas.includes(id)) v.pegadas.push(id);
      const c = st.celulas[id];
      if (c.camera === 0 && rnd(st) < 0.85 && !v.fotos.some(x => x.cel === id && x.token === tk.id)) v.fotos.push({ cel: id, token: tk.id });
    }
  }
  v.ataques = rel.ataques.filter(a => a.dono === 0);
  v.presasFoto = st.celulas.filter(c => c.camera === 0).length ? Math.round(10 * st.onca.N / st.onca.K) : null;
  v.individuos = [...new Set(v.fotos.map(x => x.token))];
  if (B.javaporco) {
    const pv = Math.min(0.6, st.onca.V / capacidadeKV(st));
    v.fucados = [...proximas].filter(id => (habitat(st.celulas[id]) || st.celulas[id].tipo === 'pasto') && rnd(st) < pv * 0.5);
    v.javaporcoFoto = st.celulas.some(c => c.camera === 0) ? Math.round(10 * pv / 0.6) : null;
  }
  st.vistos = v;
  rel.vistos = v;
}

// Uma área perde a cerca: os animais vão para outro pasto cercado da mesma fazenda; os que não cabem ficam soltos
// (cerca que apodreceu ou queimou) ou são vendidos às pressas (área devolvida pela Justiça).
function perdeCerca(st, c, rel, novoDono = -1, motivo = 'caiu') {
  const f = c.cercaDe;
  if (c.n && f >= 0) {
    const destinos = st.celulas.filter(d => d !== c && d.cercaDe === f && pastejavel(d) && (!d.n || d.especie === c.especie));
    for (const d of destinos) { const k = Math.min(c.n, capacidade(st, d, c.especie) - d.n); if (k > 0) { d.especie = c.especie; d.n += k; c.n -= k; } if (!c.n) break; }
    if (c.n && motivo !== 'justica') {
      if (f === 0) rel?.eventos.push(`Sem cerca, ${c.n} ${c.n > 1 ? `${ESPECIES[c.especie].plural} ficaram soltos` : `${ESPECIES[c.especie].nome} ficou solto`}. Recolha na sede ou cerque a área de novo.`);
      soltar(st, f, c.especie, c.n, c.id); c.n = 0;
    }
    if (c.n) {
      st.vendasCerca = st.vendasCerca || {};
      const bonus = st.fazendas[f].selo ? 1 + SELO_BONUS : 1;
      st.vendasCerca[f] = (st.vendasCerca[f] || 0) + c.n * ESPECIES[c.especie].venda * VENDA_FORCADA * bonus;
      if (f === 0) rel?.eventos.push(`Sem cerca, ${c.n} ${c.n > 1 ? ESPECIES[c.especie].plural : ESPECIES[c.especie].nome} foram vendidos às pressas.`);
      c.n = 0;
    }
    if (!c.n) c.especie = null;
  }
  c.cercaDe = novoDono; c.eletrica = false; c.processo = undefined; c.tomadaEm = undefined; c.posse = 0; c.posseUso = 0;
  if (novoDono < 0) { c.material = null; c.validade = 0; }
}
// animais soltos se espalham pelas áreas abertas vizinhas (difusão) e alguns se perdem
function moveSoltos(st, rel) {
  if (!st.soltos?.length) return;
  const novos = []; let perdidosVoce = 0;
  for (const g of st.soltos) {
    if (g.n <= 0) continue;
    const perdidos = binom(st, g.n, SOLTOS.extravio);
    if (perdidos) { const F = st.fazendas[g.f]; F.extraviados = (F.extraviados || 0) + perdidos; if (g.f === 0) perdidosVoce += perdidos; }
    let fica = g.n - perdidos;
    const destinos = vizinhos(g.cel).filter(v => abertaParaSoltos(st.celulas[v]));
    const saem = destinos.length ? binom(st, fica, SOLTOS.difusao) : 0;
    fica -= saem;
    if (fica) novos.push({ f: g.f, especie: g.especie, n: fica, cel: g.cel });
    for (let k = 0; k < saem; k++) novos.push({ f: g.f, especie: g.especie, n: 1, cel: destinos[Math.floor(rnd(st) * destinos.length)] });
  }
  st.soltos = [];
  for (const g of novos) soltar(st, g.f, g.especie, g.n, g.cel);
  if (perdidosVoce) rel.eventos.push(`${perdidosVoce} ${perdidosVoce > 1 ? 'animais soltos se perderam' : 'animal solto se perdeu'} no mato.`);
}
// a área grilada passa a ser de quem a cercou
function usucapiao(st, c, rel) {
  const g = c.cercaDe, antigo = c.dono;
  c.dono = g; c.posse = 0; c.posseUso = 0; c.processo = undefined; c.tomadaEm = undefined;
  st.fazendas[g].usucapioes = (st.fazendas[g].usucapioes || 0) + 1;
  st.fazendas[antigo].perdidasUsucapiao = (st.fazendas[antigo].perdidasUsucapiao || 0) + 1;
  if (g === 0) rel.eventos.push(`Usucapião: a área que você cercou na terra da ${st.fazendas[antigo].nome} agora é sua. O dono não reclamou a tempo.`);
  else if (antigo === 0) rel.eventos.push(`A ${st.fazendas[g].nome} ganhou por usucapião uma área sua que tinha cercado: você não reclamou a tempo.`);
  else rel.eventos.push(`Correu a notícia de que a ${st.fazendas[g].nome} ganhou por usucapião uma área da ${st.fazendas[antigo].nome}.`);
}
function cercasEJustica(st, rel) {
  st.multasGrilagem = {};
  let avisos = 0; const alertas = {};
  for (const c of st.celulas) {
    if (c.cercaDe < 0 || c.tipo === 'sede') continue;
    // desgaste das estacas
    if (c.material !== 'concreto') {
      c.validade--;
      if (c.validade <= 0) {
        const f = c.cercaDe;
        if (f === 0) rel.eventos.push(`Uma cerca de ${CERCAS[c.material].nome} sua apodreceu e caiu: a área ficou aberta.`);
        perdeCerca(st, c, rel, -1, 'apodreceu'); continue;
      }
      if (c.cercaDe === 0 && c.validade === 1 && c.n) avisos++;
    }
    // Justiça contra a grilagem: em terra particular, só com processo do dono; na terra pública, o poder público age sozinho
    if (grilada(c)) {
      const ativo = (c.processo ?? -1) >= st.t;
      const p = ativo ? JUSTICA.acionada : c.reserva || c.dono < 0 ? JUSTICA.uc : JUSTICA.base;
      if (rnd(st) < p) {
        const g = c.cercaDe, multa = c.reserva ? MULTA.grilagemUC : MULTA.grilagem;
        st.multasGrilagem[g] = (st.multasGrilagem[g] || 0) + multa; st.fazendas[g].multas += multa;
        const dono = c.dono;
        if (g === 0) rel.eventos.push(`A Justiça tirou de você uma área grilada${dono >= 0 ? ` e a devolveu à ${st.fazendas[dono].nome}` : ''}: multa de R$ ${multa} mil.`);
        if (dono === 0) rel.eventos.push(`A Justiça devolveu a você uma área que a ${st.fazendas[g].nome} tinha cercado.`);
        perdeCerca(st, c, rel, dono >= 0 ? dono : -1, 'justica');
        continue;
      }
      // o dono (do computador) pode perceber a cerca nesta estação
      if (c.dono > 0 && !c.notada && rnd(st) < (pastejavel(c) ? VIGILANCIA.pasto : VIGILANCIA.mata) + VIGILANCIA.monitora * (st.fazendas[c.dono].perfil?.monitora ?? 0)) c.notada = true;
      // usucapião: conta a posse mansa e pacífica (sem processo) de terra particular
      if (!c.reserva && c.dono >= 0 && !ativo) {
        c.posse = (c.posse || 0) + 1;
        if (pastejavel(c) && c.n > 0) c.posseUso = (c.posseUso || 0) + 1;
        if (faltaUsucapiao(c) === 0) usucapiao(st, c, rel);
        else if (c.dono === 0 && faltaUsucapiao(c) <= USUCAPIAO.alerta) alertas[c.cercaDe] = Math.min(alertas[c.cercaDe] ?? 99, faltaUsucapiao(c));
      }
    }
  }
  for (const [g, n] of Object.entries(alertas)) rel.eventos.push(`${n > 1 ? `Faltam ${n} estações` : 'Falta 1 estação'} para a ${st.fazendas[g].nome} ganhar por usucapião uma área sua que ela cercou. Abra um processo para interromper a contagem.`);
  // processos por cerca derrubada (crime de dano ou justiça com as próprias mãos)
  st.indenizacoes = {};
  for (const d of st.danos || []) {
    if (st.t - d.t >= JUSTICA.prazoQueixa && (d.processo ?? -1) < st.t) { d.fim = true; continue; }   // a vítima não processou: decai o direito de queixa
    if (rnd(st) < ((d.processo ?? -1) >= st.t ? JUSTICA.acionada : JUSTICA.dano)) {
      d.fim = true;
      st.multasGrilagem[d.por] = (st.multasGrilagem[d.por] || 0) + MULTA.dano + MULTA.indenizacao; st.fazendas[d.por].multas += MULTA.dano;
      st.indenizacoes[d.vitima] = (st.indenizacoes[d.vitima] || 0) + MULTA.indenizacao;
      if (d.por === 0) rel.eventos.push(`A Justiça condenou você por derrubar a cerca da ${st.fazendas[d.vitima].nome}: multa de R$ ${MULTA.dano} mil e indenização de R$ ${MULTA.indenizacao} mil.`);
      if (d.vitima === 0) rel.eventos.push(`A Justiça condenou ${st.fazendas[d.por].apelido} por derrubar a sua cerca: você recebeu R$ ${MULTA.indenizacao} mil de indenização.`);
    }
  }
  st.danos = (st.danos || []).filter(d => !d.fim);
  if (avisos) rel.eventos.push(avisos > 1 ? `As cercas de ${avisos} pastos com animais caem no fim da próxima estação: renove-as.` : 'A cerca de um pasto com animais cai no fim da próxima estação: renove-a.');
}

function economia(st, rel) {
  for (const F of st.fazendas) {
    const f = F.id, bonus = F.selo ? 1 + SELO_BONUS : 1;
    let receita = 0, despesa = 0, forcada = 0, nascimentos = { boi: 0, carneiro: 0, galinha: 0 };
    // mesopredadores nas galinhas
    const taxa = MODELO.perdaGalinha * st.onca.M * (F.telado ? 0.3 : 1);
    const perdidas = binom(st, F.galinhas, taxa);
    F.galinhas -= perdidas; F.perdas.galinha += perdidas; F.perdasRodada.galinha += perdidas;
    for (const c of controladas(st, f)) {
      if (pastejavel(c) && c.n) {
        const cap = capacidade(st, c, c.especie);
        if (c.n > cap) { const k = c.n - cap; forcada += k * ESPECIES[c.especie].venda * VENDA_FORCADA * bonus; c.n = cap; if (!c.n) c.especie = null; }
      }
      if (pastejavel(c) && c.n) {
        receita += c.n * ESPECIES[c.especie].renda;
        despesa += MANUTENCAO.pasto;
        const nasc = Math.min(binom(st, c.n, ESPECIES[c.especie].repro), capacidade(st, c, c.especie) - c.n);
        c.n += Math.max(0, nasc); nascimentos[c.especie] += Math.max(0, nasc);
      }
      if (c.eletrica) despesa += MANUTENCAO.cerca;
    }
    receita += F.galinhas * GALINHA.renda;
    const ng = Math.min(binom(st, F.galinhas, GALINHA.repro) + (F.galinhas === 0 ? 0 : 0), F.galCap - F.galinhas);
    F.galinhas += ng; nascimentos.galinha = ng;
    receita *= bonus;
    let compensacao = 0;
    if (F.seguro) {
      despesa += MANUTENCAO.seguro;
      compensacao = 0.6 * (F.perdasRodada.boi * ESPECIES.boi.venda + F.perdasRodada.carneiro * ESPECIES.carneiro.venda);
    }
    // fiscalização da reserva legal e cotas de reserva ambiental
    let multa = 0;
    const folga = folgaReserva(st, f);
    const cra = F.cra ? Math.max(0, folga) * CRA_POR_CELULA : 0;
    receita += cra;
    if (folga < 0) {
      perdeSelo(st, F, 'vegetação nativa abaixo da reserva legal');
      if (rnd(st) < bioma(st).fiscalDesmate) { multa = -folga * MULTA.desmateCelula; F.multas += multa; }
    }
    for (const inf of [...F.infracoes]) {
      if (rnd(st) < bioma(st).fiscalDesmate) { const v = inf.tipo === 'app' ? MULTA.app : MULTA.zona; multa += v; F.multas += v; F.infracoes = F.infracoes.filter(x => x !== inf); }
    }
    multa += st.multasGrilagem?.[f] || 0;
    forcada += st.vendasCerca?.[f] || 0;
    const indenizacao = st.indenizacoes?.[f] || 0;
    // o selo volta depois de dois anos sem nova infração, com a reserva legal em dia e sem área grilada
    let seloVoltou = false;
    if (!F.selo && st.t - (F.ultimaInfracao ?? -99) >= SELO_VOLTA - 1 && folga >= 0 && !st.celulas.some(c => c.cercaDe === f && grilada(c))) {
      F.selo = true; F.motivoSelo = null; seloVoltou = true;
      rel.eventos.push(f === 0 ? 'Dois anos sem infrações: o selo de convivência voltou.' : `A ${F.nome} recuperou o selo de convivência.`);
    }
    F.caixa += receita + forcada + compensacao + indenizacao - despesa - multa;
    if (F.caixa < 0) F.caixa *= 1 + JUROS_DIVIDA;
    F.receitaTotal += receita;
    rel.fazendas[f] = { receita, despesa, forcada, compensacao, indenizacao, multa, cra, nascimentos, seloVoltou, perdas: { ...F.perdasRodada } };
  }
}

export function encerrarRodada(st) {
  if (st.fim) return st.relatorio;
  for (let f = 1; f < st.fazendas.length; f++) jogaIA(st, f);
  for (const F of st.fazendas) { F.ataquesUltimos = []; F.perdasRodada = { boi: 0, carneiro: 0, galinha: 0 }; }
  const B = bioma(st);
  const rel = { t: st.t, estacao: estacao(st), ano: ano(st), eventos: [], ataques: [], fazendas: [], manejoNestaEstacao: !!st.marcas?.manejo,
                abateNestaEstacao: !!st.marcas?.abate, desmateNestaEstacao: !!st.marcas?.desmate,
                cercouNestaEstacao: !!st.marcas?.cercou, grilagemNestaEstacao: !!st.marcas?.grilagem, derrubouNestaEstacao: !!st.marcas?.derrubou,
                derrubaramSuaCerca: (st.derrubadas || []).some(d => d.de === 0) };
  st.marcas = {};
  const invasores = {};
  for (const inv of st.invasoes || []) if (inv.de === 0) invasores[inv.por] = (invasores[inv.por] || 0) + 1;
  for (const [por, n] of Object.entries(invasores)) rel.eventos.push(`${st.fazendas[por].apelido} cercou ${n > 1 ? `${n} áreas sem cerca` : 'uma área sem cerca'} da sua fazenda. Na próxima estação você ainda pode derrubar essa cerca sem cometer crime (desforço imediato); depois, só pela Justiça. Sem reclamação, a área vira usucapião.`);
  for (const d of st.derrubadas || []) {
    const quem = st.fazendas[d.por], bichos = d.fugiram ? `${d.fugiram} ${d.fugiram > 1 ? ESPECIES[d.especie].plural : ESPECIES[d.especie].nome}` : null;
    if (d.de === 0) rel.eventos.push(`${quem.apelido} derrubou a cerca de um pasto seu${bichos ? `: ${bichos} ${d.fugiram > 1 ? 'fugiram' : 'fugiu'}` : ''}. `
      + (d.legal ? 'Foi desforço imediato: a terra era dele e você a tinha cercado.' : 'Na sede, você pode abrir um processo e recolher os animais soltos.'));
    else if (d.por !== 0 && !d.legal) rel.eventos.push(`Correu a notícia de que ${quem.apelido} derrubou uma cerca da ${st.fazendas[d.de].nome}.`);
  }
  for (const v of st.avisosRancor || []) rel.eventos.push(`${st.fazendas[v].apelido} mandou avisar que não vai esquecer o que você fez.`);
  for (const r of st.revides || []) if (r.contra === 0) rel.eventos.push(`${st.fazendas[r.por].apelido} mandou dizer que foi o troco.`);
  st.invasoes = []; st.vendasCerca = {}; st.derrubadas = []; st.avisosRancor = []; st.revides = [];
  const Jantes = st.onca.J, Nantes = st.onca.N;
  eventosBioma(st, rel);
  moveSoltos(st, rel);
  // herbívoros em excesso comem o pasto (efeito de cascata quando faltam onças)
  const razao = st.onca.N / capacidadeK(st);
  st.fatorHerbivoros = razao > 0.7 ? 1 - 0.45 * Math.min(1, (razao - 0.7) / 0.3) : 1;
  if (st.fatorHerbivoros < 1) rel.eventos.push(B.id === 'araripe' ? 'Caititus, veados e cotias em excesso comeram parte dos pastos.' : 'Capivaras e queixadas em excesso comeram parte dos pastos.');
  if (B.javaporco) {
    const v = st.onca.V / capacidadeKV(st);
    st.fatorJavaporco = 1 - B.javaporco.dano * v;
    rel.javaporco = v;
    if (v > 0.3) rel.eventos.push(`${B.javaporco.plural[0].toUpperCase() + B.javaporco.plural.slice(1)} fuçaram roças e pastos: a capacidade caiu ${Math.round(100 * B.javaporco.dano * v)}% nas fazendas sem manejo.`);
  }
  const mod = integraModelo(st);
  moveTokens(st);
  rel.ataques = resolveAtaques(st, mod.comidoRebanho);
  ajustaPopulacao(st);
  for (const tk of st.tokens) if (tk.ousado > 0) tk.ousado--;
  if (st.bonusImigracao > 0) st.bonusImigracao--;
  if (B.mapa === 'araripe') { rel.recarga = recarga(st); if (estacao(st) === 'seca' && rel.recarga < 0.9) rel.eventos.push(`Com menos vegetação no alto da chapada, as nascentes do vale correram mais fracas na seca (${Math.round(100 * rel.recarga)}% da recarga inicial).`); }
  if (st.soldadinho) {
    const S = st.soldadinho, antes = S.S; S.Q = qualidadeSoldadinho(st);
    S.S = Math.max(0.01, S.S + 0.4 * S.S * (1 - S.S / S.Q));
    rel.soldadinho = { antes, depois: S.S };
    if (S.S < antes - 0.03) rel.eventos.push('Menos cantos de soldadinho-do-araripe nas trilhas das nascentes.');
  }
  cercasEJustica(st, rel);
  for (const c of st.celulas) if (c.tipo === 'capoeira' && c.regen > 0) { c.regen--; if (c.regen === 0) c.tipo = 'mata'; }
  detectar(st, rel);
  economia(st, rel);
  rel.modelo = { ...mod, Jantes, Nantes, J: st.onca.J, N: st.onca.N, M: st.onca.M };
  st.t++;
  for (const F of st.fazendas) F.acoes = ACOES_POR_RODADA;
  registraHistorico(st);
  if (st.t >= RODADAS) st.fim = true;
  st.relatorio = rel;
  return rel;
}

function registraHistorico(st) {
  st.hist.push({ t: st.t, N: st.onca.N, J: st.onca.J, M: st.onca.M, K: capacidadeK(st), oncas: st.tokens.length,
                 V: st.onca.V != null ? st.onca.V / capacidadeKV(st) : null, S: st.soldadinho ? st.soldadinho.S : null, R: bioma(st).mapa === 'araripe' ? recarga(st) : null,
                 nativa: st.celulas.filter(c => TIPOS[c.tipo].nativa).length / st.celulas.length,
                 patrimonio: st.fazendas.map((_, f) => patrimonio(st, f)) });
}

export function ranking(st) {
  return st.fazendas.map((F, f) => ({ f, nome: F.nome, apelido: F.apelido, patrimonio: patrimonio(st, f), selo: F.selo, abates: F.abates }))
    .sort((a, b) => b.patrimonio - a.patrimonio);
}
