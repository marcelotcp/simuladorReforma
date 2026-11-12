/* MARCELO CLEITON · © 2026. Auditoria matemática dos cenários gerenciais. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../src/motor.js'),D=require('../src/decimal.min.js');
const ctx={Motor:M};vm.createContext(ctx);
for(const f of ['dados.js','grade-dados.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),ctx);
const inicial=()=>JSON.parse(JSON.stringify(vm.runInContext('migrarGrade(estadoInicial())',ctx)));
const money=x=>new D(x).toDecimalPlaces(2,D.ROUND_HALF_UP).toNumber();
const perto=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const resultados=[];let cenarios=0;
function teste(id,fn){fn();resultados.push({id,situacao:'OK'});console.log(id+' OK');}
function pedidoExemplo(){const s=inicial();s.regra.modoPrecificacao='sem_cbs_ibs';return M.calcularPedido({desconto:0,itens:[{produtoId:'p1',tabelaId:'padrao',quantidade:10,preco:76.22,descontoPct:0}]},s.produtos,s.regra,s.parametros,s.ano);}
function conferirConciliacao(c){perto(money(c.comercial+c.parcelas.reduce((s,p)=>s+p.valor,0)+c.ajuste),c.projetado);perto(money(c.projetado-c.comercial),c.acrescimo);}
// Oráculo de rateio com inteiros/BigInt, independente do Decimal do motor.
function rateioInteiro(total,subtotais){const cents=BigInt(Math.round(money(total)*100)),pesos=subtotais.map(v=>BigInt(Math.round(v*100))),soma=pesos.reduce((s,v)=>s+v,0n);if(!soma)return pesos.map(()=>0);const partes=pesos.map((v,i)=>({i,q:cents*v/soma,r:cents*v%soma}));let sobra=cents-partes.reduce((s,p)=>s+p.q,0n);for(const p of [...partes].sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1)){if(sobra<=0n)break;p.q++;sobra--;}return partes.map(p=>Number(p.q)/100);}
teste('A01: caso da captura fecha 739,30 → 822,84, com tributos da mesma origem',()=>{
 const r=pedidoExemplo(),i=r.itens[0],f=i.resultado.projecaoReforma;
 assert.equal(r.total,739.30);assert.equal(r.totalReforma,822.84);assert.equal(r.acrescimoReforma,83.54);
 assert.equal(money(r.cbs),67.90);assert.equal(money(r.ibs),.61);assert.equal(r.reforma,68.50);
 perto(f.preco*i.l.quantidade,822.84);perto(f.icms*i.l.quantidade,148.1112);
 conferirConciliacao(r.conciliacaoReforma);conferirConciliacao(i.conciliacaoReforma);
 assert.equal(r.conciliacaoReforma.ajuste,-.01);
});
teste('A02: bases, tributos e conciliação do item usam o total projetado fechado',()=>{
 const r=pedidoExemplo(),i=r.itens[0],f=i.resultado.projecaoReforma;
 const memoria=M.memoriaTributos(f,inicial().parametros['2027'],10);
 for(const l of memoria)perto(l.valorItem,r[l.chave]);
 const ponte=M.conciliarPrecoBase(f,10);perto(ponte.etapas[0].valorItem,i.totalReforma);
 perto(f.receita+f.icms+f.cbs+f.ibs+f.is,f.preco);
});
teste('A03: matriz de 384 cenários confere fatores, preços, despesas e margens por equações independentes',()=>{
 for(const ano of ['2026','2027','2029','2033'])for(const modelo of ['encadeado','original'])for(const incluir of [false,true])for(const modo of ['atual','sem_cbs_ibs'])for(const tratamento of ['padrao','reduzida','zero'])for(const simples of [false,true])for(const despesas of [false,true]){
  const s=inicial(),p=s.produtos[0],t=p.tabelasPreco[0];p.tratamento=tratamento;p.faixas=[{de:1,pct:0}];p.seletivo=!simples&&modelo!=='original';
  t.regime=simples?'simples':'regular';t.simples=6;t.operacional=despesas?2.7:0;t.comissao=despesas?1.3:0;
  const par={...s.parametros[ano],modelo,incluirNovosNoIcms:incluir,is:p.seletivo?7:0},regra={...s.regra,modoPrecificacao:modo};
  const preco=money(97.13+cenarios/100),qtd=7,desconto=.13,outras=.29;
  const r=M.calcularPedido({desconto,outrasDespesas:outras,ipiInformado:2,icmsStInformado:3,itens:[{produtoId:p.id,tabelaId:t.id,quantidade:qtd,preco}]},[p],regra,{[ano]:par},ano),item=r.itens[0];
  const mult=tratamento==='zero'?0:tratamento==='reduzida'?par.fatorReduzida:1;
  const a=new D(par.icms).div(100),c=new D(par.cbs).mul(mult).div(100),b=new D(par.ibs).mul(mult).div(100),seletivo=new D(par.is).div(100);
  const fator=(c,b)=>modelo==='original'?new D(1).plus(a.div(new D(1).minus(a))).plus(c).plus(b):incluir?new D(1).plus(seletivo).mul(new D(1).plus(c).plus(b)).div(new D(1).minus(a)):new D(1).plus(seletivo).div(new D(1).minus(a)).plus(new D(1).plus(seletivo).mul(c.plus(b)));
  const integral=simples?new D(1).div(.94):fator(c,b),comercial=simples||modo==='atual'?integral:fator(new D(0),new D(0));
  const final=new D(preco).mul(qtd).minus(desconto).plus(outras),projetado=simples||modo==='atual'?money(final):money(final.div(comercial).mul(integral));
  assert.equal(item.final,money(final));assert.equal(item.totalReforma,projetado);assert.equal(r.totalReforma,money(projetado+5));
  const receita=final.div(comercial),custo=new D(p.entrada.custoBruto).minus(p.entrada.desconto).minus(p.entrada.creditoIcms).minus(p.entrada.creditoCbs).minus(p.entrada.creditoIbs).plus(new D(t.freteTonelada).mul(p.entrada.pesoKg).div(1000)).mul(qtd);
  const lucro=receita.minus(custo).minus(final.mul(new D(t.operacional).plus(t.comissao).div(100)));
  perto(r.lucro,Number(lucro));perto(r.mOper,Number(lucro.div(receita).mul(100)));
  const f=item.resultado.projecaoReforma||item.resultado;
  perto((f.receita+f.icms+f.cbs+f.ibs+f.is+(f.simples||0))*qtd,projetado);
  conferirConciliacao(item.conciliacaoReforma);conferirConciliacao(r.conciliacaoReforma);
  cenarios++;
 }
 assert.equal(cenarios,384);
});
teste('A04: rateios de desconto e despesas coincidem com oráculo inteiro em 500 casos',()=>{
 for(let k=1;k<=500;k++){const pesos=[money(k*.37),money(k*.19+.01),money(k*.61+.02)],total=money(k*.07);assert.deepEqual(M.ratear(total,pesos),rateioInteiro(total,pesos));assert.deepEqual(M.ratear(total*2,pesos,false),rateioInteiro(total*2,pesos));}
 assert.throws(()=>M.ratear(-1,[1]));assert.throws(()=>M.ratear(1,[-1,2]));assert.throws(()=>M.ratear(1,[NaN]));
});
teste('A05: dinheiro informado com mais casas fecha uma única vez e não gera desconto negativo',()=>{
 const s=inicial();s.produtos[0].faixas=[{de:1,pct:0}];
 const r=M.calcularPedido({desconto:.005,outrasDespesas:.335,ipiInformado:.005,icmsStInformado:.005,itens:[{produtoId:'p1',quantidade:3,preco:.015}]},s.produtos,s.regra,s.parametros,s.ano);
 assert.equal(r.brutoItens,.06);assert.equal(r.descontoItens,0);assert.equal(r.descontoGeral,.01);assert.equal(r.outrasDespesas,.34);assert.equal(r.ipi,.01);assert.equal(r.icmsSt,.01);assert.equal(r.total,.41);
});
teste('A06: pedidos mistos conciliam parcelas e não projetam IPI/ST duas vezes',()=>{
 const s=inicial();s.regra.modoPrecificacao='sem_cbs_ibs';s.produtos[1].tratamento='zero';
 const q={desconto:.31,outrasDespesas:.77,ipiInformado:17,icmsStInformado:23,itens:[{produtoId:'p1',quantidade:23,preco:76.22},{produtoId:'p2',quantidade:11,preco:110.17}]};
 const r=M.calcularPedido(q,s.produtos,s.regra,s.parametros,s.ano);
 assert.equal(r.totalReforma,money(r.itens.reduce((s,i)=>s+i.totalReforma,0)+40));
 assert.equal(r.total,money(r.brutoItens-r.descontoTotal+r.outrasDespesas+r.ipi+r.icmsSt));
 conferirConciliacao(r.conciliacaoReforma);for(const i of r.itens)conferirConciliacao(i.conciliacaoReforma);
 perto(r.itens[1].resultado.projecaoReforma.cbs,0);perto(r.itens[1].resultado.projecaoReforma.ibs,0);
});
teste('A07: caixa e split usam faturamento projetado e não CBS/IBS comerciais zerados',()=>{
 const s=inicial();s.regra.modoPrecificacao='sem_cbs_ibs';const p=s.produtos[0],r=M.calcularProduto(p,s.regra,s.parametros[s.ano]);
 const caixa=M.calcularCaixa(r,{icms:0,cbs:0,ibs:0},{...p.caixa,modo:'padrao',cobertura:100,extintoCbs:0,extintoIbs:0});
 assert.equal(caixa.retido,money(r.projecaoReforma.cbs+r.projecaoReforma.ibs));assert.ok(caixa.retido>0);assert.equal(money(caixa.retido+caixa.deposito),r.precoReforma);
 assert.throws(()=>M.calcularCaixa(r,p.creditos,{...p.caixa,modo:'invalido'}));
});
teste('A08: sugerido e piso protegem metas com frete, créditos e despesas nos dois modos',()=>{
 for(const modo of ['atual','sem_cbs_ibs'])for(const base of ['cpv','operacao'])for(let k=1;k<=60;k++){
  const s=inicial(),p=s.produtos[0],t={...p.tabelasPreco[0],margem:15,desconto:3,operacional:k/30,comissao:1,precoConsumidor:null},reg={...s.regra,baseMeta:base,modoPrecificacao:modo};
  p.entrada={...p.entrada,custoBruto:k+20,creditoIcms:1,creditoCbs:2,creditoIbs:0,desconto:1};
  const r=M.calcularTabela(p,t,reg,s.parametros[s.ano]),aplicado=M.calcularTabela(p,t,reg,s.parametros[s.ano],r.precoMinimoComercial);
  if(base==='cpv')assert.ok(aplicado.lucro+1e-8>=r.cpv*.15);else assert.ok(aplicado.mOper+1e-8>=15);
  assert.equal(M.calcularTabela(p,t,reg,s.parametros[s.ano],r.minimo).status,'seguro');
 }
});
teste('A09: modelo e modalidade desconhecidos não geram cálculo silencioso',()=>{
 const s=inicial(),p=s.produtos[0],t=p.tabelasPreco[0],par=s.parametros[s.ano];assert.throws(()=>M.calcularTabela(p,t,{...s.regra,modoPrecificacao:'invalido'},par),/Modalidade/);assert.throws(()=>M.calcularTabela(p,t,s.regra,{...par,modelo:'invalido'}),/Modelo/);
});
teste('A10: limites de meio centavo usam multiplicador decimal sem fatores serializados',()=>{
 for(const modelo of ['original','encadeado'])for(const incluir of [false,true])for(const cbs of [0.9,1,11.2])for(const preco of [.01,.50,1.50,5,15,25,75,123.45]){
  const s=inicial(),p=s.produtos[0];p.faixas=[{de:1,pct:0}];s.regra.modoPrecificacao='sem_cbs_ibs';const par={...s.parametros[s.ano],modelo,incluirNovosNoIcms:incluir,cbs,ibs:0};
  const novos=new D(cbs).div(100),multiplicador=modelo==='encadeado'&&incluir?new D(1).plus(novos):new D(1).plus(new D('.82').mul(novos));
  const esperado=money(new D(preco).mul(multiplicador)),r=M.calcularPedido({desconto:0,itens:[{produtoId:'p1',quantidade:1,preco}]},[p],s.regra,{[s.ano]:par},s.ano);assert.equal(r.totalReforma,esperado);
 }
});
fs.writeFileSync(path.join(__dirname,'resultados-auditoria.json'),JSON.stringify({autoria:'MARCELO CLEITON',escopo:'Conferência matemática do modelo configurado; não certifica legislação ou emissão fiscal.',cenarios,rateiosConferidos:1000,formacoesConferidas:240,resultados},null,2));
console.log(resultados.length+' grupos de auditoria aprovados; '+cenarios+' cenários de operação.');
