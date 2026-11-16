// Resumo legível de sim/resultados.json. Uso: node sim/resumo.mjs sim/resultados.json [perfis]
import { readFileSync } from 'fs';
const r = JSON.parse(readFileSync(process.argv[2]));
for (const b in r) {
  console.log(`\n${b}`);
  for (const e in r[b]) { const x = r[b][e];
    console.log('  ' + e.padEnd(20), 'vit', String(x.vitoria).padStart(5) + '%', 'pos', x.posicao, 'pat', String(x.patrimonio).padStart(4), '| IA média', x.iaMedia, 'melhor', x.iaMelhor, '| atq', x.ataquesVoce, 'J fim', x.oncasFim, 'extinção', x.extincao + '%'); }
  if (process.argv[3]) for (const [k, p] of Object.entries(r[b].conviver?.perfis || {}))
    console.log('    ' + k.padEnd(8), 'pat', String(p.patrimonio).padStart(4), 'pos', p.posicao, 'vence', p.vence + '%', '| você vence', p.voceVence + '%', '| multas', p.multas, 'derrubou', p.derrubou, 'revides', p.revides);
}
