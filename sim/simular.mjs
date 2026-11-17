// Simulação de Monte Carlo para balancear o jogo.
// Uso: node sim/simular.mjs [N] [semente]   (variáveis: BIOMAS=a,b  ESTR=x,y  VIZ=bras,celeste,ze para fixar os vizinhos)
import * as M from '../js/motor.js';
import { BIOMAS, VIZINHOS } from '../js/dados.js';
import { ESTR } from './estrategias.mjs';
const N = +(process.argv[2] || 300), SEM = +(process.argv[3] || 20261116);
const VIZ = process.env.VIZ ? process.env.VIZ.split(',') : undefined;

function partida(biomaId, estr, sem) {
  const st = M.novoJogo(biomaId, sem, { vizinhos: VIZ });
  while (!st.fim) { ESTR[estr](st); st.fazendas[0].acoes = 0; M.encerrarRodada(st); }
  const r = M.ranking(st);
  return { pos: r.findIndex(x => x.f === 0) + 1, pat: M.patrimonio(st, 0), pats: st.fazendas.map((_, f) => M.patrimonio(st, f)),
           posicoes: st.fazendas.map((_, f) => r.findIndex(x => x.f === f) + 1), chaves: st.fazendas.map(F => F.chave),
           ataques: st.fazendas.map(F => F.ataquesTotal), multas: st.fazendas.map(F => F.multas), abates: st.abatesTotal || 0,
           griladas: st.fazendas.map((_, f) => st.celulas.filter(c => M.grilada(c) && c.cercaDe === f).length),
           perdidas: st.celulas.filter(c => c.dono === 0 && M.grilada(c)).length,
           derrubou: st.fazendas.map(F => F.derrubadas || 0), sofreu: st.fazendas.map(F => F.cercasDerrubadas || 0),
           revides: st.fazendas.map(F => F.revides || 0), usuc: st.fazendas.map(F => F.usucapioes || 0), usucPerdidas: st.fazendas.map(F => F.perdidasUsucapiao || 0), extraviados: st.fazendas.map(F => F.extraviados || 0),
           selos: st.fazendas.map(F => F.selo ? 1 : 0), S: st.soldadinho?.S ?? null, Vfim: st.hist.at(-1).V, Jfim: st.onca.J,
           Js: st.hist.map(h => h.J), Ns: st.hist.map(h => h.N / h.K) };
}
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const r1 = x => +x.toFixed(1);
const out = {};
for (const b of Object.keys(BIOMAS).filter(b => !process.env.BIOMAS || process.env.BIOMAS.split(',').includes(b))) {
  out[b] = {};
  for (const e of Object.keys(ESTR).filter(e => !process.env.ESTR || process.env.ESTR.split(',').includes(e))) {
    const rs = []; for (let i = 0; i < N; i++) rs.push(partida(b, e, SEM + i * 7919));
    // desempenho de cada perfil de vizinho e vitória da pessoa quando ele está na partida
    const perfis = {};
    for (const k of Object.keys(VIZINHOS)) {
      const jogos = rs.filter(r => r.chaves.includes(k)); if (!jogos.length) continue;
      const f = r => r.chaves.indexOf(k);
      perfis[k] = { jogos: jogos.length, patrimonio: Math.round(media(jogos.map(r => r.pats[f(r)]))), posicao: r1(media(jogos.map(r => r.posicoes[f(r)]))),
                    vence: Math.round(100 * jogos.filter(r => r.posicoes[f(r)] === 1).length / jogos.length),
                    voceVence: Math.round(100 * jogos.filter(r => r.pos === 1).length / jogos.length),
                    vizinhoDeFrente: Math.round(100 * jogos.filter(r => r.chaves[2] === k).length / jogos.length),
                    multas: Math.round(media(jogos.map(r => r.multas[f(r)]))), derrubou: r1(media(jogos.map(r => r.derrubou[f(r)]))),
                    revides: r1(media(jogos.map(r => r.revides[f(r)]))), usucapioes: r1(media(jogos.map(r => r.usuc[f(r)]))), griladas: r1(media(jogos.map(r => r.griladas[f(r)]))) };
    }
    out[b][e] = {
      vitoria: r1(100 * rs.filter(r => r.pos === 1).length / N),
      posicao: r1(media(rs.map(r => r.pos))),
      patrimonio: Math.round(media(rs.map(r => r.pat))),
      iaMedia: Math.round(media(rs.flatMap(r => r.pats.slice(1)))),
      iaMelhor: Math.round(media(rs.map(r => Math.max(...r.pats.slice(1))))),
      ataquesVoce: r1(media(rs.map(r => r.ataques[0]))),
      abates: r1(media(rs.map(r => r.abates))),
      oncasFim: r1(media(rs.map(r => r.Jfim))),
      extincao: r1(100 * rs.filter(r => r.Jfim < 0.5).length / N),
      multasVoce: Math.round(media(rs.map(r => r.multas[0]))),
      perdidasVoce: r1(media(rs.map(r => r.perdidas))),
      derrubouVoce: r1(media(rs.map(r => r.derrubou[0]))), sofreuVoce: r1(media(rs.map(r => r.sofreu[0]))),
      usucapiaoVoce: r1(media(rs.map(r => r.usuc[0]))), usucapiaoContraVoce: r1(media(rs.map(r => r.usucPerdidas[0]))), usucapiaoIA: r1(media(rs.map(r => r.usuc.slice(1).reduce((a, b) => a + b, 0)))),
      extraviadosVoce: r1(media(rs.map(r => r.extraviados[0]))), seloFimVoce: Math.round(100 * media(rs.map(r => r.selos[0]))),
      soldadinho: rs[0].S == null ? null : r1(media(rs.map(r => r.S)) * 100) / 100, javaporcoFim: rs[0].Vfim == null ? null : +media(rs.map(r => r.Vfim)).toFixed(2),
      Jmedio: Array.from({ length: 21 }, (_, t) => r1(media(rs.map(r => r.Js[t])))).filter((_, t) => t % 2 === 0),
      Nmedio: Array.from({ length: 21 }, (_, t) => +media(rs.map(r => r.Ns[t])).toFixed(2)).filter((_, t) => t % 2 === 0),
      perfis,
    };
  }
}
console.log(JSON.stringify(out, null, 1));
