import { readFileSync } from 'fs';
const r = JSON.parse(readFileSync(process.argv[2]));
for (const b in r) for (const e in r[b]) { const x = r[b][e];
  console.log(b.padEnd(9), e.padEnd(16), 'vit', String(x.vitoria).padStart(5), 'pat', String(x.patrimonio).padStart(5), 'IA', x.ia.join('/'), 'atq', x.ataquesVoce, 'IAatq', x.ataquesIA.join('/'), 'abat', x.abates, '| J', x.Jmedio.join(' '), '| N', x.Nmedio.join(' ')); }
