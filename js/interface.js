// Interface do jogo no navegador: mapa SVG, painel, relatórios e gráficos.
import * as M from './motor.js';
import { BIOMAS, ESPECIES, GALINHA, CUSTOS, COR_FAZENDA, RODADAS, TIPOS, W, H, MAX_CAMERAS, SELO_BONUS, CRA_POR_CELULA, CERCAS, MULTA, VENDA_FORCADA } from './dados.js';
import { NATUREZA, dicaDaEstacao, COMO_JOGAR } from './textos.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reais = v => `R$ ${(Math.round(v * 10) / 10).toLocaleString('pt-BR')} mil`;
const CHAVE = 'jaguarete-partida-v1';
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const maiusc = s => s[0].toUpperCase() + s.slice(1);
const P = () => M.bioma(st).predador;
const art = (p = P(), pl = false) => p.f ? (pl ? 'as' : 'a') : (pl ? 'os' : 'o');
const um = (p = P()) => p.f ? 'uma' : 'um';
const gen = (m, f, p = P()) => p.f ? f : m;
const meso = () => M.bioma(st).mesopredador?.plural || 'pequenos predadores';
const mesoAtaca = () => M.bioma(st).mesopredador ? 'raposas' : 'gambás e cachorros-do-mato';
function tetoBonito(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= v); }

let st = null, sel = null, aba = 'area', mensagem = null, armado = null, moverDe = null, biomaEscolhido = 'pantanal';

// ---------------------------------------------------------------- persistência (só conveniência local)
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) {} }
function carregar() { try { const s = localStorage.getItem(CHAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function apagar() { try { localStorage.removeItem(CHAVE); } catch (e) {} }

// ---------------------------------------------------------------- geometria do mapa
const S = 30, RQ = Math.sqrt(3), PAD = 6;
const cx = id => PAD + RQ * S * (M.coluna(id) + 0.5 * (M.linha(id) & 1)) + RQ * S / 2;
const cy = id => PAD + S + 1.5 * S * M.linha(id);
const LARG = PAD * 2 + RQ * S * (W + 0.5), ALT = PAD * 2 + S * 2 + 1.5 * S * (H - 1);
function cantos(id, r = S) {
  const x = cx(id), y = cy(id);
  return Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return [x + r * Math.cos(a), y + r * Math.sin(a)]; });
}
const pts = cs => cs.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
// vizinho em cada aresta: 0 L, 1 SE, 2 SO, 3 O, 4 NO, 5 NE
function vizinhoAresta(id, k) {
  const r = M.linha(id), c = M.coluna(id), par = r % 2 === 0;
  const d = [[0, 1], par ? [1, 0] : [1, 1], par ? [1, -1] : [1, 0], [0, -1], par ? [-1, -1] : [-1, 0], par ? [-1, 0] : [-1, 1]][k];
  const rr = r + d[0], cc = c + d[1];
  return rr < 0 || rr >= H || cc < 0 || cc >= W ? null : rr * W + cc;
}

// ---------------------------------------------------------------- tela inicial
function bannerBioma(id) {
  const paletas = {
    pantanal: ['--campo', '--agua', '--campo', '--mata', '--campo-alagado', '--agua', '--mata', '--campo'],
    amazonia: ['--mata', '--mata', '--mata-2', '--agua', '--mata', '--mata-2', '--mata', '--mata'],
    cerrado: ['--campo', '--mata-2', '--campo', '--pasto', '--mata', '--campo', '--capoeira', '--campo'],
    caatinga: ['--capoeira', '--pasto', '--capoeira', '--pasto-2', '--capoeira', '--mata-2', '--pasto', '--capoeira'],
    araripe: ['--mata', '--campo', '--mata-2', '--mata', '--agua', '--pasto', '--capoeira', '--pasto'],
  }[id];
  let s = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
    const x = 14 + c * 26 + (r % 2) * 13, y = 14 + r * 22, cor = paletas[(r * 3 + c * 5) % paletas.length];
    const p = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return `${(x + 15 * Math.cos(a)).toFixed(1)},${(y + 15 * Math.sin(a)).toFixed(1)}`; }).join(' ');
    s += `<polygon points="${p}" fill="var(${cor})" stroke="var(--superficie)" stroke-width="1.5"/>`;
  }
  const parda = BIOMAS[id].predador.f;
  return `<svg viewBox="0 0 240 86" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}<circle cx="198" cy="58" r="13" fill="var(${parda ? '--parda' : '--onca'})"/><use href="#${parda ? 'i-puma' : 'i-rosetas'}" x="187" y="47" width="22" height="22" style="color:#2a1a00"/></svg>`;
}
const nomePredador = b => `${maiusc(b.predador.nome)} (${b.predador.popular})`;

function telaInicio() {
  $('#app').hidden = true; $('#inicio').hidden = false;
  const salvo = carregar();
  const temSalvo = salvo && !salvo.fim && salvo.versao === 1;
  $('#inicio').innerHTML = `
  <div class="inicio">
    <div class="inicio-cabeca">
      <div>
        <div class="marca">Jagua<span>retê</span></div>
        <div class="subtitulo">no reino do jaguar</div>
        <p>Você cria bois, carneiros e galinhas numa fazenda cercada de mata. Na mata vivem os jaguares, que ninguém vê. Eles caçam capivaras e queixadas e, quando a caça falta, vêm ao seu pasto. Abra pasto, cerque a sua terra antes que um vizinho a cerque, proteja o rebanho, conte os jaguares ou chame o matador: em dez anos, vence quem juntar mais patrimônio.</p>
      </div>
      <div class="nota">presas sobem, jaguares sobem,<br>presas caem, jaguares caem…<br>e o seu rebanho no meio.</div>
    </div>
    <div>
      <div class="rotulo" style="margin-bottom:8px">Escolha o bioma</div>
      <div class="biomas">
        ${Object.values(BIOMAS).map(b => `
        <button class="bioma" data-bioma="${b.id}" aria-pressed="${b.id === biomaEscolhido}">
          ${bannerBioma(b.id)}
          <div class="bioma-corpo">
            <h3>${b.nome}</h3>
            <span class="status">${nomePredador(b)}: <b>${b.status}</b></span>
            <p>${esc(b.resumo)}</p>
            <span class="rotulo">Reserva legal ${Math.round(b.reservaLegal * 100)}%</span>
          </div>
        </button>`).join('')}
      </div>
    </div>
    <div class="inicio-acoes">
      <button class="btn btn-forte" id="comecar">Começar no ${esc(BIOMAS[biomaEscolhido].nome)}</button>
      ${temSalvo ? `<button class="btn" id="continuar">Continuar partida (${esc(BIOMAS[salvo.bioma].nome)}, ano ${M.ano(salvo)})</button>` : ''}
    </div>
    <div class="regras">
      ${COMO_JOGAR.map(([t, p]) => `<div><h3>${t}</h3><p>${esc(p)}</p></div>`).join('')}
    </div>
    <p class="licenca">Código sob licença <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">MIT</a>. Textos e ilustrações sob licença <a href="https://creativecommons.org/licenses/by/4.0/deed.pt-br" target="_blank" rel="noopener">CC BY 4.0</a>. Concepção de Apiano Ferreira Morais.</p>
  </div>`;
  document.querySelectorAll('.bioma').forEach(b => b.onclick = () => { biomaEscolhido = b.dataset.bioma; telaInicio(); });
  $('#comecar').onclick = () => comecar(biomaEscolhido);
  if (temSalvo) $('#continuar').onclick = () => { st = salvo; abrirJogo(); };
}

// onde fica a sede de um vizinho no mapa
function onde(sede) {
  const r = Math.floor(sede / W), c = sede % W;
  return `${r < H / 2 ? 'no alto' : 'embaixo'}, ${c < W / 2 ? 'à esquerda' : 'à direita'}`;
}
function comecar(biomaId) {
  st = M.novoJogo(biomaId);
  const vant = BIOMAS[biomaId].vantagemVizinhos;
  abrirJogo();
  const araripe = biomaId === 'araripe';
  const n = araripe ? NATUREZA.plano : NATUREZA.modelo;
  abrirModal(`
    <div class="rotulo">${esc(BIOMAS[biomaId].nome)} · ano 1</div>
    <h2>Sua fazenda fica no canto de baixo, à esquerda</h2>
    <p>${esc(BIOMAS[biomaId].resumo)}</p>
    ${araripe ? '<p>No alto do mapa fica a chapada, com a FLONA e duas fazendas. Na encosta, as nascentes e o Refúgio do Soldadinho. Embaixo, o vale, onde fica a sua fazenda. Cada área tem uma zona do plano de manejo: <b>Produção</b> (sem marca), <b>Uso Moderado</b> (pontilhada) e <b>Uso Restrito</b> (riscada). Só a Zona de Produção, fora das APPs das nascentes, pode ser desmatada legalmente.</p>' : ''}
    <p>Toque numa área do mapa para ver o que dá para fazer ali. Você tem <b>3 ações</b> por estação; comprar, vender e mover animais não gasta ação. Quando terminar, toque em <b>Encerrar estação</b>: ${art(P(), true)} ${P().plural} andam à noite, e de manhã você vê o que aconteceu.</p>
    <h3>Seus vizinhos nesta partida</h3>
    <ul class="lista vizinhos-inicio">${st.fazendas.slice(1).map((F, k) => `<li><span class="ponto" style="background:${COR_FAZENDA[k + 1]}"></span><b>${esc(F.apelido)}</b>, ${esc(F.tipo)} (${esc(onde(F.sede))}): ${esc(F.descricao)}</li>`).join('')}</ul>
    ${vant ? `<p>Eles chegaram à região antes de você e começam com R$ ${vant} mil a mais em caixa.</p>` : ''}
    ${blocoNatureza({ ...n, id: araripe ? 'plano' : 'modelo' })}
    <div class="modal-acoes"><button class="btn btn-forte" data-fechar>Ver a fazenda</button></div>`);
}

