// Motor do jogo: estado, modelo presa-predador, regras, economia e fazendeiros do computador.
// Não usa o DOM; roda no navegador e no Node (para a simulação de balanceamento).
import { RODADAS, ACOES_POR_RODADA, W, H, ESPECIES, GALINHA, CUSTOS, MANUTENCAO, MULTA, SELO_BONUS, VENDA_FORCADA,
         JUROS_DIVIDA, MAX_CAMERAS, CRA_POR_CELULA, DEFESAS, TIPOS, CAPACIDADE, MODELO, BIOMAS, FAZENDAS, SEDES } from './dados.js';

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
export const celulasDe = (st, f) => st.celulas.filter(c => c.dono === f);

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
  if (B.evento === 'cheia' && est === 'chuva' && cel.tipo === 'campo') fator *= 0.5;
  // na seca o pasto rende menos, e rende ainda menos onde a vegetação nativa foi removida (solo exposto, desertificação)
  if (B.evento === 'seca' && est === 'seca') fator *= cel.dono >= 0 ? 0.3 + 0.5 * nativaFrac(st, cel.dono) : 0.6;
  if (cel.queimado) fator *= 0.5;
  fator *= st.fatorHerbivoros ?? 1;
  if (B.javaporco && !(cel.dono >= 0 && (st.fazendas[cel.dono]?.manejoAte ?? -1) >= t)) fator *= st.fatorJavaporco ?? 1;
  // a chapada é área de recarga: com menos vegetação no alto, as nascentes do vale correm mais fracas na seca
  if (B.mapa === 'araripe' && est === 'seca' && cel.regiao === 'vale') fator *= 0.6 + 0.4 * recarga(st);
  return Math.floor(cap * fator + 1e-9);
}
export function exposicao(st, cel) {
  if (!pastejavel(cel) || !cel.n || !naBorda(st, cel)) return 0;
  let x = cel.n * ESPECIES[cel.especie].presa * (bioma(st).presaPeso?.[cel.especie] ?? 1);
  if (cel.cerca) x *= DEFESAS.cerca;
  if (cel.guarda) x *= DEFESAS.guarda;
  if (cel.curral) x *= DEFESAS.curral;
  return x;
}
export function valorRebanho(st, f) {
  const F = st.fazendas[f];
  let v = F.galinhas * GALINHA.venda;
  for (const c of celulasDe(st, f)) if (c.n) v += c.n * ESPECIES[c.especie].venda;
  return v * (F.selo ? 1 + SELO_BONUS : 1);
}
export function patrimonio(st, f) { return Math.round(st.fazendas[f].caixa + valorRebanho(st, f)); }
export function cabecas(st, f) {
  const out = { boi: 0, carneiro: 0, galinha: st.fazendas[f].galinhas };
  for (const c of celulasDe(st, f)) if (c.n) out[c.especie] += c.n;
  return out;
}
export function capacidadeK(st) {
  return st.celulas.reduce((s, c) => s + TIPOS[c.tipo].K, 0) * bioma(st).Kcel;
}

