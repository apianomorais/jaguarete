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
export function reabastece(st, reserva = 10) {
  const F = st.fazendas[0];
  const ps = M.celulasDe(st, 0).filter(M.pastejavel).sort((a, b) => (M.naBorda(st, a) ? 1 : 0) - (M.naBorda(st, b) ? 1 : 0) || (b.cerca ? 1 : 0) - (a.cerca ? 1 : 0));
  for (const c of ps) {
    const esp = c.especie || (st.bioma === 'caatinga' ? 'carneiro' : 'boi');
    while (F.caixa > reserva + ESPECIES[esp].compra && M.comprar(st, 0, c.id, esp, 1).ok) {}
  }
  while (F.caixa > reserva + 4 && M.comprar(st, 0, F.sede, 'galinha', 1).ok) {}
}
export const ESTR = {
  passiva(st) { reabastece(st); },
  conviver(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    reabastece(st, 25);
    if (!F.seguro && F.selo) tenta('seguro', F.sede);
    if (!F.cra && M.folgaReserva(st, 0) > 2) tenta('cra', F.sede);
    if (st.onca.V != null && st.onca.V / M.capacidadeKV(st) > 0.3 && (F.manejoAte ?? -1) < st.t) tenta('manejo', F.sede);
    for (const c of M.celulasDe(st, 0).filter(c => M.pastejavel(c) && M.naBorda(st, c) && c.n).sort((a, b) => b.n * ESPECIES[b.especie].venda - a.n * ESPECIES[a.especie].venda)) {
      if (!c.cerca && F.caixa > CUSTOS.cerca + 5) tenta('cerca', c.id);
    }
    if (!F.telado && st.onca.M > 0.4) tenta('telar', F.sede);
    if (lotacao(st) > 0.85 && M.folgaReserva(st, 0) > 0 && F.caixa > 30) { const c = candidataDesmate(st); if (c) tenta('desmatar', c.id); }
    reabastece(st);
  },
  desmatar_abater(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    for (const a of F.ataquesUltimos) if (a.onca != null && F.caixa > CUSTOS.matador) tenta('matador', a.onca);
    reabastece(st, 15);
    for (let k = 0; k < 3; k++) if (lotacao(st) > 0.8 && F.caixa > 25) { const c = candidataDesmate(st, false); if (c) tenta('desmatar', c.id); }
    reabastece(st);
  },
  abater(st) {
    const F = st.fazendas[0];
    for (const a of F.ataquesUltimos) if (a.onca != null && F.caixa > 10 && F.acoes > 0) M.executar(st, 0, 'matador', a.onca);
    reabastece(st);
  },
  conviver_sem_manejo(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    reabastece(st, 25);
    if (!F.seguro && F.selo) tenta('seguro', F.sede);
    if (!F.cra && M.folgaReserva(st, 0) > 2) tenta('cra', F.sede);
    for (const c of M.celulasDe(st, 0).filter(c => M.pastejavel(c) && M.naBorda(st, c) && c.n)) if (!c.cerca && F.caixa > CUSTOS.cerca + 5) tenta('cerca', c.id);
    if (lotacao(st) > 0.85 && M.folgaReserva(st, 0) > 0 && F.caixa > 30) { const c = candidataDesmate(st); if (c) tenta('desmatar', c.id); }
    reabastece(st);
  },
  desmatar_legal(st) {
    const F = st.fazendas[0];
    const tenta = (ac, id) => F.acoes > 0 && M.executar(st, 0, ac, id).ok;
    reabastece(st, 15);
    for (let k = 0; k < 3; k++) if (lotacao(st) > 0.8 && F.caixa > 25 && M.folgaReserva(st, 0) > 0) { const c = candidataDesmate(st); if (c) tenta('desmatar', c.id); }
    reabastece(st);
  },
};
