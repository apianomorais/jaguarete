import * as M from '../js/motor.js';
import { ESPECIES, CUSTOS } from '../js/dados.js';
// Estratégias de teste para a fazenda da pessoa (índice 0).
const NAT = ['mata', 'capoeira', 'campo'];
function candidataDesmate(st, soLegal = true) {
  return M.celulasDe(st, 0).filter(c => NAT.includes(c.tipo) && M.vizinhos(c.id).some(v => st.celulas[v].dono === 0 && !M.habitat(st.celulas[v]) ))
    .filter(c => !soLegal || !M.desmateIlegal(st, 0, c.id))
    .sort((a, b) => M.distancia(a.id, st.fazendas[0].sede) - M.distancia(b.id, st.fazendas[0].sede))[0];
}
const lotacao = st => { const ps = M.celulasDe(st, 0).filter(M.pastejavel); const cap = ps.reduce((s, c) => s + M.capacidade(st, c, c.especie || 'boi'), 0); return cap ? ps.reduce((s, c) => s + c.n, 0) / cap : 1; };
// cuida das cercas: processa grileiros, renova cercas com animais e cerca pastos abertos
export function cuidaCercas(st, preferido = 'madeira') {
  const F = st.fazendas[0];
  const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
  const cercar = c => {
    const ops = M.acoesCelula(st, 0, c.id).filter(a => a.acao.startsWith('cercar_') && a.ok);
    const esc = ops.find(a => a.material === 'nativa') || ops.find(a => a.material === preferido) || ops.find(a => a.material === 'madeira');
    return esc && F.caixa >= esc.custo + 8 && tenta(esc.acao, c.id);
  };
  // desforço imediato contra quem acabou de grilar, processo por cerca derrubada e recolher animais soltos
  for (const c of M.celulasDe(st, 0).filter(M.grilada)) { const d = M.acoesCelula(st, 0, c.id).find(x => x.acao === 'derrubar' && x.desforco); if (d) tenta('derrubar', c.id); }
  if (M.processosAbertos(st, 0).length) tenta('processar', F.sede);
  if (M.totalSoltos(st, 0)) tenta('recolher', F.sede);
  for (const c of M.celulasDe(st, 0).filter(c => M.grilada(c) && (c.processo ?? -1) < st.t)) tenta('justica', c.id);
  for (const c of M.controladas(st, 0).filter(c => c.cercaDe === 0 && (c.n || M.grilada(c)) && c.material !== 'concreto' && c.validade <= 2)) cercar(c);
  for (const c of M.controladas(st, 0).filter(c => c.cercaDe < 0 && M.pastejavel(c) && c.dono === 0)) cercar(c);
  return cercar;
}
// risco visível para a pessoa: ataques recentes na fazenda ou pegadas encostadas no pasto
export function emRisco(st, c) {
  const perto = new Set([c.id, ...M.vizinhos(c.id)]);
  return st.fazendas[0].ataquesTotal >= 2 || st.vistos.ataques.length > 0 || st.vistos.pegadas.some(id => perto.has(id));
}
export function reabastece(st, reserva = 10) {
  const F = st.fazendas[0];
  const ps = M.celulasDe(st, 0).filter(M.pastejavel).sort((a, b) => (M.naBorda(st, a) ? 1 : 0) - (M.naBorda(st, b) ? 1 : 0) || (b.eletrica ? 1 : 0) - (a.eletrica ? 1 : 0));
  for (const c of ps) {
    // carneiros onde a terra favorece ovinos (semiárido), bois no resto
    const esp = c.especie || (process.env.ESP || ((M.bioma(st).capCarneiro ?? 1) > 0.9 ? 'carneiro' : 'boi'));
    // não compra acima do que o pasto suporta na próxima estação (o excesso seria vendido às pressas)
    const teto = Math.min(M.capacidade(st, c, esp), M.capacidade(st, c, esp, st.t + 1));
    while (c.n < teto && F.caixa > reserva + ESPECIES[esp].compra && M.comprar(st, 0, c.id, esp, 1).ok) {}
  }
  while (F.caixa > reserva + 4 && M.comprar(st, 0, F.sede, 'galinha', 1).ok) {}
}
export const ESTR = {
  passiva(st) { reabastece(st); },
  grileiro(st) {
    const F = st.fazendas[0];
    const cercar = cuidaCercas(st, 'madeira');
    for (let k = 0; k < 3; k++) {
      const alvo = st.celulas.filter(c => c.cercaDe < 0 && c.dono > 0 && c.tipo !== 'agua' && c.tipo !== 'sede' && M.vizinhos(c.id).some(v => M.posse(st.celulas[v]) === 0))
        .sort((a, b) => (M.pastejavel(b) ? 1 : 0) - (M.pastejavel(a) ? 1 : 0))[0];
      if (alvo && F.acoes > 0) cercar(alvo);
    }
    reabastece(st);
  },
  conviver(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    cuidaCercas(st, 'madeira');
    reabastece(st, 25);
    if (!F.seguro && F.selo) tenta('seguro', F.sede);
    if (!F.cra && M.folgaReserva(st, 0) > 2) tenta('cra', F.sede);
    if (st.onca.V != null && st.onca.V / M.capacidadeKV(st) > 0.3 && (F.manejoAte ?? -1) < st.t) tenta('manejo', F.sede);
    for (const c of M.celulasDe(st, 0).filter(c => M.pastejavel(c) && M.naBorda(st, c) && c.n && emRisco(st, c)).sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)) {
      if (!c.eletrica && F.caixa > CUSTOS.cerca + 5) tenta('cerca', c.id);
    }
    if (!F.telado && st.onca.M > 0.4) tenta('telar', F.sede);
    if (lotacao(st) > 0.85 && M.folgaReserva(st, 0) > 0 && F.caixa > 30) { const c = candidataDesmate(st); if (c && tenta('desmatar', c.id)) cuidaCercas(st, 'madeira'); }
    reabastece(st);
  },
  desmatar_abater(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    cuidaCercas(st, 'madeira');
    for (const a of F.ataquesUltimos) if (a.onca != null && F.caixa > CUSTOS.matador) tenta('matador', a.onca);
    reabastece(st, 15);
    for (let k = 0; k < 2; k++) if (lotacao(st) > 0.8 && F.caixa > 25) { const c = candidataDesmate(st, false); if (c && tenta('desmatar', c.id)) cuidaCercas(st, 'madeira'); }
    reabastece(st);
  },
  abater(st) {
    const F = st.fazendas[0];
    cuidaCercas(st, 'madeira');
    for (const a of F.ataquesUltimos) if (a.onca != null && F.caixa > 10 && F.acoes > 0) M.executar(st, 0, 'matador', a.onca);
    reabastece(st);
  },
  // conviver, mas cerca o pasto aberto de um vizinho quando aparece (sem tocar na reserva)
  oportunista(st) {
    const F = st.fazendas[0];
    const cercar = cuidaCercas(st, 'madeira');
    const alvo = st.celulas.find(c => c.cercaDe < 0 && c.dono > 0 && !c.reserva && M.pastejavel(c) && M.vizinhos(c.id).some(v => M.posse(st.celulas[v]) === 0));
    if (alvo) cercar(alvo);
    ESTR.conviver(st);
  },
  // conviver, mas derruba a cerca do pasto mais cheio de um vizinho a cada estação
  sabotador(st) {
    const F = st.fazendas[0];
    cuidaCercas(st, 'madeira');
    const alvo = st.celulas.filter(c => c.cercaDe > 0 && c.tipo !== 'sede' && c.n > 0 && c.material !== 'concreto' && M.vizinhos(c.id).some(v => M.posse(st.celulas[v]) === 0))
      .sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)[0];
    if (alvo && F.acoes > 0) M.executar(st, 0, 'derrubar', alvo.id);
    ESTR.conviver(st);
  },
  // conviver, e no máximo duas vezes nos seis primeiros anos derruba a cerca do pasto mais cheio do vizinho que lidera
  sabotador_pontual(st) {
    const F = st.fazendas[0];
    cuidaCercas(st, 'madeira');
    const rk = M.ranking(st), lider = rk[0].f;
    if (lider !== 0 && (F.derrubadas || 0) < 2 && st.t < 12) {
      const alvo = st.celulas.filter(c => c.cercaDe === lider && c.tipo !== 'sede' && c.n > 0 && c.material !== 'concreto' && M.vizinhos(c.id).some(v => M.posse(st.celulas[v]) === 0))
        .sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)[0];
      if (alvo && F.acoes > 0) M.executar(st, 0, 'derrubar', alvo.id);
    }
    ESTR.conviver(st);
  },
  conviver_sem_manejo(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    cuidaCercas(st, 'madeira');
    reabastece(st, 25);
    if (!F.seguro && F.selo) tenta('seguro', F.sede);
    if (!F.cra && M.folgaReserva(st, 0) > 2) tenta('cra', F.sede);
    for (const c of M.celulasDe(st, 0).filter(c => M.pastejavel(c) && M.naBorda(st, c) && c.n && emRisco(st, c))) if (!c.eletrica && F.caixa > CUSTOS.cerca + 5) tenta('cerca', c.id);
    if (lotacao(st) > 0.85 && M.folgaReserva(st, 0) > 0 && F.caixa > 30) { const c = candidataDesmate(st); if (c) tenta('desmatar', c.id); }
    reabastece(st);
  },
  desmatar_legal(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    cuidaCercas(st, 'madeira');
    reabastece(st, 15);
    for (let k = 0; k < 2; k++) if (lotacao(st) > 0.8 && F.caixa > 25 && M.folgaReserva(st, 0) > 0) { const c = candidataDesmate(st); if (c && tenta('desmatar', c.id)) cuidaCercas(st, 'madeira'); }
    reabastece(st);
  },
};