// ---------------------------------------------------------------- novo jogo
export function novoJogo(biomaId, semente = (Date.now() & 0x7fffffff)) {
  const B = BIOMAS[biomaId];
  const st = { versao: 1, bioma: biomaId, semente, sementeInicial: semente, t: 0, fim: false,
               celulas: [], fazendas: [], tokens: [], proxToken: 1, hist: [], diario: [], relatorio: null,
               ousadosPendentes: 0, bonusImigracao: 0, fatorHerbivoros: 1, vistos: novoVisto() };
  const centro = 4 * W + 5;
  const sedes = SEDES.map(([c, r]) => r * W + c);
  if (B.mapa === 'araripe') gerarAraripe(st, sedes);
  else {
  for (let id = 0; id < W * H; id++) {
    const reserva = distancia(id, centro) <= 2;
    let dono = -1;
    if (!reserva) {
      let melhor = 1e9;
      sedes.forEach((s, i) => { const d = distancia(id, s) + i * 1e-3; if (d < melhor) { melhor = d; dono = i; } });
    }
    st.celulas.push({ id, tipo: 'mata', dono, reserva, regen: 0, especie: null, n: 0,
                      cerca: false, guarda: false, curral: false, camera: -1, queimado: false });
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
  // fazendas
  FAZENDAS.forEach((def, i) => {
    const F = { id: i, nome: def.nome, apelido: def.apelido, perfil: def.perfil, humano: i === 0,
                sede: sedes[i], caixa: B.caixa, selo: true, seguro: false, galinhas: 2, galCap: GALINHA.cap, telado: false,
                acoes: ACOES_POR_RODADA, cra: false, abates: 0, multas: 0, perdas: { boi: 0, carneiro: 0, galinha: 0 },
                perdasRodada: { boi: 0, carneiro: 0, galinha: 0 }, ataquesUltimos: [], ataquesTotal: 0, motivoSelo: null,
                receitaTotal: 0, desmatadas: 0, infracoes: [], manejos: 0 };
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
                      regen: 0, especie: null, n: 0, cerca: false, guarda: false, curral: false, camera: -1, queimado: false });
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
  const minha = c.dono === f;
  if (minha && TIPOS[c.tipo].nativa && c.tipo !== 'agua') {
    const vizinhoUsado = vizinhos(id).some(v => st.celulas[v].dono === f && !TIPOS[st.celulas[v].tipo].nativa);
    const ilegal = desmateIlegal(st, f, id);
    add('desmatar', ilegal ? `Desmatar (ilegal: ${ilegal})` : 'Desmatar para pasto', B.custoDesmate, vizinhoUsado,
        'Só é possível abrir pasto ao lado de outro pasto ou da sede');
    out[out.length - 1].ilegal = ilegal;
  }
  if (minha && c.tipo === 'pasto') add('reflorestar', 'Deixar a mata voltar', CUSTOS.reflorestar, !c.n, 'Retire os animais antes');
  if (minha && pastejavel(c)) {
    add('cerca', 'Cerca elétrica', CUSTOS.cerca, !c.cerca, 'Já tem cerca elétrica');
    add('guarda', B.id === 'pantanal' ? 'Búfalos de guarda' : 'Cães de guarda', CUSTOS.guarda, !c.guarda, 'Já tem animais de guarda');
    add('curral', 'Curral noturno', CUSTOS.curral, !c.curral && distancia(id, F.sede) <= 1, c.curral ? 'Já tem curral' : 'Só ao lado da sede');
  }
  if (minha && c.tipo === 'sede') {
    add('telar', 'Telar o galinheiro', CUSTOS.telar, !F.telado, 'Galinheiro já telado');
    add('ampliar', 'Ampliar o galinheiro', CUSTOS.ampliar, true, null);
    if (!F.seguro) add('seguro', 'Aderir à compensação por ataques', CUSTOS.seguro, F.selo, 'Exige o selo de convivência');
    if (!F.cra) add('cra', 'Registrar cotas de reserva (CRA)', CUSTOS.cra, true, null);
    if (B.evento === 'fogo') add('aceiro', 'Abrir aceiros contra o fogo', CUSTOS.aceiro, (F.aceiroAte ?? -1) < st.t, 'Aceiros já abertos neste ano');
    if (B.javaporco) add('manejo', `Contratar caçadores de manejo de ${B.javaporco.nome}`, CUSTOS.manejo, (st.onca.V || 0) >= 1, `Não há ${B.javaporco.plural} para manejar`);
  }
  const acessivel = minha || c.reserva;
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
  if (f === 0) { st.marcas = st.marcas || {}; if (acao === 'matador') st.marcas.abate = true; if (acao === 'desmatar') st.marcas.desmate = true; if (acao === 'manejo') st.marcas.manejo = true; }
  let msg = '';
  switch (acao) {
    case 'desmatar': {
      const ilegal = desmateIlegal(st, f, id);
      c.tipo = 'pasto'; c.regen = 0; c.camera = -1; F.desmatadas++;
      for (const tk of st.tokens) if (tk.cel === id) moveTokenParaHabitat(st, tk);
      if (ilegal && F.selo) { F.selo = false; F.seguro = false; F.motivoSelo = `desmate ilegal (${ilegal})`; }
      if (ilegal && ilegal !== 'abaixo da reserva legal') F.infracoes.push({ cel: id, tipo: ilegal === 'APP de nascente' ? 'app' : 'zona' });
      msg = ilegal ? `Pasto aberto de forma ilegal (${ilegal}). O selo foi perdido e a fiscalização pode multar.` : 'Pasto aberto. A mata e suas presas diminuíram.';
      break;
    }
    case 'aceiro': F.aceiroAte = st.t + 1; msg = 'Aceiros abertos: o fogo não entra na sua fazenda nesta estação nem na próxima.'; break;
    case 'manejo': {
      const antes = st.onca.V; st.onca.V *= 0.5; F.manejos++; F.manejoAte = st.t + 2;
      st.onca.N *= 0.98; // cães e tiros espantam a fauna nativa
      msg = `Os caçadores de manejo, com autorização no SIMAF, retiraram cerca de ${Math.round(antes - st.onca.V)} ${B.javaporco.plural} da região e mantêm as varas longe dos seus pastos por três estações.`;
      break;
    }
    case 'reflorestar': c.tipo = 'capoeira'; c.regen = B.regen; c.cerca = c.guarda = c.curral = false;
      msg = `A capoeira vira mata em ${B.regen} estações.`; break;
    case 'cerca': c.cerca = true; msg = 'Cerca elétrica instalada.'; break;
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
  if (F.selo) { F.selo = false; F.seguro = false; F.motivoSelo = `contratou matador de ${Pd.plural}`; }
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
  if (c.dono !== f || !pastejavel(c)) return { ok: false, msg: 'Escolha um pasto seu' };
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
  if (c.dono !== f || !c.n) return { ok: false, msg: 'Nada para vender aqui' };
  const k = Math.min(n, c.n); F.caixa += k * ESPECIES[c.especie].venda * bonus; c.n -= k; if (!c.n) c.especie = null;
  return { ok: true, n: k };
}
export function mover(st, f, de, para, n = 1) {
  const a = st.celulas[de], b = st.celulas[para];
  if (a.dono !== f || b.dono !== f || !a.n || !pastejavel(b)) return { ok: false, msg: 'Movimento inválido' };
  if (b.n && b.especie !== a.especie) return { ok: false, msg: 'Cada pasto tem uma só espécie' };
  const k = Math.min(n, a.n, capacidade(st, b, a.especie) - b.n);
  if (k <= 0) return { ok: false, msg: 'Destino lotado' };
  b.especie = a.especie; b.n += k; a.n -= k; if (!a.n) a.especie = null;
  return { ok: true, n: k };
}

// ---------------------------------------------------------------- fazendeiros do computador
export function jogaIA(st, f) {
  const F = st.fazendas[f], P = F.perfil, B = bioma(st);
  const minhas = () => celulasDe(st, f);
  let guarda = 0;
  while (F.acoes > 0 && guarda++ < 12) {
    const atacadas = F.ataquesUltimos.map(a => st.celulas[a.cel]).filter(c => c.dono === f);
    // 1) reação a ataques
    if (atacadas.length) {
      const alvoDef = atacadas.find(c => !c.cerca || !c.guarda);
      if (alvoDef && rnd(st) < P.defende) {
        const ac = !alvoDef.cerca && F.caixa >= CUSTOS.cerca + 5 ? 'cerca' : !alvoDef.guarda ? 'guarda' : null;
        if (ac && executar(st, f, ac, alvoDef.id).ok) continue;
      }
      if (rnd(st) < P.abate * Math.min(1, F.ataquesUltimos.length / (P.abate > 0.5 ? 1 : 3)) && F.caixa >= CUSTOS.matador + 10) {
        const lugar = F.ataquesUltimos.find(a => a.onca != null);
        const alvo = lugar ? lugar.onca : vizinhos(atacadas[0].id).find(v => habitat(st.celulas[v]) && (st.celulas[v].dono === f || st.celulas[v].reserva));
        if (alvo != null && executar(st, f, 'matador', alvo).ok) { F.ataquesUltimos = []; continue; }
      }
    }
    if (!F.cra && P.respeitaLei >= 0.9 && folgaReserva(st, f) > 2 && F.caixa > CUSTOS.cra + 20 && executar(st, f, 'cra', F.sede).ok) continue;
    // 2) cumprir a reserva legal
    if (folgaReserva(st, f) < 0 && rnd(st) < P.respeitaLei) {
      const vazio = minhas().find(c => c.tipo === 'pasto' && !c.n);
      if (vazio && executar(st, f, 'reflorestar', vazio.id).ok) continue;
    }
    // 3) prevenção na borda
    if (rnd(st) < P.defende * 0.6) {
      const borda = minhas().filter(c => pastejavel(c) && c.n && naBorda(st, c) && !c.cerca).sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)[0];
      if (borda && F.caixa >= CUSTOS.cerca + 15 && executar(st, f, 'cerca', borda.id).ok) continue;
    }
    // 4) monitoramento
    if (rnd(st) < P.monitora * 0.5 && st.celulas.filter(x => x.camera === f).length < 2) {
      const local = minhas().filter(c => habitat(c) && c.camera < 0 && vizinhos(c.id).some(v => pastejavel(st.celulas[v]) && st.celulas[v].dono === f))[0];
      if (local && F.caixa >= CUSTOS.camera + 15 && executar(st, f, 'camera', local.id).ok) continue;
    }
    // 5) expansão
    // 5) manejo de javaporco
    if (B.javaporco && st.onca.V / capacidadeKV(st) > 0.3 && (F.manejoAte ?? -1) < st.t && rnd(st) < (P.defende + P.abate) / 1.4 && F.caixa >= CUSTOS.manejo + 15
        && executar(st, f, 'manejo', F.sede).ok) continue;
    // 6) expansão
    const lotado = minhas().filter(pastejavel).every(c => c.n >= capacidade(st, c, c.especie || 'boi') * 0.6);
    if (rnd(st) < P.desmata && lotado && F.caixa >= B.custoDesmate + 25) {
      const cands = minhas().filter(c => TIPOS[c.tipo].nativa && c.tipo !== 'agua' && vizinhos(c.id).some(v => st.celulas[v].dono === f && !TIPOS[st.celulas[v].tipo].nativa))
        .sort((a, b) => distancia(a.id, F.sede) - distancia(b.id, F.sede));
      const legais = cands.filter(c => !desmateIlegal(st, f, c.id));
      const cand = legais[0] || (rnd(st) > P.respeitaLei ? cands[0] : null);
      if (cand && executar(st, f, 'desmatar', cand.id).ok) continue;
    }
    break;
  }
  F.acoes = 0;
  // mercado: tira animais da borda mais exposta se tiver cerca em outro lugar, e repõe o rebanho
  const pastos = minhas().filter(pastejavel).sort((a, b) => (naBorda(st, a) ? 1 : 0) - (naBorda(st, b) ? 1 : 0));
  for (const c of pastos) {
    const esp = c.especie || (B.id === 'caatinga' || P.defende > 0.8 ? 'carneiro' : 'boi');
    while (F.caixa > 20 + ESPECIES[esp].compra && comprar(st, f, c.id, esp, 1).ok) {}
  }
  while (F.caixa > 15 + GALINHA.compra && comprar(st, f, F.sede, 'galinha', 1).ok) {}
}

// ---------------------------------------------------------------- noite: modelo presa-predador
function integraModelo(st) {
  const B = bioma(st), P = MODELO, O = st.onca;
  const K = capacidadeK(st); O.K = K;
  const L = st.celulas.reduce((s, c) => s + exposicao(st, c), 0);
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
  for (const tk of st.tokens) {
    tk.caminho = [tk.cel];
    for (let p = 0; p < B.passos; p++) {
      const ocup = new Set(st.tokens.filter(o => o !== tk).map(o => o.cel));
      const cand = [tk.cel, ...vizinhos(tk.cel)].filter(v => habitat(st.celulas[v]));
      if (!cand.length) { moveTokenParaHabitat(st, tk); break; }
      const prox = sorteia(st, cand, v => {
        const c = st.celulas[v];
        let w = TIPOS[c.tipo].habitat * (v === tk.cel ? 0.6 : 1) * (ocup.has(v) ? 0.25 : 1);
        if (fome || tk.ousado) { if (vizinhos(v).some(u => st.celulas[u].n > 0)) w *= 2.2; }
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
    const cand = st.celulas.filter(c => exposicao(st, c) > 0);
    if (!cand.length) break;
    const cel = sorteia(st, cand, c => {
      const d = Math.min(99, ...st.tokens.map(t => distancia(t.cel, c.id)));
      return exposicao(st, c) * (d <= 1 ? 3 : d === 2 ? 1.2 : 0.25);
    });
    // a onça responsável: a mais próxima
    let onca = null, dmin = 99;
    for (const t of st.tokens) { const d = distancia(t.cel, cel.id); if (d < dmin) { dmin = d; onca = t; } }
    let local = null;
    if (onca && dmin <= 2) {
      const viz = vizinhos(cel.id).filter(v => habitat(st.celulas[v]));
      if (viz.length) { onca.cel = viz.sort((a, b) => distancia(a, onca.cel) - distancia(b, onca.cel))[0]; local = onca.cel; }
    } else {
      const viz = vizinhos(cel.id).filter(v => habitat(st.celulas[v])); local = viz.length ? viz[0] : null;
    }
    const esp = cel.especie, mortos = esp === 'carneiro' ? Math.min(cel.n, 1 + (rnd(st) < 0.4 ? 1 : 0)) : 1;
    cel.n -= mortos; if (!cel.n) cel.especie = null;
    const F = st.fazendas[cel.dono];
    F.perdas[esp] += mortos; F.perdasRodada[esp] += mortos; F.ataquesTotal++;
    const a = { cel: cel.id, onca: local, especie: esp, mortos, dono: cel.dono };
    F.ataquesUltimos.push(a); ataques.push(a);
  }
  return ataques;
}

function eventosBioma(st, rel) {
  const B = bioma(st), est = estacao(st);
  for (const c of st.celulas) c.queimado = false;
  if (B.evento === 'cheia' && est === 'chuva') rel.eventos.push('Cheia: os campos nativos ficaram alagados e suportam menos gado.');
  if (B.evento === 'seca' && est === 'seca') rel.eventos.push('Seca: o pasto rendeu menos e as presas silvestres quase não se reproduziram.');
  if (B.evento === 'fogo' && est === 'seca' && rnd(st) < 0.45) {
    const protegida = c => c.dono >= 0 && (st.fazendas[c.dono].aceiroAte ?? -1) >= st.t;
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
      }
      const daPessoa = queimadas.filter(u => u.dono === 0).length;
      const encosta = queimadas.filter(u => u.regiao === 'encosta').length;
      rel.eventos.push(`Fogo ${B.id === 'araripe' ? 'na Chapada' : 'no Cerrado'}: ${queimadas.length} ${queimadas.length === 1 ? 'área queimou' : 'áreas queimaram'}${daPessoa ? `, ${daPessoa} na sua fazenda` : ''}${encosta ? `, ${encosta} na encosta das nascentes` : ''}. Matas queimadas viraram capoeira.`);
      rel.queimadas = queimadas.map(u => u.id);
    }
  }
}

function detectar(st, rel) {
  const B = bioma(st), v = novoVisto();
  const minhas = new Set(celulasDe(st, 0).map(c => c.id));
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

function economia(st, rel) {
  for (const F of st.fazendas) {
    const f = F.id, bonus = F.selo ? 1 + SELO_BONUS : 1;
    let receita = 0, despesa = 0, forcada = 0, nascimentos = { boi: 0, carneiro: 0, galinha: 0 };
    // mesopredadores nas galinhas
    const taxa = MODELO.perdaGalinha * st.onca.M * (F.telado ? 0.3 : 1);
    const perdidas = binom(st, F.galinhas, taxa);
    F.galinhas -= perdidas; F.perdas.galinha += perdidas; F.perdasRodada.galinha += perdidas;
    for (const c of celulasDe(st, f)) {
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
      if (c.cerca) despesa += MANUTENCAO.cerca;
      if (c.tipo === 'capoeira' && c.regen > 0) { c.regen--; if (c.regen === 0) c.tipo = 'mata'; }
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
      if (F.selo) { F.selo = false; F.seguro = false; F.motivoSelo = 'vegetação nativa abaixo da reserva legal'; }
      if (rnd(st) < bioma(st).fiscalDesmate) { multa = -folga * MULTA.desmateCelula; F.multas += multa; }
    }
    for (const inf of [...F.infracoes]) {
      if (rnd(st) < bioma(st).fiscalDesmate) { const v = inf.tipo === 'app' ? MULTA.app : MULTA.zona; multa += v; F.multas += v; F.infracoes = F.infracoes.filter(x => x !== inf); }
    }
    F.caixa += receita + forcada + compensacao - despesa - multa;
    if (F.caixa < 0) F.caixa *= 1 + JUROS_DIVIDA;
    F.receitaTotal += receita;
    rel.fazendas[f] = { receita, despesa, forcada, compensacao, multa, cra, nascimentos, perdas: { ...F.perdasRodada } };
  }
}

export function encerrarRodada(st) {
  if (st.fim) return st.relatorio;
  for (let f = 1; f < st.fazendas.length; f++) jogaIA(st, f);
  for (const F of st.fazendas) { F.ataquesUltimos = []; F.perdasRodada = { boi: 0, carneiro: 0, galinha: 0 }; }
  const B = bioma(st);
  const rel = { t: st.t, estacao: estacao(st), ano: ano(st), eventos: [], ataques: [], fazendas: [], manejoNestaEstacao: !!st.marcas?.manejo,
                abateNestaEstacao: !!st.marcas?.abate, desmateNestaEstacao: !!st.marcas?.desmate };
  st.marcas = {};
  const Jantes = st.onca.J, Nantes = st.onca.N;
  eventosBioma(st, rel);
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
