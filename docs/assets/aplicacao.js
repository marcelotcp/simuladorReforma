/* MARCELO CLEITON, criador do projeto. © 2026 Marcelo Cleiton.
 * Interface React/htm. Motor fiscal/gerencial independente em motor.js.
 */
const {useState,useEffect,useMemo,useId}=React;
const html=htm.bind(React.createElement),M=Motor;
const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pc=n=>n==null?'Não aplicável':Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const fmt=(n,d=6)=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const clone=x=>JSON.parse(JSON.stringify(x));
const CHAVE='mc-sn-reforma-b2b-v4';
function hoje(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function vencimento(data,prazo){const [y,m,d]=(data||hoje()).split('-').map(Number),v=new Date(y,m-1,d);v.setDate(v.getDate()+prazo);return v.toLocaleDateString('pt-BR')}
function codificar(o){const bytes=new TextEncoder().encode(JSON.stringify(o));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function decodificar(s){if(s.length>2000000)throw Error('Código muito grande. Limite: 2 MB.');const bytes=Uint8Array.from(atob(s.trim()),c=>c.charCodeAt(0));return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
function baixar(nome,conteudo,tipo='application/json'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([conteudo],{type:tipo}));a.href=u;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
function tentativa(f){try{return {valor:f(),erro:null}}catch(e){return {valor:null,erro:e.message}}}
function carregar(){
 const inicial=estadoInicial();inicial.pedido.data=hoje();
 try{const o=JSON.parse(localStorage.getItem(CHAVE));if(o){const cadastrosMigrados=migrarCadastrosLocais(o);validarCatalogosPacote(o);M.validarImportacao(o);if(o.tipo==='comercial')throw Error('Backup sem custos: reabra um backup interno.');if(!o.parametros[o.ano]||!o.pedido||!Array.isArray(o.pedido.itens))throw Error('Estado incompleto');return {s:migrarGrade({...inicial,...o}),aviso:cadastrosMigrados?'UF ou NCM antigos inválidos foram marcados como pendentes. Custos, preços e pedido foram preservados.':''}}}catch(e){return {s:migrarGrade(inicial),aviso:'Os dados locais não puderam ser recuperados. Os exemplos foram abertos; o registro anterior não será sobrescrito até você fazer uma alteração.'}}
 return {s:migrarGrade(inicial),aviso:''};
}
function Ajuda({termo}){
 const [aberta,set]=useState(false),id=useId(),g=GLOSSARIO[termo];if(!g)return null;
 return html`<span class="help">
<${Botao} type="button" aria-label=${'Explicar '+g[0]} aria-expanded=${aberta} aria-controls=${id} onClick=${()=>set(!aberta)} onKeyDown=${e=>{if(e.key==='Escape')set(false)}}>?<//>
${aberta&&html`<span id=${id} class="helpbox" role="note">
<strong>${g[0]}</strong>${g[1]}<code>${g[2]}</code>
<${Botao} class="btn small" onClick=${()=>set(false)}>Fechar ajuda<//>

</span>`}</span>`;
}
function Numero({id,valor,alterar,rotulo,classe='',inteiro=false,titulo=''}){
 const [texto,setTexto]=useState(String(valor??'').replace('.',','));
 useEffect(()=>setTexto(String(valor??'').replace('.',',')),[valor]);
 return html`<input id=${id} aria-label=${rotulo} title=${titulo} class=${classe} type="text" inputmode=${inteiro?'numeric':'decimal'} value=${texto} onInput=${e=>{const t=e.target.value;setTexto(t);if(t.trim()===''){alterar(0);return}if(/^-?\d*(?:[.,]\d*)?$/.test(t)){const n=Number(t.replace(',','.'));if(Number.isFinite(n))alterar(n)}}} onBlur=${()=>setTexto(String(valor??0).replace('.',','))}/>`;
}
function Campo({titulo,termo,valor,alterar,tipo='numero',opcoes,dica,inteiro=false}){
 const id=useId();return html`<div class="field">
<label htmlFor=${id}>${titulo}${termo&&html`<${Ajuda} termo=${termo}/>`}</label>${tipo==='select'?html`<select id=${id} value=${valor} onChange=${e=>alterar(e.target.value)}>${opcoes.map(o=>html`<option key=${o[0]} value=${o[0]}>${o[1]}</option>`)}</select>`:tipo==='texto'||tipo==='date'?html`<input id=${id} type=${tipo==='date'?'date':'text'} value=${valor||''} onInput=${e=>alterar(e.target.value)}/>`:html`<${Numero} id=${id} valor=${valor} alterar=${alterar} inteiro=${inteiro}/>`}${dica&&html`<div class="hint">${dica}</div>`}</div>`;
}
function Detalhes({linhas,titulo='Detalhar cálculos'}){return html`<details>
<summary>${titulo}</summary>
<div class="formula">${linhas.map((x,i)=>html`<div key=${i}>${x}</div>`)}</div>
</details>`}
function KPI({titulo,valor,termo,sub}){return html`<div class="kpi">
<div class="eyebrow">${titulo}${termo&&html`<${Ajuda} termo=${termo}/>`}</div>
<div class="value mono">${valor}</div>
<small>${sub}</small>
</div>`}
function Sinal({status}){const texto={seguro:'✓ Dentro da política comercial',abaixo:'! Requer ajuste de preço',prejuizo:'× Venda com prejuízo',pendente:'! Custo pendente',vazio:'Pedido sem itens'};return html`<span class=${'badge '+(status==='seguro'?'ok':status==='prejuizo'?'bad':'warn')}>${texto[status]||'! Revisar dados'}</span>`}
function App(){
 const inicio=useMemo(carregar,[]),[s,setS]=useState(()=>{const o=inicio.s;o.modo='gestor';if(window.ABA_INICIAL)o.aba=window.ABA_INICIAL;return o});
 const [mensagem,setMensagem]=useState(inicio.aviso),[mudou,setMudou]=useState(false),[preview,setPreview]=useState(false),[codigo,setCodigo]=useState(''),[tipoExport,setTipoExport]=useState('comercial'),[candidato,setCandidato]=useState(null),[busca,setBusca]=useState('');
 const vendedor=false,comercial=s.tipo==='comercial',p=s.produtos.find(x=>x.id===s.selecionado)||s.produtos[0],param=s.parametros[s.ano];
 function mudar(fn){setMudou(true);setS(old=>{const next=clone(old);fn(next);migrarGrade(next);next.revisao=(old.revisao||0)+1;return next})}
 const up=(k,v)=>mudar(x=>{const q=x.produtos.find(y=>y.id===p.id);if(k==='preco'&&q.tabelasPreco?.length){q.tabelasPreco.find(t=>t.id===q.tabelaVendaId).precoConsumidor=v;q.preco=null}else q[k]=v}),reg=(k,v)=>mudar(x=>x.regra[k]=v),ped=(k,v)=>mudar(x=>x.pedido[k]=v);
 const par=(k,v)=>mudar(x=>{const a=x.parametros[x.ano];x.historico=[...(x.historico||[]),{quando:new Date().toISOString(),horizonte:x.ano,campo:k,anterior:a[k],novo:v,origem:'edição local'}].slice(-500);a[k]=v;a.alterado=true;a.atualizado=hoje();a.situacao='Alterado manualmente — requer validação'});
 const calc=useMemo(()=>comercial?{valor:null,erro:null}:tentativa(()=>M.calcularProduto(p,s.regra,param)),[s,p]);const r=calc.valor;
 const pedido=useMemo(()=>tentativa(()=>comercial?M.calcularPedidoComercial(s.pedido,s.produtos,s.regra):M.calcularPedido(s.pedido,s.produtos,s.regra,s.parametros,s.ano)),[s]);const pr=pedido.valor;
 const credito=(!comercial&&r)?tentativa(()=>M.calcularCaixa(r,p.creditos,p.caixa)):{valor:null,erro:null};
 useEffect(()=>{document.documentElement.dataset.theme=s.tema},[s.tema]);
 useEffect(()=>{if(!mudou)return;try{localStorage.setItem(CHAVE,JSON.stringify(s))}catch(e){setMensagem('Não foi possível salvar neste navegador. Exporte um backup JSON para preservar os dados.')}},[s,mudou]);
 useEffect(()=>{const v=window.visualViewport;if(!v)return;const f=()=>{document.documentElement.style.setProperty('--keyboard-inset',Math.max(0,innerHeight-v.height-v.offsetTop)+'px')};f();v.addEventListener('resize',f);v.addEventListener('scroll',f);return()=>{v.removeEventListener('resize',f);v.removeEventListener('scroll',f)}},[]);
 const ehPedido=s.aba==='pedido'||vendedor;
 const gradeAtiva=!vendedor&&!comercial&&s.aba==='preco';
 const linhasCalc=r?(r.tabelaId?memoriaTabelaCompativel(r,p,s.regra):[
  'Modelo: '+(param.modelo==='original'?'original do autor (comparação)':'bases encadeadas')+'; inclusão CBS/IBS na base ICMS: '+(param.incluirNovosNoIcms?'sim':'não'),
  'Alíquotas efetivas: ICMS '+pc(r.aliquotas.icms)+'; CBS '+pc(r.aliquotas.cbs)+'; IBS '+pc(r.aliquotas.ibs)+'; IS '+pc(r.aliquotas.is),
  'Meta: '+(s.regra.baseMeta==='cpv'?'CPV × meta = '+brl(p.cpv)+' × '+pc(p.meta)+' = '+brl(p.cpv*p.meta/100):'(CPV + frete) ÷ (1 − meta) = ('+brl(p.cpv)+' + '+brl(p.frete)+') ÷ (1 − '+pc(p.meta)+') = '+brl(r.antesDesconto)),
  'Receita alvo = '+brl(r.antesDesconto)+' − '+brl(p.descontoBase)+' = '+brl(r.alvo),
  'Fator = '+(param.modelo==='original'?'1 + a/(1−a) + c + i':param.incluirNovosNoIcms?'(1 + s) × (1 + c + i) ÷ (1 − a)':'(1 + s) ÷ (1 − a) + (1 + s) × (c + i)')+' = '+fmt(r.f,10),
  'Sugerido = teto_centavo('+fmt(r.alvo)+' × '+fmt(r.f,10)+') = '+brl(r.sugerido),
  'Receita efetiva = '+brl(r.preco)+' ÷ '+fmt(r.f,10)+' = '+fmt(r.receita)+' (exibida: '+brl(r.receita)+')',
  'IS = receita × '+pc(r.aliquotas.is)+' = '+fmt(r.receita)+' × '+fmt(r.aliquotas.is/100)+' = '+fmt(r.is),
  'Base CBS/IBS = receita + IS = '+fmt(r.receita)+' + '+fmt(r.is)+' = '+fmt(r.baseCbsIbs),
  'CBS = '+fmt(r.baseCbsIbs)+' × '+fmt(r.aliquotas.cbs/100)+' = '+fmt(r.cbs),
  'IBS = '+fmt(r.baseCbsIbs)+' × '+fmt(r.aliquotas.ibs/100)+' = '+fmt(r.ibs),
  'Base ICMS = '+(param.modelo!=='original'&&param.incluirNovosNoIcms?'preço final':'(receita + IS) ÷ (1 − a)')+' = '+fmt(r.baseIcms),
  'ICMS = '+fmt(r.baseIcms)+' × '+fmt(r.aliquotas.icms/100)+' = '+fmt(r.icms),
  'Resultado = '+fmt(r.receita)+' − '+brl(p.cpv)+' − '+brl(p.frete)+' = '+fmt(r.lucro),
  'Margem s/ venda = '+fmt(r.lucro)+' ÷ '+brl(r.preco)+' × 100 = '+pc(r.mVenda),
  'Margem s/ operação = '+fmt(r.lucro)+' ÷ '+fmt(r.receita)+' × 100 = '+pc(r.mOper),
  'Retorno s/ CPV = '+fmt(r.lucro)+' ÷ '+brl(p.cpv)+' × 100 = '+pc(r.markup),
  'Equilíbrio = teto_centavo(('+brl(p.cpv)+' + '+brl(p.frete)+') × '+fmt(r.f)+') = '+brl(r.equilibrio),
  'Mínimo = teto_centavo('+brl(r.custo)+' ÷ (1 − '+pc(s.regra.minMargem)+') × '+fmt(r.f)+') = '+brl(r.minimo),
  'Desconto máximo seguro = piso_2casas(max(0,(1 − '+brl(r.minimo)+' ÷ '+brl(r.preco)+') × 100)) = '+pc(r.descontoMax),
  'Composição: preço − receita − ICMS − CBS − IBS − IS = '+fmt(r.preco-r.receita-r.icms-r.cbs-r.ibs-r.is,12)+' (precisão interna); componentes exibidos podem diferir em centavos.'
 ]):[];
 function novoProduto(){const id='p'+Date.now();mudar(x=>{x.produtos.push({...clone(x.produtos[0]),entrada:null,tabelasPreco:null,tabelaVendaId:null,id,nome:'Novo produto',cpv:0,frete:0,meta:20,mpBruta:0,descontoBase:0,preco:null,ncm:'',validado:false,creditos:{icms:0,cbs:0,ibs:0},clienteCredito:{icms:0,cbs:0,ibs:0}});x.selecionado=id;x.aba='preco'})}
 function removerProduto(){if(s.produtos.length<2)return;if(confirm('Remover '+p.nome+' e seus itens do pedido?'))mudar(x=>{x.produtos=x.produtos.filter(y=>y.id!==p.id);x.pedido.itens=x.pedido.itens.filter(y=>y.produtoId!==p.id);x.selecionado=x.produtos[0].id})}
 function mudarItem(id,k,v){mudar(x=>x.pedido.itens.find(y=>y.produtoId===id)[k]=v)}
 function adicionar(id){if(s.pedido.itens.some(x=>x.produtoId===id)){setMensagem('Este produto já está no pedido. Altere a quantidade.');return}mudar(x=>x.pedido.itens.push({produtoId:id,quantidade:1,preco:null}))}
 function pacote(tipo){
  if(tipo==='interno')return {...clone(s),autoria:AUTORIA,tipo:'interno',modo:'gestor'};
  const produtos=s.produtos.map(p=>{const q=comercial?null:M.calcularProduto(p,s.regra,param);if(q&&(q.status!=='seguro'))throw Error(p.nome+': ajuste custo e preço antes de publicar a tabela comercial.');return {id:p.id,nome:p.nome,unidade:p.unidade,ncm:p.ncm,tratamento:p.tratamento,seletivo:p.seletivo,validado:p.validado,faixas:clone(p.faixas),precoComercial:comercial?p.precoComercial:q.preco,pisoComercial:comercial?p.pisoComercial:q.minimo,descontoTabela:comercial?p.descontoTabela:p.tabelasPreco?.find(t=>t.id===p.tabelaVendaId)?.desconto}});
  return {versao:4,autoria:AUTORIA,tipo:'comercial',ano:s.ano,parametros:{[s.ano]:clone(param)},regra:{...clone(s.regra),baseMeta:'cpv',minMargem:0},produtos,contexto:clone(s.contexto),publicadoEm:new Date().toISOString()};
 }
 function prepararExport(){try{const o=pacote(tipoExport);M.validarImportacao(o);setCodigo(codificar(o));setCandidato(null);setMensagem(tipoExport==='comercial'?'Código comercial gerado sem CPV, créditos ou margens.':'Backup interno gerado: contém custos. Compartilhe apenas com gestores.')}catch(e){setMensagem('Corrija os dados antes de exportar: '+e.message)}}
 async function copiar(texto){try{await navigator.clipboard.writeText(texto);setMensagem('Copiado.')}catch(e){setMensagem('A cópia automática foi bloqueada. Selecione e copie o texto na caixa.')}}
 function lerCodigo(){try{let o=codigo.trim().startsWith('{')?JSON.parse(codigo):decodificar(codigo);if(o.v===2){const n=estadoInicial();n.produtos=o.i.map((x,i)=>({...clone(n.produtos[0]),id:'legado'+i,nome:x.n,unidade:x.u,cpv:x.c,frete:x.f,preco:x.t,faixas:x.q.map(([de,pct])=>({de,pct})),ncm:'',validado:false}));n.selecionado=n.produtos[0].id;n.regra.descMin=o.l?.[0]??0;n.regra.descMax=o.l?.[1]??10;const ano=n.ano;n.parametros={[ano]:{...n.parametros[ano],...o.r,modelo:'original',is:0,alterado:true,situacao:'Importado v2 — valores históricos, requer revisão'}};n.pedido={...n.pedido,itens:[]};o=n}validarCatalogosPacote(o);M.validarImportacao(o);if(o.tipo==='comercial')throw Error('Arquivo sem custos não reabre o estudo de gestão. Importe um backup interno.');setCandidato(o);setMensagem('Código validado. Confira o tipo e confirme a importação abaixo.')}catch(e){setCandidato(null);setMensagem('Não foi possível importar: '+e.message)}}
 function importar(){if(!candidato)return;const base=estadoInicial(),o=clone(candidato);mudar(x=>{Object.assign(x,base,o,{autoria:AUTORIA,selecionado:o.produtos[0].id,ano:o.parametros[o.ano]?o.ano:Object.keys(o.parametros)[0],modo:'gestor',aba:'pedido',pedido:o.tipo==='interno'&&o.pedido?o.pedido:{...base.pedido,data:hoje(),itens:[]}})});setCandidato(null);setCodigo('');setMensagem('Dados importados. Pacotes comerciais iniciam pedido vazio; backups internos preservam o pedido.');}
 const resumo=pr?['RESUMO COMERCIAL — SIMULAÇÃO B2B','Cliente: '+s.pedido.cliente,...pr.itens.map(x=>x.l.quantidade+' × '+x.p.nome+' ('+x.p.unidade+') — '+brl(x.praticado)+' / unidade; subtotal '+brl(x.subtotal)+(x.rateio?' − desconto rateado '+brl(x.rateio):'')),'Descontos totais: '+brl(pr.descontoTotal),'Outras despesas cobradas: '+brl(pr.outrasDespesas),'IPI informado: '+brl(pr.ipi),'ICMS-ST informado: '+brl(pr.icmsSt),'CBS: '+brl(pr.cbs)+'; IBS: '+brl(pr.ibs),'Total sem CBS e IBS: '+brl(pr.semReforma),'Total com frete CIF e tributos modelados: '+brl(pr.total),'Vencimento simulado: '+vencimento(s.pedido.data,s.pedido.prazo)+' ('+s.pedido.prazo+' dias)','Condição sujeita à aprovação comercial e validação fiscal. Não é documento fiscal nem boleto bancário.','',AUTORIA.credito].join('\n'):'';
 const condicaoValida=Number.isInteger(s.pedido.prazo)&&s.pedido.prazo>=0&&s.pedido.prazo<=365&&/^\d{4}-\d{2}-\d{2}$/.test(s.pedido.data)&&s.pedido.cliente.trim().length>0;
 const exportavel=pr&&pr.itens.length&&pr.status==='seguro'&&condicaoValida;
 const avisoFiscal=html`<div class="notice warn">
<strong>Estudo fiscal · ${s.ano}</strong> — ${param.situacao}. ${!p.validado?'Enquadramento do produto pendente. ':''}Valide com contador ou advogado tributarista antes de aplicar ao ERP.</div>`;
 const selecao=html`<${Campo} titulo="1. Escolha o produto" valor=${p.id} tipo="select" opcoes=${s.produtos.map(x=>[x.id,x.nome])} alterar=${v=>mudar(x=>x.selecionado=v)}/>`;
 const produtosForm=!comercial&&html`<section class="panel">
<h2>Dados do produto</h2>
<div class="grid">
<${Campo} titulo="Nome do produto" tipo="texto" valor=${p.nome} alterar=${v=>up('nome',v)}/>
<${Campo} titulo="Unidade de venda" tipo="texto" valor=${p.unidade} alterar=${v=>up('unidade',v)}/>
<${Campo} titulo="CPV líquido por unidade (R$)" termo="cpv" valor=${p.cpv} alterar=${v=>up('cpv',v)}/>
<${Campo} titulo="Frete CIF por unidade (R$)" termo="frete" valor=${p.frete} alterar=${v=>up('frete',v)}/>
<${Campo} titulo="Meta de margem (%)" termo="meta" valor=${p.meta} alterar=${v=>up('meta',v)}/>
<${Campo} titulo="Desconto sobre a receita alvo (R$)" termo="desconto" valor=${p.descontoBase} alterar=${v=>up('descontoBase',v)} dica="Abatimento antes dos tributos. O equivalente no total final aparece no detalhamento."/>
<${Campo} titulo="Matéria-prima bruta de referência (R$)" termo="mp" valor=${p.mpBruta} alterar=${v=>up('mpBruta',v)}/>
<${Campo} titulo="Meta calculada sobre" tipo="select" valor=${s.regra.baseMeta} alterar=${v=>reg('baseMeta',v)} opcoes=${[['cpv','CPV líquido'],['operacao','Receita sem tributos modelados']]}/>
</div>${r&&p.descontoBase>0&&html`<div class="notice">Este desconto reduz a receita alvo em ${brl(p.descontoBase)} e o preço final calculado em aproximadamente ${brl(r.descontoFinalEquivalente)}. A meta deixa de ser integralmente atendida.</div>`}<div class="row">
<${Botao} class="btn" onClick=${novoProduto}>+ Novo produto<//>

<${Botao} class="btn danger" disabled=${s.produtos.length<2} onClick=${removerProduto}>Remover produto<//>

</div>
</section>
`;
 const alertas=[];
 if(calc.erro)alertas.push({tipo:'bad',texto:calc.erro,acao:'Restaurar dados deste produto',fn:()=>{if(confirm('Restaurar custos e metas deste produto?'))mudar(x=>Object.assign(x.produtos.find(z=>z.id===p.id),{cpv:50,frete:10,meta:20,descontoBase:0,mpBruta:30,preco:null}));}});
 if(r){
  if(p.cpv<=0)alertas.push({tipo:'bad',texto:'CPV zerado: o resultado não pode orientar a venda. Informe o custo real.',acao:'Editar CPV',fn:()=>document.getElementById('produto-dados')?.scrollIntoView({behavior:'smooth'})});
  if(r.status==='prejuizo'||r.status==='abaixo')alertas.push({tipo:r.status==='prejuizo'?'bad':'warn',texto:(r.status==='prejuizo'?'Perda de '+brl(-r.lucro)+' por unidade. ':'Resultado abaixo da margem mínima. ')+'Faltam '+brl(Math.max(0,r.minimo-r.preco))+' no preço para respeitar a política.',acao:'Usar mínimo '+brl(r.minimo),fn:()=>up('preco',r.minimo)});
  if(r.preco>r.sugerido*1.5&&r.sugerido>0)alertas.push({tipo:'warn',texto:'Preço '+brl(r.preco-r.sugerido)+' acima do sugerido. Verifique a competitividade.',acao:'Usar sugerido',fn:()=>up('preco',null)});
  if(p.mpBruta>p.cpv&&p.cpv>0)alertas.push({tipo:'warn',texto:'Matéria-prima bruta supera o CPV líquido em '+brl(p.mpBruta-p.cpv)+'. Isso pode decorrer dos créditos; confira a composição antes de usar.',acao:'Conferir custo',fn:()=>document.getElementById('produto-dados')?.scrollIntoView({behavior:'smooth'})});
 }
 const precoView=html`<div class="stepnote">1 Escolher produto → 2 Conferir sugerido → 3 Ajustar preço → 4 Avaliar resultado</div>${alertas.map((a,i)=>html`<div key=${i} class=${'notice '+a.tipo} role="status">${a.texto}<div class="row">
<${Botao} class="btn" onClick=${a.fn}>${a.acao}<//>

</div>
</div>`)}${r&&html`<section class="panel">
<div class="row between">
<h2>Preço e margens</h2>
<${Sinal} status=${r.status}/>
</div>
<div class="grid">
<div>
<label htmlFor="preco-final">2. Preço final por ${p.unidade}<${Ajuda} termo="preco"/>
</label>
<${Numero} id="preco-final" classe="pricefield" valor=${r.preco} alterar=${v=>up('preco',v)}/>
<div class="muted">Sugerido: ${brl(r.sugerido)} · ${p.preco==null?'usando o sugerido':'preço ajustado manualmente'}</div>
</div>
<div>
<div class="eyebrow">3. Ajuste rápido</div>
<div class="row" style=${{marginTop:10}}>
<${Botao} class="btn" onClick=${()=>up('preco',null)}>Sugerido ${brl(r.sugerido)}<//>

<${Botao} class="btn" onClick=${()=>up('preco',r.minimo)}>Mínimo ${brl(r.minimo)}<//>
${[0.99,0.9,0.5].map(v=>html`<${Botao} class="btn small" key=${v} onClick=${()=>{let x=Math.floor(r.sugerido)+v;if(x<r.sugerido)x++;up('preco',M.dinheiro(x))}}>Final ,${String(Math.round(v*100)).padStart(2,'0')}<//>
`)}</div>
</div>
</div>
<label htmlFor="barra-preco" class="muted" style=${{marginTop:16}}>Ajustar preço pela barra</label>
<input id="barra-preco" type="range" min="0" max=${Math.max(200,r.sugerido*1.8,r.preco)} step="0.01" value=${r.preco} onInput=${e=>up('preco',Number(e.target.value))}/>
</section>

<div class="grid four" aria-live="polite" aria-atomic="true">
<${KPI} titulo="Resultado / unidade" termo="lucro" valor=${brl(r.lucro)} sub=${'Equilíbrio: '+brl(r.equilibrio)}/>
<${KPI} titulo="Margem / venda" termo="mVenda" valor=${pc(r.mVenda)} sub="Sobre o total pago"/>
<${KPI} titulo="Margem / operação" termo="mOper" valor=${pc(r.mOper)} sub=${'Mínimo: '+pc(s.regra.minMargem)}/>
<${KPI} titulo="Retorno / CPV" termo="markup" valor=${pc(r.markup)} sub="Markup do autor"/>
</div>
<section class="panel" style=${{marginTop:20}}>
<div class="grid">
<div>
<h3>4. Saúde da margem</h3>
<div class="meter">
<label htmlFor="medidor">${pc(r.mOper)} · mínimo ${pc(s.regra.minMargem)}</label>
<progress id="medidor" value=${Math.max(0,r.mOper)} max=${Math.max(40,s.regra.minMargem*2,r.mOper)} aria-label=${'Margem '+pc(r.mOper)+'; mínimo '+pc(s.regra.minMargem)}>
</progress>
</div>
<${Sinal} status=${r.status}/>
<p class="muted">Aprovação comercial não significa validação fiscal.</p>
</div>
<div>
<h3>Composição do preço</h3>
<div class="composition" role="img" aria-label=${'CPV '+brl(p.cpv)+', frete '+brl(p.frete)+', tributos '+brl(r.tributos)+', resultado '+brl(r.lucro)}>${[[p.cpv,'#6f6f6f'],[p.frete,'#007d79'],[r.tributos,'#9f1853'],[Math.max(0,r.lucro),'#198038']].map(([v,c],i)=>html`<span key=${i} style=${{width:(r.preco?v/r.preco*100:0)+'%',background:c}}>
</span>`)}</div>
<div class="legend">${[['CPV',p.cpv,'#6f6f6f'],['Frete',p.frete,'#007d79'],['Tributos',r.tributos,'#9f1853'],['Resultado',r.lucro,'#198038']].map(([n,v,c])=>html`<span key=${n}>
<i style=${{background:c}}>
</i>${n}: ${brl(v)}</span>`)}</div>
</div>
</div>
<${Detalhes} linhas=${linhasCalc}/>
</section>
`}<div id="produto-dados">${produtosForm}</div>`;
 const faixasErros=M.validarFaixas(p.faixas,s.regra.descMin,s.regra.descMax);
 function corrigirFaixas(){mudar(x=>{const a=x.produtos.find(z=>z.id===p.id);const max=Math.max(0,Math.min(99,x.regra.descMax)),min=Math.max(0,Math.min(max,x.regra.descMin));x.regra.descMin=min;x.regra.descMax=max;const mapa=new Map();for(const f of a.faixas)mapa.set(Math.max(1,Math.round(f.de)||1),Math.max(min,Math.min(max,Number(f.pct)||0,r?r.descontoMax:max)));a.faixas=[...mapa].map(([de,pct])=>({de,pct:Math.max(min,pct)})).sort((a,b)=>a.de-b.de);if(!a.faixas.length)a.faixas=[{de:1,pct:min}]})}
 const faixasView=html`<section class="panel">
<h2>Desconto por quantidade · ${p.nome}<${Ajuda} termo="faixa"/>
</h2>
<p class="muted">Faixas independentes por produto. A política de intervalo e margem mínima vale para todo o catálogo.</p>
<div class="grid three">
<${Campo} titulo="Desconto mínimo permitido (%)" valor=${s.regra.descMin} alterar=${v=>reg('descMin',v)}/>
<${Campo} titulo="Desconto máximo permitido (%)" valor=${s.regra.descMax} alterar=${v=>reg('descMax',v)}/>
<${Campo} titulo="Margem mínima sobre a operação (%)" termo="mOper" valor=${s.regra.minMargem} alterar=${v=>reg('minMargem',v)}/>
</div>${faixasErros.length>0&&html`<div class="notice bad" role="alert">${faixasErros.join(' ')}<div class="row">
<${Botao} class="btn" onClick=${corrigirFaixas}>Ordenar, remover duplicadas e limitar<//>

</div>
</div>`}${r&&html`<div class="notice">Neste preço, desconto máximo seguro: <strong>${pc(r.descontoMax)}</strong>. Preço mínimo: ${brl(r.minimo)}. Faixas abaixo dele exigem correção.</div>`}<div class="tablewrap">
<table>
<thead>
<tr>
<th>A partir de</th>
<th>Desconto (%)</th>
<th>Preço unitário</th>
<th>Margem/operação</th>
<th>Situação</th>
<th>Ação</th>
</tr>
</thead>
<tbody>${p.faixas.map((f,k)=>{const res=r?tentativa(()=>M.calcularProduto(p,s.regra,param,M.dinheiro(r.preco*(1-f.pct/100)))):{valor:null},q=res.valor;return html`<tr key=${k}>
<td>
<${Numero} valor=${f.de} rotulo=${'Quantidade inicial da faixa '+(k+1)} inteiro=${true} alterar=${v=>mudar(x=>x.produtos.find(z=>z.id===p.id).faixas[k].de=v)}/>
</td>
<td>
<${Numero} valor=${f.pct} rotulo=${'Percentual da faixa '+(k+1)} alterar=${v=>mudar(x=>x.produtos.find(z=>z.id===p.id).faixas[k].pct=v)}/>
</td>
<td class="mono">${q?brl(q.preco):'—'}</td>
<td>${q?pc(q.mOper):'—'}</td>
<td>${q?html`<${Sinal} status=${q.status}/>`:'Revisar dados'}</td>
<td>
<${Botao} class="btn small danger" onClick=${()=>{if(confirm('Remover esta faixa?'))mudar(x=>x.produtos.find(z=>z.id===p.id).faixas.splice(k,1))}}>Remover<//>

</td>
</tr>`})}</tbody>
</table>
</div>
<div class="row" style=${{marginTop:16}}>
<${Botao} class="btn primary" onClick=${()=>up('faixas',[...p.faixas,{de:Math.max(0,...p.faixas.map(x=>x.de))+10,pct:s.regra.descMax}])}>+ Adicionar faixa<//>

<${Botao} class="btn" onClick=${()=>up('faixas',[...p.faixas].sort((a,b)=>a.de-b.de))}>Ordenar<//>

<${Botao} class="btn" onClick=${corrigirFaixas}>Corrigir faixas<//>

</div>${r&&html`<${Detalhes} linhas=${p.faixas.map(f=>{const preco=M.dinheiro(r.preco*(1-f.pct/100));const q=tentativa(()=>M.calcularProduto(p,s.regra,param,preco)).valor;return 'A partir de '+f.de+': '+brl(r.preco)+' × (1 − '+pc(f.pct)+') = '+brl(preco)+(q?'; receita '+fmt(q.receita)+'; resultado '+fmt(q.lucro)+'; margem '+pc(q.mOper):'')})}/>`}</section>
`;
 const fiscalView=html`<section class="panel">
<h2>Contexto da operação</h2>
<div class="notice warn">Sem UF, regime e classificação confirmados, este é um cenário de estudo. A versão inicial não automatiza ST, FCP, DIFAL, benefícios estaduais, IPI, PIS/Cofins nem obrigações fiscais.</div>
<div class="grid">
<${Campo} titulo="UF de origem" tipo="select" valor=${s.contexto.ufOrigem} opcoes=${[['','Selecione a UF'],...UFS_VALIDAS.map(([sigla,nome])=>[sigla,sigla+' — '+nome])]} alterar=${v=>mudar(x=>x.contexto.ufOrigem=v)}/>
<${Campo} titulo="UF de destino" tipo="select" valor=${s.contexto.ufDestino} opcoes=${[['','Selecione a UF'],...UFS_VALIDAS.map(([sigla,nome])=>[sigla,sigla+' — '+nome])]} alterar=${v=>mudar(x=>x.contexto.ufDestino=v)}/>
<${Campo} titulo="Regime do fornecedor" tipo="select" valor=${s.contexto.regime} opcoes=${[['Não informado','Não informado'],['Regular','Regime regular IBS/CBS'],['Simples','Simples: IBS/CBS dentro do Simples'],['Simples regular','Simples: opção IBS/CBS regular']]} alterar=${v=>mudar(x=>x.contexto.regime=v)}/>
<${CampoNcm} key=${p.id} produto=${p} alterar=${v=>mudar(x=>{const q=x.produtos.find(q=>q.id===p.id);q.ncm=v;q.validado=false})}/>
<${Campo} titulo="Tratamento de CBS/IBS do produto" termo="regime" tipo="select" valor=${p.tratamento} opcoes=${[['padrao','Padrão — hipótese'],['reduzida','Redução de 60% — depende de enquadramento'],['zero','Zero / cesta básica — depende de enquadramento']]} alterar=${v=>{up('tratamento',v);up('validado',false)}}/>
</div>
<label class="checkrow">
<input type="checkbox" checked=${p.seletivo} onChange=${e=>{up('seletivo',e.target.checked);up('validado',false)}}/>Simular incidência de Imposto Seletivo<${Ajuda} termo="is"/>
</label>
<label class="checkrow">
<input type="checkbox" checked=${p.validado} onChange=${e=>{if(e.target.checked&&(!validarNcm(p.ncm)||!s.contexto.ufOrigem||!s.contexto.ufDestino||s.contexto.regime==='Não informado')){setMensagem('Informe NCM existente, UFs de origem/destino e regime antes de registrar a revisão.');return}up('validado',e.target.checked)}}/>Registrar enquadramento revisado pelo responsável (declaração local)</label>${s.contexto.regime.startsWith('Simples')&&html`<div class="notice bad">Este motor calcula o cenário regular. O DAS e as regras próprias do Simples não são calculados. Use os resultados apenas como comparação; confirme créditos e opção pelo regime regular.</div>`}</section>

<section class="panel">
<h2>Parâmetros fiscais · ${s.ano}</h2>
<div class="row" style=${{marginBottom:20}}>${Object.keys(s.parametros).map(a=>html`<${Botao} key=${a} class=${'btn '+(a===s.ano?'primary':'')} onClick=${()=>mudar(x=>x.ano=a)}>${a}<//>
`)}</div>
<div class="grid four">${[['icms','ICMS (%)','icms'],['cbs','CBS de referência do cenário (%)','cbs'],['ibs','IBS total de referência (%)','ibs'],['is','IS: alíquota hipotética (%)','is']].map(([k,t,termo])=>html`<${Campo} key=${k} titulo=${t} termo=${termo} valor=${param[k]} alterar=${v=>par(k,v)}/>` )}</div>
<div class="grid">
<${Campo} titulo="Modelo de bases" tipo="select" valor=${param.modelo} opcoes=${[['encadeado','Bases encadeadas — cenário parametrizado'],['original','Modelo original do autor — comparação']]} alterar=${v=>par('modelo',v)}/>
<${Campo} titulo="Fator restante após redução de 60%" valor=${param.fatorReduzida} alterar=${v=>par('fatorReduzida',v)} dica="0,4 significa aplicar 40% da taxa de referência. Não arredondar a alíquota efetiva antes do cálculo."/>
</div>
<label class="checkrow">
<input type="checkbox" checked=${param.incluirNovosNoIcms} onChange=${e=>par('incluirNovosNoIcms',e.target.checked)}/>Incluir CBS/IBS na base do ICMS (modelo encadeado)</label>
<div class="grid three">
<${Campo} titulo="Início da vigência do cenário" tipo="date" valor=${param.inicio} alterar=${v=>par('inicio',v)}/>
<${Campo} titulo="Fim da vigência do cenário" tipo="date" valor=${param.fim} alterar=${v=>par('fim',v)}/>
<${Campo} titulo="Data da consulta/atualização" tipo="date" valor=${param.atualizado} alterar=${v=>par('atualizado',v)}/>
</div>
<${Campo} titulo="Fonte e fundamento legal" tipo="texto" valor=${param.fonte} alterar=${v=>par('fonte',v)}/>
<${Campo} titulo="URL da fonte" tipo="texto" valor=${param.url} alterar=${v=>par('url',v)}/>
<div class=${'notice '+(param.alterado?'warn':'')}>${param.situacao}${param.alterado&&html`<div class="row">
<${Botao} class="btn" onClick=${()=>{if(confirm('Restaurar as premissas iniciais deste horizonte?'))mudar(x=>x.parametros[x.ano]=clone(PARAMETROS_INICIAIS[x.ano]))}}>Restaurar premissas iniciais<//>

</div>`}</div>
<p class="muted">Mudanças não se tornam oficiais por serem salvas. Registre o ato aplicável e valide a operação. No modelo original, a opção de bases cruzadas não é aplicada.</p>
</section>
${r&&html`<section class="panel">
<h2>Do preço ao resultado</h2>
<table>
<tbody>${[['Preço final',r.preco],['(−) ICMS',-r.icms],['(−) CBS',-r.cbs],['(−) IBS',-r.ibs],['(−) IS',-r.is],['Receita sem tributos modelados',r.receita],['(−) CPV',-p.cpv],['(−) Frete',-p.frete],...(r.tabelaId?[['(−) Operacional',-r.operacional],['(−) Comissão',-r.comissao],['(−) Simples',-r.simples]]:[]),['Resultado',r.lucro]].map(([n,v],i)=>html`<tr key=${n} class=${n==='Resultado'?'total':''}>
<td>${n}</td>
<td class="num mono">${brl(v)}</td>
</tr>`)}</tbody>
</table>
<${Detalhes} linhas=${linhasCalc}/>
</section>
`}`;
 const caixaView=r?html`<section class="panel">
<h2>Créditos das aquisições · por unidade vendida<${Ajuda} termo="credito"/>
</h2>
<p class="muted">Informe valores elegíveis e atribuídos à unidade de venda. Não existe crédito automático a partir da matéria-prima bruta. Créditos já descontados no CPV não são adicionados novamente ao resultado.</p>
<div class="grid three">${['icms','cbs','ibs'].map(k=>html`<${Campo} key=${k} titulo=${'Crédito '+k.toUpperCase()+' (R$)'} valor=${p.creditos[k]} alterar=${v=>up('creditos',{...p.creditos,[k]:v})}/>` )}</div>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Tributo</th>
<th>Débito da venda</th>
<th>Crédito informado</th>
<th>Saldo comparativo</th>
</tr>
</thead>
<tbody>${['icms','cbs','ibs'].map(k=>html`<tr key=${k}>
<td>${k.toUpperCase()}</td>
<td>${brl(r[k])}</td>
<td>${brl(p.creditos[k])}</td>
<td>${brl(r[k]-p.creditos[k])}</td>
</tr>`)}</tbody>
</table>
</div>
<p class="muted">Saldo negativo é saldo credor comparativo; não representa pagamento imediato ao contribuinte. IBS e CBS são apurados separadamente.</p>
<${Detalhes} linhas=${['Matéria-prima bruta de referência = '+brl(p.mpBruta)+'; sem inferência automática de crédito.',...['icms','cbs','ibs'].map(k=>k.toUpperCase()+': débito '+fmt(r[k])+' − crédito informado '+brl(p.creditos[k])+' = '+fmt(r[k]-p.creditos[k]))]}/>
</section>

<section class="panel">
<h2>Simulação de split payment<${Ajuda} termo="split"/>
</h2>
<div class="notice warn">Não é previsão de retenção obrigatória em todo boleto. O procedimento, a cobertura e o cronograma dependem dos atos aplicáveis. IS não entra nesta retenção.</div>
<div class="grid">
<${Campo} titulo="Procedimento simulado" tipo="select" valor=${p.caixa.modo} opcoes=${[['desligado','Sem split na simulação'],['padrao','Padrão — débitos ainda não extintos'],['simplificado','Simplificado — percentual hipotético']]} alterar=${v=>up('caixa',{...p.caixa,modo:v})}/>
<${Campo} titulo="Cobertura do split no cenário (%)" valor=${p.caixa.cobertura} alterar=${v=>up('caixa',{...p.caixa,cobertura:v})}/>
<${Campo} titulo="Débito CBS já extinto da operação (R$)" valor=${p.caixa.extintoCbs} alterar=${v=>up('caixa',{...p.caixa,extintoCbs:v})}/>
<${Campo} titulo="Débito IBS já extinto da operação (R$)" valor=${p.caixa.extintoIbs} alterar=${v=>up('caixa',{...p.caixa,extintoIbs:v})}/>${p.caixa.modo==='simplificado'&&html`<${Campo} titulo="Percentual simplificado hipotético (%)" valor=${p.caixa.percentualSimplificado} alterar=${v=>up('caixa',{...p.caixa,percentualSimplificado:v})} dica="Não é percentual oficial. Deve ser substituído pelo ato aplicável."/>`}<${Campo} titulo="Volume mensal (unidades)" inteiro=${true} valor=${p.caixa.volume} alterar=${v=>up('caixa',{...p.caixa,volume:v})}/>
</div>${credito.erro?html`<div class="notice bad">${credito.erro}</div>`:html`<div class="grid three">
<${KPI} titulo="Retenção simulada" valor=${brl(credito.valor.retido)} termo="split"/>
<${KPI} titulo="Depósito na indústria" valor=${brl(credito.valor.deposito)}/>
<${KPI} titulo="Comparativo de caixa / mês" valor=${brl(credito.valor.gapMensal)} termo="gap"/>
</div>
<${Detalhes} linhas=${['Retenção padrão = max('+fmt(r.cbs)+' − '+brl(p.caixa.extintoCbs)+',0) + max('+fmt(r.ibs)+' − '+brl(p.caixa.extintoIbs)+',0).','Procedimento selecionado: '+p.caixa.modo+'; cobertura '+pc(p.caixa.cobertura)+'. Simplificado: preço '+brl(r.preco)+' × '+pc(p.caixa.percentualSimplificado)+'.','Retenção após cobertura e fechamento em centavos = '+brl(credito.valor.retido),'Depósito = '+brl(r.preco)+' − '+brl(credito.valor.retido)+' = '+brl(credito.valor.deposito),'Comparativo mensal = ('+brl(credito.valor.retido)+' − '+brl(p.creditos.cbs)+' − '+brl(p.creditos.ibs)+') × '+p.caixa.volume+' = '+brl(credito.valor.gapMensal),'O comparativo não automatiza compensação de créditos, não inclui IS na retenção e não modela datas de ressarcimento.']}/>`}</section>

<section class="panel">
<h2>Crédito possível do cliente · hipótese</h2>
<p class="muted">Informe valores por tributo somente após conferir regime e operação. O resumo comercial não promete crédito. Para saída zero, crédito ordinário da aquisição de CBS/IBS é zero, ressalvadas hipóteses legais específicas.</p>
<div class="grid three">${['icms','cbs','ibs'].map(k=>html`<${Campo} key=${k} titulo=${'Crédito possível '+k.toUpperCase()+' (R$)'} valor=${p.clienteCredito[k]} alterar=${v=>up('clienteCredito',{...p.clienteCredito,[k]:v})}/>` )}</div>
<${Campo} titulo="Markup de revenda do cliente (%)" valor=${p.clienteMarkup} alterar=${v=>up('clienteMarkup',v)}/>${(()=>{const cr=p.clienteCredito.icms+p.clienteCredito.cbs+p.clienteCredito.ibs,custo=r.preco-cr;return html`${(['icms','cbs','ibs'].some(k=>p.clienteCredito[k]>r[k]+.005))&&html`<div class="notice bad">Crédito informado supera o tributo calculado em pelo menos uma linha. Revise o enquadramento; não use como promessa comercial.</div>`}<div class="row between">
<span>Custo de aquisição após créditos hipotéticos</span>
<strong class="mono">${brl(custo)}</strong>
</div>
<div class="row between">
<span>Revenda gerencial, sem tributos de saída</span>
<strong class="mono">${brl(custo*(1+p.clienteMarkup/100))}</strong>
</div>
<${Detalhes} linhas=${['Créditos hipotéticos = '+brl(p.clienteCredito.icms)+' + '+brl(p.clienteCredito.cbs)+' + '+brl(p.clienteCredito.ibs)+' = '+brl(cr),'Custo após créditos = '+brl(r.preco)+' − '+brl(cr)+' = '+brl(custo),'Revenda sem tributos de saída = '+brl(custo)+' × (1 + '+pc(p.clienteMarkup)+') = '+brl(custo*(1+p.clienteMarkup/100))]}/>`})()}</section>
`:html`<div class="notice bad">Corrija os dados de cálculo antes de simular créditos e caixa.</div>`;
 const sensView=r?html`<section class="panel">
<h2>E se eu mudar o preço?</h2>
<p class="muted">Cada cenário recalcula os mesmos tributos, custos e três margens. Use o botão para adotar um preço.</p>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Variação</th>
<th>Preço</th>
<th>Resultado</th>
<th>Margem/venda</th>
<th>Margem/operação</th>
<th>Retorno/CPV</th>
<th>Ação</th>
</tr>
</thead>
<tbody>${[-20,-15,-10,-5,0,5,10,15,20].map(v=>{const q=M.calcularProduto(p,s.regra,param,M.dinheiro(r.preco*(1+v/100)));return html`<tr key=${v}>
<td>${v>0?'+':''}${v}%</td>
<td>${brl(q.preco)}</td>
<td>${brl(q.lucro)}</td>
<td>${pc(q.mVenda)}</td>
<td>${pc(q.mOper)}</td>
<td>${pc(q.markup)}</td>
<td>
<${Botao} class="btn small" onClick=${()=>{up('preco',q.preco);mudar(x=>x.aba='preco')}}>Usar ${brl(q.preco)}<//>

</td>
</tr>`})}</tbody>
</table>
</div>
<${Detalhes} linhas=${['Preço alternativo = preço atual '+brl(r.preco)+' × (1 + variação).','Receita = preço alternativo ÷ '+fmt(r.f)+'; resultado = receita − '+brl(r.custo)+'.','As três margens usam os denominadores descritos no glossário.',...linhasCalc.slice(-6)]}/>
</section>
`:html`<div class="notice bad">Corrija o produto para simular preços.</div>`;
 const pedidoView=html`<${TelaPedido} s=${s} mudar=${mudar} resultado=${pr} erro=${pedido.erro} mensagem=${setMensagem} resumo=${resumo} copiar=${copiar} exportavel=${exportavel}/>`;
 const dadosModelo={autoria:AUTORIA,versaoModelo:4,entrada:{produto:p,contexto:s.contexto,pedido:s.pedido},parametros:{horizonte:s.ano,fiscal:param,comercial:s.regra},resultado:{produto:r,erro:calc.erro,pedido:pr,erroPedido:pedido.erro,caixa:credito.valor},politicas:{arredondamento:'Decimal 32 dígitos; half-up para valores comerciais; teto para sugerido/mínimo; piso para desconto seguro; rateio maiores restos',validacaoFiscal:'Responsável tributário deve validar fontes, enquadramento e regras aplicáveis.'}};
 const estudoView=html`<section class="panel">
<h2>Transferir tabela ou guardar backup</h2>
<div class="notice">Pacote comercial exclui custos e margens. Pacote interno contém dados de gestão. Base64 é codificação, sem proteção por senha.</div>
<div class="row">
<label class="checkrow">
<input type="radio" name="exportacao" checked=${tipoExport==='comercial'} onChange=${()=>setTipoExport('comercial')}/>Tabela sem custos</label>
<label class="checkrow">
<input type="radio" name="exportacao" checked=${tipoExport==='interno'} disabled=${comercial} onChange=${()=>setTipoExport('interno')}/>Interno (gestor)</label>
<${Botao} class="btn primary" onClick=${prepararExport}>Gerar código<//>

<${Botao} class="btn" onClick=${()=>{try{const o=pacote(tipoExport);M.validarImportacao(o);baixar('tabela-b2b-'+tipoExport+'.json',JSON.stringify(o,null,2))}catch(e){setMensagem(e.message)}}}>Baixar JSON<//>

</div>
<label htmlFor="codigo" style=${{marginTop:16}}>Código Base64 ou JSON</label>
<textarea id="codigo" class="mono" rows="4" value=${codigo} onInput=${e=>{setCodigo(e.target.value);setCandidato(null)}}>
</textarea>
<div class="row" style=${{marginTop:12}}>
<${Botao} class="btn" onClick=${()=>copiar(codigo)} disabled=${!codigo}>Copiar código<//>

<${Botao} class="btn" onClick=${lerCodigo}>Validar importação<//>

<label class="btn">Abrir JSON<input type="file" accept=".json,application/json" style=${{display:'none'}} onChange=${async e=>{const f=e.target.files[0];if(f){if(f.size>2000000){setMensagem('Arquivo excede 2 MB.');return}setCodigo(await f.text());setCandidato(null);setMensagem('Arquivo carregado. Clique em Validar importação.')}}}/>
</label>
</div>${candidato&&html`<div class="notice warn" style=${{marginTop:16}}>Pacote ${candidato.tipo}: ${candidato.produtos.length} produtos; horizonte ${candidato.ano}. Substitui os dados da tabela. Pacote comercial inicia pedido vazio; backup interno restaura seu pedido.<div class="row">
<${Botao} class="btn primary" onClick=${importar}>Confirmar importação<//>

<${Botao} class="btn" onClick=${()=>setCandidato(null)}>Cancelar<//>

</div>
</div>`}</section>
${!vendedor&&!comercial&&html`<section class="panel">
<h2>Modelo JSON · entradas, parâmetros e resultados</h2>
<${Botao} class="btn" onClick=${()=>baixar('modelo-estudo-erp.json',JSON.stringify(dadosModelo,null,2))}>Baixar modelo<//>

<pre class="formula" style=${{maxHeight:500,overflow:'auto'}}>${JSON.stringify(dadosModelo,null,2)}</pre>
</section>

<section class="panel">
<h2>Rastreabilidade das regras</h2>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Regra / situação</th>
<th>Base legal</th>
<th>Função</th>
<th>Teste</th>
</tr>
</thead>
<tbody>${REGRAS_AUDITADAS.map(x=>html`<tr key=${x[0]}>
<td>
<strong>${x[0]} · ${x[1]}</strong>
<br/>${x[2]}<br/>
<small>${x[6]}</small>
</td>
<td>
<a href=${x[7]} target="_blank" rel="noopener">${x[3]} ↗</a>
</td>
<td class="mono">${x[4]}</td>
<td>${x[5]}</td>
</tr>`)}</tbody>
</table>
</div>
</section>

<section class="panel">
<h2>Referência para o ERP</h2>
<p>
<strong>Entidades:</strong> Produto, EnquadramentoFiscal, ParametroFiscal, TabelaPreco, ItemTabelaPreco, FaixaDesconto, Pedido, ItemPedido, CreditoFiscal, Liquidacao e Apuracao.</p>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Contrato proposto</th>
<th>Finalidade</th>
</tr>
</thead>
<tbody>${[['POST /api/v1/precificacoes/simular','Entradas + versão fiscal → preço e memória de cálculo'],['POST /api/v1/pedidos/simular','Itens + descontos → margens e violações por item'],['POST /api/v1/tabelas-preco/publicar','Publicar preços e pisos autorizados, sem custos'],['GET /api/v1/parametros-fiscais?data=&uf=','Resolver parâmetro por vigência e contexto'],['POST /api/v1/liquidacoes/conciliar','Identificar nota, recebimento, retenções e débitos extintos'],['POST /api/v1/apuracoes/simular','Separar débitos, créditos, estornos e saldos por tributo']].map(([a,b])=>html`<tr key=${a}>
<td class="mono">${a}</td>
<td>${b}</td>
</tr>`)}</tbody>
</table>
</div>
<p class="muted" style=${{marginTop:16}}>Eventos sugeridos: TabelaPrecoPublicada, PedidoRecalculado, ParametroFiscalRevisado, CreditoApropriado, MercadoriaPerecida, LiquidacaoConciliada. Gravar versão do motor e parâmetros no cálculo aprovado. Autorizações e integridade ficam no servidor do ERP.</p>
</section>
`}<section class="panel">
<h2>Glossário e fórmulas</h2>
<${Campo} titulo="Buscar termo" tipo="texto" valor=${busca} alterar=${setBusca}/>
<div class="glossary">${Object.entries(GLOSSARIO).filter(([k,g])=>g.join(' ').toLowerCase().includes(busca.toLowerCase())).map(([k,g])=>html`<article key=${k}>
<h3>${g[0]}</h3>
<p>${g[1]}</p>
<code>${g[2]}</code>
</article>`)}</div>
</section>

<section class="panel">
<h2>Fontes e limites da versão inicial</h2>
<ul>${Object.entries(FONTES).map(([k,u])=>html`<li key=${k}>
<a href=${u} target="_blank" rel="noopener">${k.toUpperCase()} ↗</a>
</li>`)}</ul>
<p>Não há certificação fiscal ou de acessibilidade. Classificação fiscal, Simples, perdas, devoluções, ST/FCP/DIFAL, PIS/Cofins, IPI, crédito efetivo e cronograma do split precisam de validação específica.</p>
<p>Valide a implementação com contador ou advogado tributarista.</p>
</section>
`;
 const abas=vendedor?[['pedido','Pedido'],['estudo','Importar e ajuda']]:[['preco','Preço e margens'],['pedido','Pedido'],['faixas','Descontos'],['fiscal','Fiscal'],['caixa','Créditos e caixa'],['sens','E se…'],['estudo','Estudo ERP']];
 const abaAtiva=abas.some(([k])=>k===s.aba)?s.aba:'pedido';
 return html`<div class=${preview?'mobilePreview':''}>
<a href="#principal" class="skip">Ir para o conteúdo</a>
<div class="credit">
<strong>${AUTORIA.credito}</strong>
</div>
<div class="shell">
<header class="topbar noPrint">
<div>
<div class="brand">SN / ESTUDO B2B</div>
<small style=${{color:'#c6c6c6'}}>Precificação e venda · versão 4.2 · Gestor</small>
</div>
<div class="row">
<${Botao} class="btn" onClick=${()=>mudar(x=>x.tema=x.tema==='light'?'dark':'light')}>${s.tema==='light'?'Tema escuro':'Tema claro'}<//>

${!vendedor&&html`<${Botao} class="btn" onClick=${()=>{if(confirm('Restaurar todos os exemplos? Exporte um backup antes de confirmar.')){mudar(x=>Object.assign(x,estadoInicial(),{pedido:{...estadoInicial().pedido,data:hoje()}}));setMensagem('Exemplos restaurados.')}}}>Restaurar exemplos<//>`}
<${Botao} class="btn" onClick=${()=>setPreview(!preview)}>${preview?'Tela completa':'Ver como celular'}<//>

</div>
</header>${mensagem&&html`<${Notificacao} fechar=${()=>setMensagem('')}>${mensagem}<//>`}<div class="workspace screenOnly">
<div class="layout" style=${vendedor||gradeAtiva||s.aba==='pedido'?{gridTemplateColumns:'1fr'}:{}}>${!vendedor&&!gradeAtiva&&s.aba!=='pedido'&&html`<aside class="side" aria-label="Produtos e cenário">
<div class="panel">${selecao}<div class="products">${s.produtos.map(x=>{const q=comercial?null:tentativa(()=>M.calcularProduto(x,s.regra,param)).valor;return html`<${Botao} key=${x.id} class=${'product '+(x.id===p.id?'selected':'')} onClick=${()=>mudar(z=>z.selecionado=x.id)}>
<b>${x.nome}</b>
<small>${x.unidade} · ${q?brl(q.preco):'Revisar dados'}</small>
<//>
`})}</div>
<${Botao} class="btn" style=${{width:'100%',marginTop:8}} onClick=${novoProduto}>+ Novo produto<//>

</div>
<div class="panel">
<${Campo} titulo="Horizonte fiscal" tipo="select" valor=${s.ano} opcoes=${Object.keys(s.parametros).map(a=>[a,a])} alterar=${v=>mudar(x=>x.ano=v)}/>
<div class="muted">${param.situacao}</div>
<${Botao} class="btn" style=${{marginTop:12}} onClick=${()=>mudar(x=>x.aba='fiscal')}>Revisar parâmetros<//>

</div>
<div class="notice">Dados salvos neste navegador após cada alteração. Guarde também um backup interno.<br/>
<small>Backup interno contém custos. Guarde-o em local autorizado.</small>
</div>
</aside>`}<main id="principal" tabIndex="-1">
<div class="row between">
<div>
<div class="eyebrow">${vendedor?'Venda por telefone':'Indústria e distribuidora · estudo para ERP'}</div>
<h1>${vendedor?'Um preço claro. Um pedido simples.':gradeAtiva?'Precificação de produtos':p.nome}</h1>
<p class="muted">${vendedor?'Escolha os itens, ajuste as quantidades e confira o total.':'Custos, regras e cálculos visíveis para decidir com segurança.'}</p>
</div>
<span class="badge">Gestor · ${s.ano}</span>
</div>${avisoFiscal}<nav class="tabs" aria-label="Áreas do simulador">${abas.map(([k,t])=>html`<${Botao} key=${k} aria-current=${abaAtiva===k?'page':undefined} onClick=${()=>mudar(x=>x.aba=k)}>${t}<//>
`)}</nav>${abaAtiva==='preco'&&html`<${TelaPrecificacao} s=${s} mudar=${mudar} mensagem=${setMensagem}/>`}${abaAtiva==='faixas'&&faixasView}${abaAtiva==='fiscal'&&fiscalView}${abaAtiva==='caixa'&&caixaView}${abaAtiva==='sens'&&sensView}${abaAtiva==='pedido'&&pedidoView}${abaAtiva==='estudo'&&estudoView}</main>
</div>
</div>
<div class="printOnly">
<h1>Resumo comercial B2B</h1>
<pre style=${{whiteSpace:'pre-wrap',fontFamily:'sans-serif'}}>${resumo}</pre>
</div>
<footer class="footer">${AUTORIA.credito}<div class="muted" style=${{marginTop:8}}>Base de estudo. Implementação sujeita à validação por contador ou advogado tributarista.</div>
</footer>${false&&html`<div class="dock noPrint">
<div>
<small style=${{color:'#c6c6c6'}}>Total do pedido · CIF incluído</small>
<br/>
<strong class="mono">${pr?brl(pr.total):'Revisar dados'}</strong>
</div>
<${Botao} class="btn" onClick=${()=>{mudar(x=>x.aba='pedido');setTimeout(()=>document.getElementById('resumo')?.scrollIntoView({behavior:'smooth',block:'center'}),50)}}>Conferir resumo<//>

</div>`}</div>
</div>`;
}
class LimiteErro extends React.Component{constructor(p){super(p);this.state={erro:null}}static getDerivedStateFromError(e){return {erro:e.message}}render(){return this.state.erro?html`<div class="credit">${AUTORIA.credito}</div>
<main class="panel">
<h1>Não foi possível abrir estes dados</h1>
<p>${this.state.erro}</p>
<${Botao} class="btn" onClick=${()=>{if(confirm('Limpar os dados locais desta versão e abrir os exemplos?')){localStorage.removeItem(CHAVE);location.reload()}}}>Restaurar exemplos<//>

</main>`:this.props.children}}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${LimiteErro}>
<${App}/>
</${LimiteErro}>`);