function abrirJogo() {
  $('#inicio').hidden = true; $('#app').hidden = false;
  sel = st.fazendas[0].sede; aba = 'area'; mensagem = null; armado = null; moverDe = null;
  render(); window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- render geral
function render() { renderTopo(); renderMapa(); renderAbas(); renderPainel(); renderRodape(); renderLegenda(); salvar(); }

function renderTopo() {
  const F = st.fazendas[0], B = M.bioma(st);
  const ticks = Array.from({ length: RODADAS }, (_, t) => `<i class="${t < st.t ? 'passou' : t === st.t ? 'agora' : ''} ${t % 2 ? 'seca' : ''}"></i>`).join('');
  const est = M.estacao(st);
  $('#topo').innerHTML = `
    <div class="topo-marca"><strong>Jagua<span>retê</span></strong><span class="chip">${esc(B.nome)}</span>
      <button class="chip" id="sair" style="cursor:pointer">Menu</button></div>
    <div class="indicadores">
      <div class="ind"><span class="rotulo">${st.fim ? 'Fim de jogo' : `Ano ${M.ano(st)} · ${est}`}</span>
        <div class="calendario" title="20 estações: barras altas são chuva, baixas são seca">${ticks}</div></div>
      <div class="ind"><span class="rotulo">Caixa</span><b class="${F.caixa < 0 ? 'perda' : ''}">${reais(F.caixa)}</b></div>
      <div class="ind"><span class="rotulo">Patrimônio</span><b>${reais(M.patrimonio(st, 0))}</b></div>
      <div class="ind"><span class="rotulo">Selo</span><span class="chip ${F.selo ? 'chip-ok' : 'chip-perigo'}">${F.selo ? `ativo · +${SELO_BONUS * 100}%` : 'perdido'}</span></div>
      <div class="ind"><span class="rotulo">Ações</span><div class="acoes-pips" aria-label="${F.acoes} ações restantes">${[0, 1, 2].map(k => `<i class="${k < F.acoes ? 'cheia' : ''}"></i>`).join('')}</div></div>
    </div>`;
  $('#sair').onclick = () => abrirModal(`
    <h2>Menu</h2>
    <p>A partida fica salva neste navegador. Você pode voltar à tela inicial e continuar depois.</p>
    <div class="botoes">
      <button class="btn" data-acao-menu="regras">Como jogar</button>
      <button class="btn" data-acao-menu="ciencia">A ciência do jogo</button>
      <button class="btn" data-acao-menu="inicio">Voltar à tela inicial</button>
      <button class="btn btn-perigo" data-acao-menu="nova">Abandonar e começar outra</button>
    </div>
    <div class="modal-acoes"><button class="btn btn-forte" data-fechar>Voltar ao jogo</button></div>`, caixa => {
      caixa.querySelectorAll('[data-acao-menu]').forEach(b => b.onclick = () => {
        const a = b.dataset.acaoMenu;
        if (a === 'inicio') { fecharModal(); telaInicio(); }
        if (a === 'nova') { apagar(); fecharModal(); telaInicio(); }
        if (a === 'regras') abrirModal(`<h2>Como jogar</h2>${COMO_JOGAR.map(([t, p]) => `<div><h3>${t}</h3><p>${esc(p)}</p></div>`).join('')}<div class="modal-acoes"><button class="btn btn-forte" data-fechar>Voltar</button></div>`);
        if (a === 'ciencia') abrirModal(htmlCiencia(false) + `<div class="modal-acoes"><button class="btn btn-forte" data-fechar>Voltar</button></div>`);
      });
    });
}

function renderLegenda() {
  $('#legenda').innerHTML = `
    <span><i style="background:var(--mata)"></i>Mata</span><span><i style="background:var(--capoeira)"></i>Capoeira</span>
    ${M.bioma(st).campo ? '<span><i style="background:var(--campo)"></i>Campo nativo</span>' : ''}
    <span><i style="background:var(--pasto)"></i>Pasto</span>${M.bioma(st).agua ? '<span><i style="background:var(--agua)"></i>Água</span>' : ''}
    <span><svg><use href="#i-pegada" style="color:var(--onca-tinta)"/></svg>Pegada</span>
    <span><svg><use href="#i-garra" style="color:var(--perigo)"/></svg>Ataque</span>
    <span><svg><circle cx="7" cy="7" r="6.5" fill="var(${P().f ? '--parda' : '--onca'})"/></svg>${maiusc(P().nome)} ${gen('visto', 'vista')}</span>
    ${M.bioma(st).mapa === 'araripe' ? `<span><svg><use href="#i-chuva" style="color:var(--agua)"/></svg>Nascente</span>
    <span><svg><rect width="14" height="14" fill="var(--mata)"/><circle cx="4" cy="4" r="1.4" fill="var(--superficie)"/><circle cx="10" cy="10" r="1.4" fill="var(--superficie)"/><circle cx="10" cy="4" r="1.4" fill="var(--superficie)"/><circle cx="4" cy="10" r="1.4" fill="var(--superficie)"/></svg>Uso Moderado</span>
    <span><svg><rect width="14" height="14" fill="var(--mata)"/><path d="M0 14 14 0M-4 8 8 -4M6 18 18 6" stroke="var(--superficie)" stroke-width="1.6"/></svg>Uso Restrito</span>
` : ''}
    ${M.bioma(st).javaporco ? `<span><svg><use href="#i-fucado" style="color:var(--javaporco)"/></svg>Sinal de ${M.bioma(st).javaporco.nome}</span>` : ''}
    ${M.bioma(st).mesopredador ? `<span><svg><use href="#i-raposa" style="color:var(--raposa)"/></svg>Raposa no galinheiro</span>` : ''}
    <span><svg><line x1="0" y1="7" x2="14" y2="7" stroke="var(--voce)" stroke-width="3.5"/></svg>Sua cerca</span>
    <span><svg><line x1="0" y1="7" x2="14" y2="7" stroke="var(--voce)" stroke-width="1.6" stroke-dasharray="1.5 2.5"/></svg>Divisa do título</span>
    <span><svg><rect width="14" height="14" fill="var(--pasto)"/><path d="M0 14 14 0M-4 8 8 -4M6 18 18 6" stroke="var(--perigo)" stroke-width="2"/></svg>Área grilada</span>
    <span><svg><rect x="1" y="3" width="12" height="8" rx="4" fill="var(--superficie)" stroke="var(--voce)" stroke-width="1.4" stroke-dasharray="2 1.5"/></svg>Animais soltos</span>
    <span><i style="background:none;border:2px dotted var(--onca-tinta)"></i>${M.bioma(st).mapa === 'araripe' ? 'Unidade de conservação' : 'Reserva'}</span>`;
}

// ---------------------------------------------------------------- mapa
function renderMapa() {
  const svg = $('#mapa');
  svg.setAttribute('viewBox', `0 0 ${LARG.toFixed(0)} ${ALT.toFixed(0)}`);
  const B = M.bioma(st), est = M.estacao(st);
  const visiveis = M.oncasVisiveis(st);
  const pegadas = new Set(st.vistos.pegadas), fucados = new Set(st.vistos.fucados || []);
  const parda = B.predador.f;
  let celulas = '', contornos = '', cercas = '', marcadores = '';
  for (const c of st.celulas) {
    const x = cx(c.id), y = cy(c.id);
    const alagado = c.tipo === 'campo' && B.evento === 'cheia' && est === 'chuva';
    const classes = ['cel', c.queimado ? 'queimado' : '', sel === c.id ? 'sel' : '', moverDe != null && c.cercaDe === 0 && M.pastejavel(c) && c.id !== moverDe ? 'alvo' : ''].join(' ');
    let g = `<g class="${classes}" data-id="${c.id}" tabindex="-1"><polygon class="base t-${c.tipo}${alagado ? ' alagado' : ''}" points="${pts(cantos(c.id))}"/>`;
    g += glifos(c, x, y);
    if (c.zona === 'moderado' || c.zona === 'restrito') g += `<polygon points="${pts(cantos(c.id, S - 1))}" fill="url(#z-${c.zona})" pointer-events="none"/>`;
    if (c.nascente) g += `<use href="#i-chuva" x="${x - 7}" y="${y - 20}" width="14" height="14" style="color:var(--superficie)"/>`;
    if (c.tipo === 'sede') g += `<use href="#i-sede" x="${x - 10}" y="${y - 12}" width="20" height="20" style="color:var(--tinta)"/>`;
    // crachá de animais
    const qtd = c.tipo === 'sede' ? st.fazendas[c.dono].galinhas : c.n;
    const icone = c.tipo === 'sede' ? 'i-galinha' : c.especie ? `i-${c.especie}` : null;
    if (icone && (qtd || c.tipo === 'sede') && (M.posse(c) === 0 || c.n || c.tipo === 'sede')) {
      const yy = c.tipo === 'sede' ? y + 7 : y - 1;
      g += `<g class="cracha"><rect x="${x - 17}" y="${yy}" width="34" height="15" rx="7.5"/><use href="#${icone}" x="${x - 15}" y="${yy + 1.5}" width="12" height="12"/><text x="${x + 4}" y="${yy + 11.5}" text-anchor="middle">${qtd}</text></g>`;
    }
    // animais soltos (fora de cerca), com a cor da fazenda dona
    M.soltosEm(st, c.id).slice(0, 2).forEach((gr, k) => {
      const yy = y + 8 - k * 17, xx = x - 4 + k * 4;
      g += `<g class="cracha solto f${gr.f}"><title>${gr.n} ${gr.n > 1 ? ESPECIES[gr.especie].plural : ESPECIES[gr.especie].nome} soltos de ${gr.f === 0 ? 'você' : esc(st.fazendas[gr.f].apelido)}</title><rect x="${xx - 13}" y="${yy}" width="28" height="13" rx="6.5"/><use href="#i-${gr.especie}" x="${xx - 11}" y="${yy + 1.5}" width="10" height="10"/><text x="${xx + 6}" y="${yy + 10}" text-anchor="middle">${gr.n}</text></g>`;
    });
    // defesas
    const def = [c.eletrica && 'i-raio', c.guarda && 'i-guarda', c.curral && 'i-curral'].filter(Boolean);
    if (M.grilada(c)) g += `<polygon points="${pts(cantos(c.id, S - 1))}" fill="url(#z-grilagem)" pointer-events="none"/>`;
    def.forEach((d, k) => { g += `<use href="#${d}" x="${x - def.length * 6 + k * 12}" y="${y - 19}" width="11" height="11" style="color:var(--tinta)"/>`; });
    if (c.camera === 0) g += `<g class="m-camera"><rect x="${x + 7}" y="${y - 19}" width="14" height="12" rx="3"/><use href="#i-camera" x="${x + 8}" y="${y - 18.5}" width="12" height="11" style="color:var(--tinta)"/></g>`;
    g += `<polygon class="selecao" points="${pts(cantos(c.id, S - 2.5))}"/></g>`;
    celulas += g;
    // contornos das fazendas e da reserva
    const cs = cantos(c.id);
    for (let k = 0; k < 6; k++) {
      const v = vizinhoAresta(c.id, k), o = v == null ? null : st.celulas[v];
      const [a, b] = [cs[k], cs[(k + 1) % 6]];
      const seg = `x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"`;
      if (c.dono >= 0 && (!o || o.dono !== c.dono)) contornos += `<line class="divisa f${c.dono}" ${seg}/>`;
      if (c.cercaDe >= 0 && (!o || o.cercaDe !== c.cercaDe)) cercas += `<line class="cerca-linha f${c.cercaDe} m-${c.material}${c.material !== 'concreto' && c.validade <= 2 ? ' vencendo' : ''}" ${seg}/>`;
      if (c.reserva && o && !o.reserva) contornos += `<line class="contorno reserva" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;
    }
    if (pegadas.has(c.id)) marcadores += `<g class="marcador m-pegada"><use href="#i-pegada" x="${x - 18}" y="${y + 2}" width="13" height="13"/></g>`;
    if (fucados.has(c.id)) marcadores += `<use href="#i-fucado" x="${x + 5}" y="${y + 4}" width="13" height="13" style="color:var(--javaporco)"/>`;
  }
  // galinheiro atacado na última noite
  if (st.relatorio && st.relatorio.fazendas[0]?.perdas.galinha && M.bioma(st).mesopredador) {
    const sd = st.fazendas[0].sede; marcadores += `<use href="#i-raposa" x="${cx(sd) + 9}" y="${cy(sd) - 2}" width="15" height="15" style="color:var(--raposa)"/>`;
  }
  // predadores vistos, ataques
  for (const a of st.vistos.ataques) marcadores += `<g class="marcador m-ataque"><use href="#i-garra" x="${cx(a.cel) + 6}" y="${cy(a.cel) - 2}" width="14" height="14"/></g>`;
  const ja = new Set();
  for (const v of visiveis) {
    if (ja.has(v.cel)) continue; ja.add(v.cel);
    const x = cx(v.cel), y = cy(v.cel);
    marcadores += `<g class="marcador m-onca ${parda ? 'parda' : ''} ${v.tipo === 'colar' ? 'colar' : ''}">${v.tipo === 'colar' ? `<circle class="pulso" cx="${x}" cy="${y}" r="13" fill="none" stroke="var(${parda ? '--parda' : '--onca'})" stroke-width="2"/>` : ''}<circle cx="${x}" cy="${y}" r="10"/><use href="#${parda ? 'i-puma' : 'i-rosetas'}" x="${x - 9}" y="${y - 9}" width="18" height="18"/></g>`;
  }
  // nomes das fazendas
  let nomes = '';
  st.fazendas.forEach((F, f) => { nomes += `<text class="nome-fazenda" x="${cx(F.sede)}" y="${cy(F.sede) - 15}" text-anchor="middle" style="fill:var(${f ? `--ia${f}` : '--voce'})">${esc(f ? F.apelido : 'Você')}</text>`; });
  if (B.mapa === 'araripe') {
    nomes += `<text class="rotulo-mapa" x="${cx(W + 5)}" y="${cy(W + 5) + 4}" text-anchor="middle">FLONA Araripe-Apodi</text>`;
    nomes += `<text class="rotulo-mapa" x="${cx(3 * W + 5)}" y="${cy(3 * W + 5) + S * 0.75 + 4}" text-anchor="middle">Revis do Soldadinho</text>`;
  } else {
    const centro = 4 * W + 5;
    nomes += `<text class="rotulo-mapa" x="${cx(centro)}" y="${cy(centro) + S * 1.5 + 9}" text-anchor="middle">Reserva</text>`;
  }
  const defs = `<defs><pattern id="z-moderado" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.3" fill="var(--superficie)" opacity=".75"/></pattern>
    <pattern id="z-restrito" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--superficie)" stroke-width="1.6" opacity=".6"/></pattern>
    <pattern id="z-grilagem" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="9" stroke="var(--perigo)" stroke-width="2.2" opacity=".55"/></pattern></defs>`;
  svg.innerHTML = defs + celulas + contornos + cercas + marcadores + nomes;
}
function glifos(c, x, y) {
  const pseudo = k => ((c.id * 9301 + k * 49297) % 233280) / 233280;
  let s = '';
  if (c.tipo === 'mata') {
    for (let k = 0; k < 3; k++) { const dx = (pseudo(k) - 0.5) * 26, dy = (pseudo(k + 7) - 0.5) * 22; s += `<circle class="glifo-arvore" cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${(5 + pseudo(k + 3) * 3).toFixed(1)}"/>`; }
  } else if (c.tipo === 'capoeira') {
    for (let k = 0; k < 2; k++) { const dx = (pseudo(k) - 0.5) * 24, dy = (pseudo(k + 5) - 0.5) * 18; s += `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="4" fill="var(--mata-2)" opacity=".7"/>`; }
  } else if (c.tipo === 'agua') {
    s += `<path d="M${x - 14} ${y - 4} q4 -4 8 0 t8 0 t8 0 M${x - 12} ${y + 6} q4 -4 8 0 t8 0 t8 0" fill="none" stroke="var(--superficie)" stroke-width="1.6" opacity=".7"/>`;
  } else if (c.tipo === 'pasto' || c.tipo === 'campo') {
    for (let k = 0; k < 4; k++) { const dx = (pseudo(k) - 0.5) * 30, dy = (pseudo(k + 9) - 0.5) * 26; s += `<path d="M${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)} l-2 -5 M${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)} l2 -5" stroke="var(--pasto-2)" stroke-width="1.3" opacity=".8"/>`; }
  }
  return s;
}

// ---------------------------------------------------------------- abas e painel
function renderAbas() {
  const ABAS = [['area', 'Área'], ['fazenda', 'Fazenda'], ['indicios', maiusc(P().plural)], ['vizinhos', 'Vizinhos']];
  $('#abas').innerHTML = ABAS.map(([id, nome]) => `<button role="tab" aria-selected="${aba === id}" data-aba="${id}">${nome}</button>`).join('');
  $('#abas').querySelectorAll('button').forEach(b => b.onclick = () => { aba = b.dataset.aba; armado = null; renderAbas(); renderPainel(); });
}
function excesso() { return M.controladas(st, 0).filter(c => M.pastejavel(c) && c.n).reduce((s, c) => s + Math.max(0, c.n - M.capacidade(st, c, c.especie)), 0); }
function renderRodape() {
  const F = st.fazendas[0];
  $('#rodape').innerHTML = st.fim
    ? `<button class="btn btn-forte" id="ver-fim">Ver o resultado final</button>`
    : `${excesso() ? `<div class="msg erro">${plural(excesso(), 'animal está', 'animais estão')} acima da capacidade dos pastos nesta estação e serão vendidos às pressas.</div>` : ''}<button class="btn btn-forte" id="encerrar">Encerrar estação${F.acoes ? ` · ${F.acoes} ${F.acoes === 1 ? 'ação sobrando' : 'ações sobrando'}` : ''}</button>`;
  if (st.fim) $('#ver-fim').onclick = telaFinal; else $('#encerrar').onclick = encerrar;
}

const estreito = () => window.matchMedia('(max-width: 980px)').matches;
function renderPainel() {
  const el = $('#painel');
  let html = (estreito() ? `<button class="btn btn-mini" data-ver-mapa style="justify-self:start">↑ Voltar ao mapa</button>` : '') + (mensagem ? `<div class="msg ${mensagem.erro ? 'erro' : ''}">${esc(mensagem.texto)}</div>` : '');
  if (moverDe != null) html += `<div class="msg">Toque no pasto de destino dos animais. <button class="btn btn-mini" data-cancelar-mover>Cancelar</button></div>`;
  if (aba === 'area') html += painelArea();
  if (aba === 'fazenda') html += painelFazenda();
  if (aba === 'indicios') html += painelIndicios();
  if (aba === 'vizinhos') html += painelVizinhos();
  el.innerHTML = html;
  ligarPainel(el);
}

const NOME_UC = { flona: 'FLONA Araripe-Apodi · floresta nacional', revis: 'Refúgio de Vida Silvestre do Soldadinho-do-Araripe' };
const NOME_ZONA = { producao: 'Zona de Produção', moderado: 'Zona de Uso Moderado', restrito: 'Zona de Uso Restrito' };
const REGRA_ZONA = { producao: 'agricultura e pecuária, com reserva legal e APP', moderado: 'só roças de subsistência; não se abre pasto novo', restrito: 'não se abre área nova; ficam as atividades já consolidadas' };
const NOME_DONO = c => c.uc ? NOME_UC[c.uc] : c.reserva ? 'Reserva · área protegida' : c.dono === 0 ? 'Sua fazenda' : `${st.fazendas[c.dono].nome} (${st.fazendas[c.dono].apelido})`;
const COR_TIPO = { mata: 'var(--mata)', capoeira: 'var(--capoeira)', campo: 'var(--campo)', pasto: 'var(--pasto)', agua: 'var(--agua)', sede: 'var(--sede)' };

function painelArea() {
  if (sel == null) return '<p class="vazio">Toque numa área do mapa.</p>';
  const c = st.celulas[sel], F = st.fazendas[0], B = M.bioma(st), minha = M.posse(c) === 0;
  let h = `<div class="cab-cel"><span class="amostra" style="background:${COR_TIPO[c.tipo]}"></span><div><h3>${c.nascente ? 'Nascente' : TIPOS[c.tipo].nome}${c.tipo === 'capoeira' && c.regen ? ` <small class="rotulo">vira mata em ${c.regen}</small>` : ''}</h3><div class="rotulo">${esc(NOME_DONO(c))}</div></div></div>`;
  if (c.tipo !== 'agua') {
    const quem = f => f === 0 ? 'você' : st.fazendas[f].apelido;
    h += `<div class="bloco">
      <div class="linha-info"><span>Cerca</span>${c.tipo === 'sede' ? '<span>sede</span>' : c.cercaDe >= 0
        ? `<b>${quem(c.cercaDe)} · ${CERCAS[c.material].nome}${c.material === 'concreto' ? ', permanente' : `, ${plural(c.validade, 'estação', 'estações')}`}</b>`
        : '<span>sem cerca</span>'}</div>
      ${M.grilada(c) ? `<div class="msg erro">Área grilada por ${quem(c.cercaDe)}: o título é ${c.reserva ? 'público' : `da ${st.fazendas[c.dono].nome}`}. A Justiça pode devolvê-la.</div>` : ''}
      ${c.cercaDe < 0 && c.dono === 0 && c.tipo !== 'sede' ? '<p class="vazio" style="margin:0">Terra sua, mas aberta: um vizinho encostado pode cercá-la.</p>' : ''}
    </div>`;
  }
  const soltos = M.soltosEm(st, c.id);
  if (soltos.length) h += `<div class="bloco">${soltos.map(gr => `<div class="linha-info"><span>Animais soltos</span><b class="num">${gr.n} ${gr.n > 1 ? ESPECIES[gr.especie].plural : ESPECIES[gr.especie].nome} · ${gr.f === 0 ? 'seus' : esc(st.fazendas[gr.f].apelido)}</b></div>`).join('')}
      ${soltos.some(gr => gr.f === 0) ? `<p class="vazio" style="margin:0">Soltos, seus animais não rendem, se espalham pelas áreas abertas, se perdem e ficam expostos ${gen('aos', 'às')} ${P().plural}. Recolha na sede (uma ação) ou cerque a área onde estão.</p>` : ''}
    </div>`;
  if (c.zona || c.regiao || (B.mapa === 'araripe' && M.app(st, c))) h += `<div class="bloco">
      ${c.regiao ? `<div class="linha-info"><span>Paisagem</span><span>${{ chapada: 'alto da chapada', encosta: 'encosta úmida', vale: 'vale do Cariri' }[c.regiao]}</span></div>` : ''}
      ${c.zona ? `<div class="linha-info"><span>Plano de manejo</span><b>${NOME_ZONA[c.zona]}</b></div><p class="vazio" style="margin:0">${REGRA_ZONA[c.zona]}</p>` : ''}
      ${B.mapa === 'araripe' && M.app(st, c) ? '<div class="linha-info"><span>APP</span><b style="color:var(--agua)">entorno de nascente: não pode ser desmatado</b></div>' : ''}
    </div>`;
  if (M.pastejavel(c) && (minha || c.n)) {
    const esp = c.especie;
    const capB = M.capacidade(st, c, 'boi'), capC = M.capacidade(st, c, 'carneiro');
    const borda = M.naBorda(st, c);
    h += `<div class="bloco">
      <div class="linha-info"><span>Rebanho</span><b class="num">${esp ? `${c.n} ${c.n === 1 ? ESPECIES[esp].nome : ESPECIES[esp].plural} de ${M.capacidade(st, c, esp)}` : 'vazio'}</b></div>
      <div class="linha-info"><span>Capacidade nesta estação</span><span class="num">${capB} bois ou ${capC} carneiros</span></div>
      ${esp && c.n > M.capacidade(st, c, esp) ? `<div class="msg erro">Acima da capacidade nesta estação: ${plural(c.n - M.capacidade(st, c, esp), ESPECIES[esp].nome, ESPECIES[esp].plural)} serão vendidos às pressas, por 60% do valor, se não forem movidos ou vendidos antes.</div>` : ''}
      <div class="linha-info"><span>Risco de ataque</span><span>${borda ? (M.exposicao(st, c) || !c.n ? `<b style="color:var(--perigo)">na borda da mata</b>` : 'na borda') : '<span style="color:var(--ok)">longe da mata</span>'}</span></div>
      ${c.eletrica || c.guarda || c.curral ? `<div class="chips">${c.eletrica ? '<span class="chip">cerca elétrica</span>' : ''}${c.guarda ? `<span class="chip">${B.id === 'pantanal' ? 'búfalos' : 'cães'} de guarda</span>` : ''}${c.curral ? '<span class="chip">curral noturno</span>' : ''}</div>` : ''}
    </div>`;
    if (minha && !st.fim && c.cercaDe !== 0) h += `<div class="msg">Cerque este pasto para pôr animais.</div>`;
    if (minha && !st.fim && c.cercaDe === 0) {
      h += `<div class="bloco"><span class="rotulo">Mercado · não gasta ação</span><div class="botoes">`;
      const especies = esp ? [esp] : ['boi', 'carneiro'];
      for (const e of especies) {
        const pr = ESPECIES[e];
        h += `<button class="btn btn-mini" data-comprar="${e}" data-n="1" ${F.caixa < pr.compra || c.n >= M.capacidade(st, c, e) ? 'disabled' : ''}>Comprar ${pr.nome} · ${reais(pr.compra)}</button>`;
        h += `<button class="btn btn-mini" data-comprar="${e}" data-n="99" ${F.caixa < pr.compra || c.n >= M.capacidade(st, c, e) ? 'disabled' : ''}>Encher de ${pr.plural}</button>`;
      }
      if (c.n) {
        const v = ESPECIES[esp].venda * (F.selo ? 1 + SELO_BONUS : 1);
        h += `<button class="btn btn-mini" data-vender="1">Vender 1 · ${reais(v)}</button><button class="btn btn-mini" data-vender="99">Vender todos</button><button class="btn btn-mini" data-mover>Mover para outro pasto</button>`;
      }
      h += `</div></div>`;
    }
  }
  if (c.tipo === 'sede' && minha) {
    const v = GALINHA.venda * (F.selo ? 1 + SELO_BONUS : 1);
    h += `<div class="bloco">
      <div class="linha-info"><span>Galinheiro</span><b class="num">${F.galinhas} de ${F.galCap} lotes (10 aves cada)</b></div>
      <div class="linha-info"><span>Proteção</span><span>${F.telado ? 'telado' : `aberto a ${mesoAtaca()}`}</span></div>
      <div class="linha-info"><span>Compensação</span><span>${F.seguro ? 'ativa' : 'não'}</span></div>
      <div class="linha-info"><span>Cotas de reserva</span><span>${F.cra ? `rendem ${reais(Math.max(0, M.folgaReserva(st, 0)) * CRA_POR_CELULA)} por estação` : 'não registradas'}</span></div>
      ${st.fim ? '' : `<div class="botoes"><button class="btn btn-mini" data-comprar="galinha" data-n="1" ${F.caixa < GALINHA.compra || F.galinhas >= F.galCap ? 'disabled' : ''}>Comprar lote · ${reais(GALINHA.compra)}</button>
      <button class="btn btn-mini" data-vender="1" ${F.galinhas ? '' : 'disabled'}>Vender lote · ${reais(v)}</button></div>`}
    </div>`;
  }
  if (M.habitat(c)) {
    const pegada = st.vistos.pegadas.includes(c.id), foto = st.vistos.fotos.filter(x => x.cel === c.id), colar = st.tokens.find(t => t.colar && t.cel === c.id);
    h += `<div class="bloco">
      <div class="linha-info"><span>Para ${art()} ${P().nome}</span><span>${TIPOS[c.tipo].habitat >= 0.8 ? 'habitat ótimo' : TIPOS[c.tipo].habitat >= 0.5 ? 'habitat bom' : 'habitat ruim'}</span></div>
      ${pegada ? '<div class="linha-info"><span>Indício</span><b>pegadas frescas</b></div>' : ''}
      ${foto.length ? `<div class="linha-info"><span>Câmera</span><b>${foto.length} foto${foto.length > 1 ? 's' : ''} de ${P().nome}</b></div>` : ''}
      ${colar ? `<div class="linha-info"><span>Colar GPS</span><b>${P().nome} aqui agora</b></div>` : ''}
      ${(st.vistos.fucados || []).includes(c.id) ? `<div class="linha-info"><span>Indício</span><b>terra fuçada por ${B.javaporco.plural}</b></div>` : ''}
    </div>`;
  }
  if (!st.fim) {
    const acoes = M.acoesCelula(st, 0, c.id);
    if (acoes.length) {
      h += `<div class="bloco"><span class="rotulo">Ações · ${F.acoes} de 3</span>`;
      for (const a of acoes) {
        const perigo = a.acao === 'matador' || !!a.ilegal;
        const arm = armado && armado.acao === a.acao && armado.id === c.id;
        h += `<button class="acao ${perigo ? 'perigo' : ''} ${arm ? 'armado' : ''}" data-acao="${a.acao}" ${a.ok ? '' : 'disabled'}>
          <span>${arm ? 'Toque de novo para confirmar' : esc(a.rotulo)}</span><span class="custo">${a.material === 'nativa' ? `${a.lados} lotes` : a.custo ? reais(a.custo) : 'grátis'}</span>
          <small>${a.ok ? esc(dicaAcao(a.acao, c, a)) : esc(a.motivo)}</small></button>`;
      }
      h += `</div>`;
    } else if (M.posse(c) > 0) h += `<p class="vazio">Área cercada por vizinho: você não pode agir aqui.</p>`;
  }
  return h;
}
function dicaAcao(acao, c, a = {}) {
  const B = M.bioma(st), F = st.fazendas[0];
  const aviso = a.ilegal ? ' Grilagem: você perde o selo e a Justiça pode devolver a área e multar.' : '';
  return {
    cercar_nativa: `Usa ${a.lados} lotes das estacas do seu desmate (você tem ${F.estacas}). Dura ${CERCAS.nativa.validade} estações.${aviso}`,
    cercar_madeira: `${a.lados} lados de eucalipto tratado. Dura ${CERCAS.madeira.validade} estações.${aviso}`,
    cercar_concreto: `${a.lados} lados de mourões de concreto. Permanente e não queima.${aviso}`,
    justica: 'A chance de a Justiça devolver a área sobe para 60% nesta estação e na próxima.',
    derrubar: a.desforco ? 'Desforço imediato: a terra é sua e acabou de ser cercada, então você pode retomá-la. Os animais de quem grilou ficam soltos.'
      : `${a.ilegal === 'crime de dano' ? 'Crime de dano' : 'Passou a hora do desforço imediato: é fazer justiça com as próprias mãos'}. Os animais ficam soltos e se espalham. Você perde o selo por dois anos, e a Justiça pode cobrar R$ ${MULTA.dano} mil de multa e R$ ${MULTA.indenizacao} mil de indenização.`,
    recolher: `Vaqueiros juntam os seus animais soltos nos pastos cercados com vaga. Os que não couberem são vendidos às pressas, por ${Math.round(VENDA_FORCADA * 100)}% do valor.`,
    processar: 'A chance de a Justiça condenar quem derrubou suas cercas sobe para 60% nesta estação e na próxima. Se condenar, você recebe indenização.',
    desmatar: (() => { const il = M.desmateIlegal(st, 0, c.id); return !il ? `Vira pasto para ${M.capacidade(st, { ...c, tipo: 'pasto' }, 'boi')} bois. Menos mata, menos presas silvestres.` : `Ilegal (${il}). Você perde o selo e pode ser multado.`; })(),
    reflorestar: `Vira capoeira e, em ${B.regen} estações, mata.`,
    cerca: 'Eletrifica a cerca deste pasto: o risco de ataque cai 80%. Manutenção de R$ 1 mil por estação.',
    guarda: B.id === 'pantanal' ? 'Búfalos se defendem em grupo e protegem o gado: risco cai pela metade.' : `Cães latem e espantam ${art()} ${P().nome}: risco cai pela metade.`,
    curral: 'Rebanho recolhido à noite perto da sede: risco cai 60%.',
    telar: `Galinheiro fechado: ${mesoAtaca()} levam 70% menos galinhas.`,
    ampliar: 'Mais 4 lotes de galinhas.',
    seguro: `Paga R$ 2 mil por estação e devolve 60% do valor dos animais mortos por ${P().plural}. Acaba se você perder o selo.`,
    cra: 'Cada área nativa acima da reserva legal passa a render R$ 0,5 mil por estação.',
    camera: `Fotografa ${art(P(), true)} ${P().plural} que passarem aqui e mostra a abundância de presas.`,
    colar: `A equipe tenta capturar ${art()} ${P().nome} e ${gen('soltá-lo', 'soltá-la')} com colar: depois disso você sempre sabe onde ${gen('ele', 'ela')} está.`,
    matador: `Crime ambiental. Você perde o selo, pode ser multado, e a falta ${gen('do', 'da')} ${P().nome} desequilibra a cadeia alimentar.`,
    manejo: `Manejadores com autorização no SIMAF retiram metade dos ${B.javaporco?.plural || 'javaporcos'} da região e protegem seus pastos por três estações.`,
    aceiro: 'Faixas sem vegetação em volta da fazenda: o fogo não entra nela por duas estações.',
  }[acao] || '';
}

function painelFazenda() {
  const F = st.fazendas[0], B = M.bioma(st), cab = M.cabecas(st, 0);
  const nat = M.nativaFrac(st, 0), folga = M.folgaReserva(st, 0);
  const pastos = M.controladas(st, 0).filter(M.pastejavel);
  const minhasCercas = st.celulas.filter(c => c.cercaDe === 0 && c.tipo !== 'sede');
  const vencendo = minhasCercas.filter(c => c.material !== 'concreto' && c.validade <= 2).length;
  const abertas = M.celulasDe(st, 0).filter(c => c.cercaDe < 0 && c.tipo !== 'agua' && c.tipo !== 'sede').length;
  const tomadas = M.celulasDe(st, 0).filter(M.grilada).length;
  const griladas = minhasCercas.filter(M.grilada).length;
  const expostos = pastos.filter(c => M.exposicao(st, c) > 0).length;
  return `
  <div class="bloco"><h3>Rebanho</h3>
    <div class="linha-info"><span>Bois</span><b class="num">${cab.boi}</b></div>
    <div class="linha-info"><span>Carneiros</span><b class="num">${cab.carneiro}</b></div>
    <div class="linha-info"><span>Galinhas</span><b class="num">${cab.galinha} lotes</b></div>
    ${M.totalSoltos(st, 0) ? `<div class="linha-info"><span>Animais soltos</span><b class="num" style="color:var(--perigo)">${M.totalSoltos(st, 0)}</b></div>` : ''}
    <div class="linha-info"><span>Pastos expostos a ataques</span><b class="num">${expostos} de ${pastos.length}</b></div>
    <div class="linha-info"><span>Valor do rebanho</span><b class="num">${reais(M.valorRebanho(st, 0))}</b></div>
  </div>
  <div class="bloco"><h3>Terra e cercas</h3>
    <div class="linha-info"><span>Estacas da mata em estoque</span><b class="num">${plural(F.estacas, 'lote', 'lotes')}</b></div>
    <div class="linha-info"><span>Áreas cercadas por você</span><b class="num">${minhasCercas.length}</b></div>
    <div class="linha-info"><span>Cercas que vencem em até 2 estações</span><b class="num" style="color:${vencendo ? 'var(--aviso)' : 'inherit'}">${vencendo}</b></div>
    <div class="linha-info"><span>Áreas suas sem cerca</span><b class="num">${abertas}</b></div>
    <div class="linha-info"><span>Áreas suas griladas por vizinhos</span><b class="num" style="color:${tomadas ? 'var(--perigo)' : 'inherit'}">${tomadas}</b></div>
    ${griladas ? `<div class="linha-info"><span>Áreas que você grilou</span><b class="num" style="color:var(--perigo)">${griladas}</b></div>` : ''}
    ${F.cercasDerrubadas ? `<div class="linha-info"><span>Cercas suas derrubadas por vizinhos</span><b class="num">${F.cercasDerrubadas}</b></div>` : ''}
    ${F.derrubadas ? `<div class="linha-info"><span>Cercas que você derrubou</span><b class="num">${F.derrubadas}</b></div>` : ''}
    ${M.processosAbertos(st, 0).length ? `<div class="msg">Há ${plural(M.processosAbertos(st, 0).length, 'cerca sua derrubada', 'cercas suas derrubadas')} sem processo. Abra o processo na sede.</div>` : ''}
  </div>
  <div class="bloco"><h3>Reserva legal</h3>
    <div class="barra" title="Vegetação nativa na fazenda"><i style="width:${(nat * 100).toFixed(0)}%"></i><b style="left:${B.reservaLegal * 100}%"></b></div>
    <div class="linha-info"><span>Vegetação nativa</span><b class="num">${Math.round(nat * 100)}% (mínimo ${Math.round(B.reservaLegal * 100)}%)</b></div>
    <div class="linha-info"><span>${folga >= 0 ? 'Áreas que ainda pode abrir' : 'Áreas abaixo do mínimo'}</span><b class="num" style="color:${folga >= 0 ? 'var(--ok)' : 'var(--perigo)'}">${Math.abs(folga)}</b></div>
  </div>
  <div class="bloco"><h3>Selo e programas</h3>
    <div class="linha-info"><span>Selo de convivência</span><b>${F.selo ? 'ativo' : `perdido${F.motivoSelo ? ` (${esc(F.motivoSelo)})` : ''}`}</b></div>
    ${F.selo ? '' : `<p class="vazio" style="margin:0">Volta ao fim de ${plural(M.voltaDoSelo(st, 0), 'estação', 'estações')} sem nova infração, se a reserva legal estiver em dia e você não tiver área grilada.</p>`}
    <div class="linha-info"><span>Compensação por ataques</span><span>${F.seguro ? 'ativa' : 'não'}</span></div>
    <div class="linha-info"><span>Cotas de reserva (CRA)</span><span>${F.cra ? 'registradas' : 'não'}</span></div>
    <div class="linha-info"><span>Multas pagas</span><span class="num">${reais(F.multas)}</span></div>
  </div>
  <div class="bloco"><h3>Perdas acumuladas</h3>
    <div class="linha-info"><span>Para ${P().plural}</span><span class="num">${F.perdas.boi} bois, ${F.perdas.carneiro} carneiros</span></div>
    <div class="linha-info"><span>Para ${meso()}</span><span class="num">${F.perdas.galinha} lotes de galinhas</span></div>
  </div>`;
}

function painelIndicios() {
  const v = st.vistos, colares = st.tokens.filter(t => t.colar);
  const cameras = st.celulas.filter(c => c.camera === 0).length;
  const hist = st.caderno || [];
  return `
  <div class="bloco"><h3>Última noite</h3>
    <div class="linha-info"><span>Pegadas na sua terra</span><b class="num">${v.pegadas.length} áreas</b></div>
    <div class="linha-info"><span>Fotos de ${P().nome}</span><b class="num">${v.fotos.length}${v.individuos.length ? ` · ${v.individuos.length} ${v.individuos.length > 1 ? `${P().plural} ${gen('diferentes', 'diferentes')}` : P().nome}` : ''}</b></div>
    <div class="linha-info"><span>Ataques ao seu rebanho</span><b class="num">${v.ataques.length}</b></div>
    <div class="linha-info"><span>Câmeras instaladas</span><span class="num">${cameras} de ${MAX_CAMERAS}</span></div>
    <div class="linha-info"><span>Presas silvestres nas fotos</span><span>${v.presasFoto == null ? 'instale câmeras para saber' : `${'●'.repeat(Math.max(1, Math.round(v.presasFoto / 2)))}${'○'.repeat(5 - Math.max(1, Math.round(v.presasFoto / 2)))} ${v.presasFoto >= 7 ? 'muitas' : v.presasFoto >= 4 ? 'médias' : 'poucas'}`}</span></div>
    <div class="linha-info"><span>${maiusc(P().plural)} com colar GPS</span><b class="num">${colares.length}</b></div>
  </div>
  ${st.onca.V != null ? `<div class="bloco"><h3>${maiusc(M.bioma(st).javaporco.plural)}</h3>
    <div class="linha-info"><span>Sinais na sua terra</span><b class="num">${plural((v.fucados || []).length, 'área', 'áreas')}</b></div>
    <div class="linha-info"><span>Nas câmeras</span><span>${v.javaporcoFoto == null ? 'instale câmeras para saber' : v.javaporcoFoto >= 7 ? 'muitos' : v.javaporcoFoto >= 4 ? 'vários' : 'poucos'}</span></div>
    <div class="linha-info"><span>Seu manejo</span><span>${(st.fazendas[0].manejoAte ?? -1) >= st.t ? 'caçadores ativos' : 'sem caçadores'}</span></div>
  </div>` : ''}
  ${st.soldadinho ? `<div class="bloco"><h3>Soldadinho-do-araripe</h3>
    <div class="linha-info"><span>Cantos nas trilhas das nascentes</span><b class="num">${Math.round(100 * st.soldadinho.S)}% do início</b></div>
    <div class="linha-info"><span>Recarga das nascentes</span><span class="num">${Math.round(100 * M.recarga(st))}% do início</span></div>
  </div>` : ''}
  <div class="bloco"><h3>Caderno de campo</h3>
    ${hist.length ? graficoCaderno(hist) : '<p class="vazio">Os indícios de cada estação aparecem aqui.</p>'}
  </div>
  ${blocoNatureza(st.bioma === 'araripe' ? { ...NATUREZA.onca_parda, id: 'onca_parda' } : { ...NATUREZA.monitoramento, id: 'monitoramento' })}`;
}
function graficoCaderno(hist) {
  const w = 320, h = 110, n = RODADAS, bw = (w - 30) / n;
  const max = Math.max(3, ...hist.map(x => Math.max(x.pegadas, x.fotos, x.ataques)));
  let s = `<line class="eixo" x1="24" y1="${h - 18}" x2="${w}" y2="${h - 18}"/>`;
  for (let k = 0; k <= max; k += Math.ceil(max / 3)) { const y = h - 18 - (h - 30) * k / max; s += `<line class="grade" x1="24" x2="${w}" y1="${y}" y2="${y}"/><text x="18" y="${y + 3}" text-anchor="end">${k}</text>`; }
  hist.forEach((x, i) => {
    const x0 = 26 + i * bw, alt = v => (h - 30) * v / max;
    s += `<rect x="${x0}" y="${h - 18 - alt(x.pegadas)}" width="${bw / 3 - 1}" height="${alt(x.pegadas)}" fill="var(--onca)"/>`;
    s += `<rect x="${x0 + bw / 3}" y="${h - 18 - alt(x.fotos)}" width="${bw / 3 - 1}" height="${alt(x.fotos)}" fill="var(--ia2)"/>`;
    s += `<rect x="${x0 + 2 * bw / 3}" y="${h - 18 - alt(x.ataques)}" width="${bw / 3 - 1}" height="${alt(x.ataques)}" fill="var(--perigo)"/>`;
  });
  s += `<text x="26" y="${h - 4}">ano 1</text><text x="${w}" y="${h - 4}" text-anchor="end">ano 10</text>`;
  return `<div class="grafico"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Pegadas, fotos e ataques por estação">${s}</svg></div>
    <div class="legenda" style="padding:0"><span><i style="background:var(--onca)"></i>Pegadas</span><span><i style="background:var(--ia2)"></i>Fotos</span><span><i style="background:var(--perigo)"></i>Ataques</span></div>`;
}

function painelVizinhos() {
  const rk = M.ranking(st);
  return `
  <div class="bloco"><h3>Patrimônio</h3>
    <table class="tabela"><tbody>
      ${rk.map((r, i) => `<tr><td>${i + 1}º</td><td><span class="ponto" style="background:${COR_FAZENDA[r.f]}"></span>${esc(r.f === 0 ? 'Você' : r.apelido)}</td><td>${r.selo ? '<span class="chip chip-ok">selo</span>' : '<span class="chip">sem selo</span>'}</td><td class="num">${reais(r.patrimonio)}</td></tr>`).join('')}
    </tbody></table>
  </div>
  ${st.fazendas.slice(1).map((F, k) => `<div class="bloco"><h3><span class="ponto" style="background:${COR_FAZENDA[k + 1]}"></span>${esc(F.apelido)} · ${esc(F.nome)}</h3>
    ${F.tipo ? `<div class="rotulo">${esc(F.tipo)} · ${esc(onde(F.sede))}</div>` : ''}
    <p class="vazio" style="margin:0">${esc(F.descricao || '')}</p>
    ${(F.rancor?.[0] ?? 0) > 0 ? `<div class="msg erro">${(F.perfil?.vinganca ?? 0) >= 0.5 ? 'Guarda rancor de você e vai revidar.' : 'Guarda rancor de você.'}</div>` : ''}
    <div class="linha-info"><span>Ataques sofridos</span><span class="num">${F.ataquesTotal}</span></div>
    <div class="linha-info"><span>Vegetação nativa</span><span class="num">${Math.round(M.nativaFrac(st, k + 1) * 100)}%</span></div></div>`).join('')}`;
}

function blocoNatureza(n) {
  return `<div class="natureza"><span class="nota">na natureza · ${esc(n.titulo.toLowerCase())}</span><p>${esc(n.texto)}</p>${n.ref ? `<small>${esc(n.ref)}</small>` : ''}</div>`;
}

// ---------------------------------------------------------------- interação
function ligarPainel(el) {
  el.querySelectorAll('[data-acao]').forEach(b => b.onclick = () => {
    const acao = b.dataset.acao;
    const def = M.acoesCelula(st, 0, sel).find(x => x.acao === acao);
    const perigosa = acao === 'matador' || !!def?.ilegal;
    if (perigosa && !(armado && armado.acao === acao && armado.id === sel)) { armado = { acao, id: sel }; renderPainel(); return; }
    armado = null;
    const r = M.executar(st, 0, acao, sel);
    mensagem = { texto: r.msg, erro: !r.ok };
    render();
  });
  el.querySelectorAll('[data-comprar]').forEach(b => b.onclick = () => {
    const r = M.comprar(st, 0, sel, b.dataset.comprar, +b.dataset.n);
    mensagem = r.ok ? { texto: `Comprou ${r.n} ${b.dataset.comprar === 'galinha' ? (r.n > 1 ? 'lotes' : 'lote') : r.n > 1 ? ESPECIES[b.dataset.comprar].plural : ESPECIES[b.dataset.comprar].nome}.` } : { texto: r.msg, erro: true };
    render();
  });
  el.querySelectorAll('[data-vender]').forEach(b => b.onclick = () => {
    const r = M.vender(st, 0, sel, +b.dataset.vender);
    mensagem = r.ok ? { texto: `Vendeu ${r.n}.` } : { texto: r.msg, erro: true };
    render();
  });
  const vm = el.querySelector('[data-ver-mapa]'); if (vm) vm.onclick = () => $('.mapa-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const mv = el.querySelector('[data-mover]'); if (mv) mv.onclick = () => { moverDe = sel; mensagem = null; render(); };
  const cm = el.querySelector('[data-cancelar-mover]'); if (cm) cm.onclick = () => { moverDe = null; render(); };
}

$('#mapa').addEventListener('click', ev => {
  const g = ev.target.closest('.cel'); if (!g) return;
  const id = +g.dataset.id;
  if (moverDe != null) {
    if (id !== moverDe) {
      const r = M.mover(st, 0, moverDe, id, 99);
      mensagem = r.ok ? { texto: `Moveu ${r.n} animais.` } : { texto: r.msg, erro: true };
      if (r.ok) sel = id;
    }
    moverDe = null; render(); return;
  }
  sel = id; aba = 'area'; armado = null; mensagem = null;
  renderMapa(); renderAbas(); renderPainel();
  if (estreito()) { const p = document.querySelector('.painel'); if (p.getBoundingClientRect().top > window.innerHeight * 0.6) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

function encerrar() {
  const antes = st.fazendas.map(F => F.abates);
  const noite = $('#noite'); noite.classList.add('on');
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    const rel = M.encerrarRodada(st);
    rel.abatesVizinhos = st.fazendas.map((F, f) => F.abates - antes[f]);
    st.caderno = st.caderno || [];
    st.caderno.push({ pegadas: rel.vistos.pegadas.length, fotos: rel.vistos.fotos.length, ataques: rel.vistos.ataques.length });
    mensagem = null; armado = null; moverDe = null;
    render();
    setTimeout(() => { noite.classList.remove('on'); relatorio(rel); }, reduz ? 0 : 450);
  }, reduz ? 0 : 900);
}

// ---------------------------------------------------------------- relatório da estação
function relatorio(rel) {
  const F = st.fazendas[0], r0 = rel.fazendas[0], v = rel.vistos;
  const meus = rel.ataques.filter(a => a.dono === 0);
  const outros = rel.ataques.filter(a => a.dono !== 0);
  const saldo = r0.receita + r0.forcada + r0.compensacao + (r0.indenizacao || 0) - r0.despesa - r0.multa;
  const dica = dicaDaEstacao(st, rel, v);
  const boatos = rel.abatesVizinhos.map((n, f) => n > 0 && f > 0 ? `Correu a notícia de que um matador trabalhou na ${st.fazendas[f].nome}.` : null).filter(Boolean);
  abrirModal(`
    <div class="rotulo">Ano ${rel.ano} · fim da ${rel.estacao}</div>
    <h2>${meus.length ? `${maiusc(art())} ${P().nome} atacou ${meus.length === 1 ? 'uma vez' : `${meus.length} vezes`} na sua fazenda` : v.pegadas.length || v.fotos.length ? `Houve ${P().nome} por perto, mas o rebanho ficou inteiro` : 'Noite tranquila na fazenda'}</h2>
    <div class="rel-grade">
      <div><h3>Na sua fazenda</h3><ul class="lista">
        ${meus.map(a => `<li class="perda">${a.mortos} ${a.mortos > 1 ? ESPECIES[a.especie].plural : ESPECIES[a.especie].nome} ${a.solto ? `solto${a.mortos > 1 ? 's' : ''} morto${a.mortos > 1 ? 's' : ''} ${M.habitat(st.celulas[a.cel]) ? 'na mata' : 'fora da cerca'}` : `morto${a.mortos > 1 ? 's' : ''} num pasto${M.naBorda(st, st.celulas[a.cel]) ? ' na borda da mata' : ''}`}</li>`).join('')}
        ${r0.perdas.galinha ? `<li class="perda">${r0.perdas.galinha} ${r0.perdas.galinha > 1 ? 'lotes' : 'lote'} de galinhas levados por ${meso()}</li>` : ''}
        ${r0.nascimentos.boi + r0.nascimentos.carneiro + r0.nascimentos.galinha ? `<li class="ganho">${r0.nascimentos.boi + r0.nascimentos.carneiro + r0.nascimentos.galinha === 1 ? 'Nasceu' : 'Nasceram'} ${[r0.nascimentos.boi && plural(r0.nascimentos.boi, 'bezerro', 'bezerros'), r0.nascimentos.carneiro && plural(r0.nascimentos.carneiro, 'cordeiro', 'cordeiros'), r0.nascimentos.galinha && plural(r0.nascimentos.galinha, 'lote de pintinhos', 'lotes de pintinhos')].filter(Boolean).join(', ')}</li>` : ''}
        ${r0.forcada ? `<li>Excesso de animais vendido às pressas: ${reais(r0.forcada)}</li>` : ''}
        ${!meus.length && !r0.perdas.galinha && !r0.forcada ? '<li>Sem perdas.</li>' : ''}
      </ul></div>
      <div><h3>Contas da estação</h3><ul class="lista">
        <li>Produção${F.selo ? ' com selo' : ''}: <b class="ganho">${reais(r0.receita)}</b>${r0.cra ? ` (inclui ${reais(r0.cra)} de cotas de reserva)` : ''}</li>
        ${r0.compensacao ? `<li>Compensação por ataques: <b class="ganho">${reais(r0.compensacao)}</b></li>` : ''}
        <li>Manutenção: <b class="perda">${reais(r0.despesa)}</b></li>
        ${r0.indenizacao ? `<li>Indenização recebida: <b class="ganho">${reais(r0.indenizacao)}</b></li>` : ''}
        ${r0.multa ? `<li>Multas e indenizações pagas: <b class="perda">${reais(r0.multa)}</b></li>` : ''}
        <li>Saldo: <b>${reais(saldo)}</b> · caixa ${reais(F.caixa)}</li>
      </ul></div>
      <div><h3>Indícios de ${P().nome}</h3><ul class="lista">
        <li>Pegadas em ${v.pegadas.length} ${v.pegadas.length === 1 ? 'área' : 'áreas'} da sua terra</li>
        <li>${v.fotos.length ? `${v.fotos.length} ${v.fotos.length > 1 ? 'fotos' : 'foto'}, de ${v.individuos.length} ${v.individuos.length > 1 ? `${P().plural} diferentes` : P().nome}` : st.celulas.some(c => c.camera === 0) ? `Nenhuma foto de ${P().nome}` : 'Sem câmeras instaladas'}</li>
        ${v.presasFoto != null ? `<li>Presas silvestres nas fotos: ${v.presasFoto >= 7 ? 'muitas' : v.presasFoto >= 4 ? 'médias' : 'poucas'}</li>` : ''}
        ${M.bioma(st).javaporco ? `<li>Terra fuçada por ${M.bioma(st).javaporco.plural} em ${plural(v.fucados.length, 'área', 'áreas')} da sua terra</li>` : ''}
        ${rel.soldadinho ? `<li>Soldadinho-do-araripe: ${Math.round(100 * rel.soldadinho.depois)}% da população inicial</li>` : ''}
      </ul></div>
      <div><h3>Na região</h3><ul class="lista">
        ${rel.eventos.map(e => `<li>${esc(e)}</li>`).join('')}
        <li>${outros.length ? `Os vizinhos perderam ${plural(outros.reduce((s, a) => s + a.mortos, 0), 'animal', 'animais')} para ${P().plural}.` : 'Os vizinhos não relataram ataques.'}</li>
        ${boatos.map(b => `<li>${esc(b)}</li>`).join('')}
      </ul></div>
    </div>
    ${blocoNatureza(dica)}
    <div class="modal-acoes"><button class="btn btn-forte" data-fechar>${st.fim ? 'Ver o resultado final' : 'Planejar a próxima estação'}</button></div>`,
    null, () => { if (st.fim) telaFinal(); });
}

// ---------------------------------------------------------------- gráficos e fim de jogo
function grafico({ series, ymax, ymin = 0, rotulo, formato = v => v, w = 340, h = 170, xs = null }) {
  const l = 34, r = 22, t = 12, b = 24;
  ymax = tetoBonito(ymax); if (ymin < 0) ymin = -tetoBonito(-ymin);
  const n = series[0].valores.length;
  const X = i => xs ? l + (w - l - r) * (xs[i] - xs.min) / (xs.max - xs.min) : l + (w - l - r) * i / (n - 1);
  const Y = v => t + (h - t - b) * (1 - (v - ymin) / (ymax - ymin));
  let s = `<line class="eixo" x1="${l}" y1="${h - b}" x2="${w - r}" y2="${h - b}"/>`;
  for (let k = 0; k <= 4; k++) { const v = ymin + (ymax - ymin) * k / 4, y = Y(v); s += `<line class="grade" x1="${l}" x2="${w - r}" y1="${y}" y2="${y}"/><text x="${l - 5}" y="${y + 3}" text-anchor="end">${formato(v)}</text>`; }
  for (let a = 0; a <= 10; a += 2) { const x = l + (w - l - r) * (a * 2) / (n - 1); s += `<text x="${x}" y="${h - 8}" text-anchor="${a === 0 ? 'start' : a === 10 ? 'end' : 'middle'}">${a === 0 ? 'início' : `ano ${a}`}</text>`; }
  for (const se of series) {
    const d = se.valores.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    s += `<path class="serie ${se.classe}" d="${d}"/>`;
    const u = se.valores.length - 1; s += `<circle class="ponto-fim" cx="${X(u)}" cy="${Y(se.valores[u])}" r="4" style="fill:var(${se.cor})"/>`;
  }
  return `<div class="grafico"><div class="rotulo">${esc(rotulo)}</div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(rotulo)}">${s}</svg></div>`;
}
function fase(hist, w = 340, h = 190) {
  const l = 38, r = 12, t = 12, b = 30;
  const xs = hist.map(x => x.N / x.K * 100), ys = hist.map(x => x.J);
  const xmax = 100, ymax = Math.max(4, Math.ceil(Math.max(...ys) + 1));
  const X = v => l + (w - l - r) * v / xmax, Y = v => t + (h - t - b) * (1 - v / ymax);
  let s = `<line class="eixo" x1="${l}" y1="${h - b}" x2="${w - r}" y2="${h - b}"/><line class="eixo" x1="${l}" y1="${t}" x2="${l}" y2="${h - b}"/>`;
  for (let k = 0; k <= 4; k++) { s += `<text x="${X(k * 25)}" y="${h - b + 13}" text-anchor="middle">${k * 25}%</text>`; const yv = ymax * k / 4; s += `<text x="${l - 5}" y="${Y(yv) + 3}" text-anchor="end">${yv.toFixed(0)}</text>`; }
  s += `<text x="${(l + w - r) / 2}" y="${h - 3}" text-anchor="middle">presas silvestres (% da capacidade)</text>`;
  s += `<path class="serie s-onca" d="${xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(ys[i]).toFixed(1)}`).join(' ')}"/>`;
  s += `<circle cx="${X(xs[0])}" cy="${Y(ys[0])}" r="4" style="fill:var(--superficie);stroke:var(--onca);stroke-width:2"/><circle class="ponto-fim" cx="${X(xs.at(-1))}" cy="${Y(ys.at(-1))}" r="4.5" style="fill:var(--onca)"/>`;
  return `<div class="grafico"><div class="rotulo">Plano de fase: ${P().plural} × presas</div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Plano de fase de ${P().plural} contra presas">${s}</svg></div>`;
}

function htmlCiencia(comDados) {
  const hist = st.hist, K0 = st.onca.K0;
  return `
    <h2>A ciência do jogo</h2>
    <p>${maiusc(art(P(), true))} ${P().plural} e as presas silvestres seguem o modelo de Rosenzweig e MacArthur, uma versão do modelo de Lotka e Volterra em que as presas têm um limite de crescimento e cada predador tem um limite de quanto consegue comer. O rebanho na borda da mata entra como segunda presa, menos preferida.</p>
    <div class="equacao">dN/dt = r·N·(1 − N/K) − J·f(N)          presas silvestres
dJ/dt = J·[e·f(N) + e·g(L) − m] − q·J²   ${P().plural}
f(N) = a·N / (1 + a·h·N + a'·h·L)        resposta funcional de Holling tipo II
g(L) = a'·L / (1 + a·h·N + a'·h·L)        ataques ao rebanho exposto (L)
dP/dt = s·P·(1 − P) − c·J·P               ${meso()} (P), contidos pel${art()} ${P().nome}${st.onca.V != null ? `
dV/dt = r'·V·(1 − V/K') − J·f'(V)          ${M.bioma(st).javaporco?.plural} (V), invasores, terceira presa d${art()} ${P().nome}
f'(V) = a"·V / (1 + a·h·N + a'·h·L + a"·h·V)` : ''}</div>
    <p>K cai a cada área desmatada. Cercas, curral e animais de guarda reduzem L. O termo q·J² representa o território: cada ${P().nome} precisa de espaço, então a população não cresce sem limite.</p>
    ${comDados ? `<div class="graficos">
      ${grafico({ series: [{ valores: hist.map(x => x.J), classe: 's-onca', cor: '--onca' }], ymax: Math.max(4, Math.ceil(Math.max(...hist.map(x => x.J)) + 1)), rotulo: `${maiusc(P().plural)} na região`, formato: v => v.toFixed(0) })}
      ${grafico({ series: [{ valores: hist.map(x => 100 * x.N / K0), classe: 's-presa', cor: '--mata-2' }], ymax: 100, rotulo: 'Presas silvestres (% da capacidade inicial)', formato: v => `${v.toFixed(0)}%` })}
      ${fase(hist)}
      ${grafico({ series: [{ valores: hist.map(x => 100 * x.M), classe: 's-meso', cor: '--ia2' }], ymax: 100, rotulo: `${maiusc(meso())} (% do máximo)`, formato: v => `${v.toFixed(0)}%` })}
      ${hist[0].V != null ? grafico({ series: [{ valores: hist.map(x => 100 * x.V), classe: 's-javaporco', cor: '--javaporco' }], ymax: 100, rotulo: `${maiusc(M.bioma(st).javaporco.plural)} (% da capacidade)`, formato: v => `${v.toFixed(0)}%` }) : ''}
      ${hist[0].S != null ? grafico({ series: [{ valores: hist.map(x => 100 * x.S), classe: 's-presa', cor: '--mata-2' }, { valores: hist.map(x => 100 * x.R), classe: 's-agua', cor: '--agua' }], ymax: 100, rotulo: 'Soldadinho (verde) e recarga das nascentes (azul), % do início', formato: v => `${v.toFixed(0)}%` }) : ''}
    </div>` : ''}
    <p><small>Lotka (1925); Volterra (1926); Holling (1959); Rosenzweig e MacArthur (1963); Crooks e Soulé (1999). Referências completas no README do jogo.</small></p>`;
}

function telaFinal() {
  const rk = M.ranking(st), pos = rk.findIndex(r => r.f === 0) + 1;
  const hist = st.hist, J0 = hist[0].J, Jf = st.onca.J;
  const extinta = Jf < 0.5;
  const titulo = pos === 1 ? 'Você terminou com o maior patrimônio da região' : `Você terminou em ${pos}º lugar`;
  abrirModal(`
    <div class="rotulo">${esc(M.bioma(st).nome)} · dez anos depois</div>
    <h2>${titulo}</h2>
    <table class="tabela"><tbody>
      ${rk.map((r, i) => `<tr><td>${i + 1}º</td><td><span class="ponto" style="background:${COR_FAZENDA[r.f]}"></span>${esc(r.f === 0 ? 'Você' : `${r.apelido} · ${st.fazendas[r.f].nome}`)}</td><td>${r.selo ? '<span class="chip chip-ok">selo</span>' : '<span class="chip">sem selo</span>'}</td><td class="num">${r.abates ? `${r.abates} ${r.abates > 1 ? `${P().plural} ${gen('abatidos', 'abatidas')}` : `${P().nome} ${gen('abatido', 'abatida')}`}` : ''}</td><td class="num"><b>${reais(r.patrimonio)}</b></td></tr>`).join('')}
    </tbody></table>
    <p>${extinta ? `${maiusc(art(P(), true))} ${P().plural} desapareceram da região.` : `A região começou com ${J0.toFixed(0)} ${P().plural} e terminou com cerca de ${Jf.toFixed(0)}.`}${st.soldadinho ? ` O soldadinho-do-araripe terminou com ${Math.round(100 * st.soldadinho.S)}% da população inicial.` : ''}${hist.at(-1).V != null ? ` Os ${M.bioma(st).javaporco.plural} ocupavam ${Math.round(100 * hist.at(-1).V)}% da capacidade da região.` : ''} A vegetação nativa passou de ${Math.round(hist[0].nativa * 100)}% para ${Math.round(hist.at(-1).nativa * 100)}% da paisagem. ${!st.abatesTotal ? `${gen('Nenhum', 'Nenhuma')} ${P().nome} foi ${gen('abatido', 'abatida')} por matadores.` : `Ao todo, ${st.abatesTotal === 1 ? `${um()} ${P().nome} foi ${gen('abatido', 'abatida')}` : `${st.abatesTotal} ${P().plural} foram ${gen('abatidos', 'abatidas')}`} por matadores.`}</p>
    <div class="graficos">
      ${grafico({ series: st.fazendas.map((_, f) => ({ valores: hist.map(x => x.patrimonio[f]), classe: `s-f${f}`, cor: f ? `--ia${f}` : '--voce' })), ymin: Math.min(0, ...hist.flatMap(x => x.patrimonio)), ymax: Math.max(...hist.flatMap(x => x.patrimonio)) * 1.08, rotulo: 'Patrimônio das fazendas (R$ mil)', formato: v => v.toFixed(0) })}
      ${grafico({ series: [{ valores: hist.map(x => 100 * x.nativa), classe: 's-presa', cor: '--mata-2' }], ymax: 100, rotulo: 'Vegetação nativa na paisagem', formato: v => `${v.toFixed(0)}%` })}
    </div>
    ${htmlCiencia(true)}
    <div class="modal-acoes"><button class="btn" data-final="outro">Escolher outro bioma</button><button class="btn btn-forte" data-final="denovo">Jogar de novo no ${esc(M.bioma(st).nome)}</button></div>`,
    caixa => {
      caixa.querySelector('[data-final="outro"]').onclick = () => { apagar(); fecharModal(); telaInicio(); };
      caixa.querySelector('[data-final="denovo"]').onclick = () => { const b = st.bioma; apagar(); fecharModal(); comecar(b); };
    });
}

// ---------------------------------------------------------------- modal
let aoFechar = null;
function abrirModal(html, ligar = null, depois = null) {
  const m = $('#modal'), caixa = $('#modal-caixa');
  caixa.innerHTML = html; m.hidden = false; aoFechar = depois;
  caixa.querySelectorAll('[data-fechar]').forEach(b => b.onclick = fecharModal);
  if (ligar) ligar(caixa);
  caixa.scrollTop = 0;
  const foco = caixa.querySelector('.modal-acoes .btn-forte') || caixa.querySelector('button'); if (foco) foco.focus({ preventScroll: true });
}
function fecharModal() { $('#modal').hidden = true; const f = aoFechar; aoFechar = null; if (f) f(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) fecharModal(); });

// ---------------------------------------------------------------- início (com retomada após atualização da página publicada)
function boot(dados) {
  if (dados && dados.st) { st = dados.st; abrirJogo(); } else telaInicio();
}
window.claude?.hot?.snapshot?.(() => ({ st: st && !$('#app').hidden ? st : null }));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
