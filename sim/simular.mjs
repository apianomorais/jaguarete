// Simulação de Monte Carlo para balancear o jogo. Uso: node sim/simular.mjs [N] [semente]
import * as M from '../js/motor.js';
import { BIOMAS, ESPECIES, CUSTOS } from '../js/dados.js';
const N = +(process.argv[2] || 300), SEM = +(process.argv[3] || 20261116);

import { ESTR } from './estrategias.mjs';
function partida(biomaId, estr, sem) {
  const st = M.novoJogo(biomaId, sem);
  while (!st.fim) { ESTR[estr](st); st.fazendas[0].acoes = 0; M.encerrarRodada(st); }
  const r = M.ranking(st);
  return { st, pos: r.findIndex(x => x.f === 0) + 1, pat: M.patrimonio(st, 0), pats: st.fazendas.map((_, f) => M.patrimonio(st, f)),
           ataques: st.fazendas.map(F => F.ataquesTotal), griladas: st.fazendas.map((_, f) => st.celulas.filter(c => M.grilada(c) && c.cercaDe === f).length), perdidas: st.celulas.filter(c => c.dono === 0 && M.grilada(c)).length, multas: st.fazendas.map(F => F.multas), S: st.soldadinho?.S ?? null, Vfim: st.hist.at(-1).V, abates: st.abatesTotal || 0, Jfim: st.onca.J, extinta: st.onca.J < 0.5,
           Js: st.hist.map(h => h.J), Ns: st.hist.map(h => h.N / h.K) };
}
const media = a => a.reduce((x, y) => x + y, 0) / a.length;
const out = {};
for (const b of Object.keys(BIOMAS).filter(b => !process.env.BIOMAS || process.env.BIOMAS.split(',').includes(b))) {
  out[b] = {};
  for (const e of Object.keys(ESTR).filter(e => !process.env.ESTR || process.env.ESTR.split(',').includes(e))) {
    const rs = []; for (let i = 0; i < N; i++) rs.push(partida(b, e, SEM + i * 7919));
    out[b][e] = {
      vitoria: +(100 * rs.filter(r => r.pos === 1).length / N).toFixed(1),
      patrimonio: Math.round(media(rs.map(r => r.pat))),
      ia: [1, 2, 3].map(f => Math.round(media(rs.map(r => r.pats[f])))),
      ataquesVoce: +media(rs.map(r => r.ataques[0])).toFixed(1),
      ataquesIA: [1, 2, 3].map(f => +media(rs.map(r => r.ataques[f])).toFixed(1)),
      abates: +media(rs.map(r => r.abates)).toFixed(1),
      oncasFim: +media(rs.map(r => r.Jfim)).toFixed(1),
      extincao: +(100 * rs.filter(r => r.extinta).length / N).toFixed(1),
      griladasFim: [0, 1, 2, 3].map(f => +media(rs.map(r => r.griladas[f])).toFixed(1)), perdidasVoce: +media(rs.map(r => r.perdidas)).toFixed(1), multasMedia: [0, 1, 2, 3].map(f => Math.round(media(rs.map(r => r.multas[f])))),
      soldadinho: rs[0].S == null ? null : +media(rs.map(r => r.S)).toFixed(2), javaporcoFim: rs[0].Vfim == null ? null : +media(rs.map(r => r.Vfim)).toFixed(2),
      Jmedio: Array.from({ length: 21 }, (_, t) => +media(rs.map(r => r.Js[t])).toFixed(1)).filter((_, t) => t % 2 === 0),
      Nmedio: Array.from({ length: 21 }, (_, t) => +media(rs.map(r => r.Ns[t])).toFixed(2)).filter((_, t) => t % 2 === 0),
    };
  }
}
console.log(JSON.stringify(out, null, 1));
