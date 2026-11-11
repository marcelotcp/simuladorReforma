/* MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton
 * Motor puro de estudo. Não emite documento fiscal nem substitui classificação fiscal.
 * Decimal.js: cálculo decimal; arredondamento comercial distinto do fiscal.
 * Todas as alíquotas, vigências e horizontes são recebidos como dados.
 */
(function(root){
 'use strict';
 const D = root.Decimal || require('./decimal.min.js');
 D.set({precision:32,rounding:D.ROUND_HALF_UP});
 const dec=x=>new D(x==null?0:x), num=x=>dec(x).toNumber();
 const dinheiro=x=>dec(x).toDecimalPlaces(2,D.ROUND_HALF_UP).toNumber();
 const teto=x=>dec(x).toDecimalPlaces(2,D.ROUND_CEIL).toNumber();
 const piso=x=>dec(x).toDecimalPlaces(2,D.ROUND_FLOOR).toNumber();
 const pct=x=>dec(x).div(100);
 const valido=x=>typeof x==='number'&&Number.isFinite(x);
 function exigir(v,m){if(!v)throw new Error(m)}
 function validarFaixas(faixas,min,max){
  const erros=[];
  if(!valido(min)||!valido(max)||min<0||max>=100||min>max)erros.push('O intervalo de descontos é inválido.');
  if(!Array.isArray(faixas)||!faixas.length)return [...erros,'Cadastre ao menos uma faixa.'];
  if(new Set(faixas.map(f=>f.de)).size!==faixas.length)erros.push('Há quantidades iniciais duplicadas nas faixas.');
  for(const f of faixas){
   if(!Number.isInteger(f.de)||f.de<1)erros.push('A quantidade inicial deve ser um inteiro positivo.');
   if(!valido(f.pct)||f.pct<min||f.pct>max)erros.push('Há desconto fora do intervalo permitido.');
  }
  return [...new Set(erros)];
 }
 function aliquotas(produto,parametro){
  const mult=produto.tratamento==='zero'?dec(0):produto.tratamento==='reduzida'?dec(parametro.fatorReduzida):dec(1);
  const a=pct(parametro.icms), c=pct(parametro.cbs).mul(mult), i=pct(parametro.ibs).mul(mult),s=produto.seletivo?pct(parametro.is):dec(0);
  for(const [v,n] of [[a,'ICMS'],[c,'CBS'],[i,'IBS'],[s,'IS']])exigir(v.gte(0)&&v.lt(1),'Alíquota de '+n+' deve estar entre 0% e menos de 100%.');
  exigir(mult.gte(0)&&mult.lte(1),'Fator de redução inválido.');
  return {a,c,i,s};
 }
 function fator(produto,parametro){
  const {a,c,i,s}=aliquotas(produto,parametro);
  // Original: comparação histórica, não regra universal de incidência cruzada.
  if(parametro.modelo==='original'){
   exigir(s.isZero(),'Modelo original aceita apenas IS não incidente. Use o modelo de bases encadeadas para estudo do IS.');
   return dec(1).plus(a.div(dec(1).minus(a))).plus(c).plus(i);
  }
  // LC 214 art.12: IBS/CBS excluídos da própria base; IS incluído quando devido.
  // LC 87 art.13 §1º I: ICMS por dentro. Inclusão IBS/CBS no ICMS é cenário
  // parametrizado por UF/vigência; referência SEFA/PR, Consulta 48/2026.
  const comIS=dec(1).plus(s), novos=c.plus(i);
  return parametro.incluirNovosNoIcms
   ?comIS.mul(dec(1).plus(novos)).div(dec(1).minus(a))
   :comIS.div(dec(1).minus(a)).plus(comIS.mul(novos));
 }
 function decompor(preco,produto,parametro){
  exigir(valido(preco)&&preco>=0,'Preço deve ser um número não negativo.');
  const {a,c,i,s}=aliquotas(produto,parametro),f=fator(produto,parametro),total=dec(preco);
  const receita=total.div(f),is=receita.mul(s),baseNova=receita.plus(is),cbs=baseNova.mul(c),ibs=baseNova.mul(i);
  const baseIcms=parametro.modelo!=='original'&&parametro.incluirNovosNoIcms?total:receita.plus(is).div(dec(1).minus(a));
  const icms=baseIcms.mul(a);
  return {f:num(f),preco,receita:num(receita),baseCbsIbs:num(baseNova),baseIcms:num(baseIcms),icms:num(icms),cbs:num(cbs),ibs:num(ibs),is:num(is),tributos:num(icms.plus(cbs).plus(ibs).plus(is)),aliquotas:{icms:num(a.mul(100)),cbs:num(c.mul(100)),ibs:num(i.mul(100)),is:num(s.mul(100))}};
 }
 function calcularProduto(p,regra,parametro,precoManual=p.preco){
  if(Array.isArray(p.tabelasPreco)&&p.tabelasPreco.length&&p.tabelaVendaId){
   const tabela=p.tabelasPreco.find(t=>t.id===p.tabelaVendaId);
   exigir(tabela,'Tabela de venda selecionada não encontrada.');
   return calcularTabela(p,tabela,regra,parametro,precoManual);
  }
  for(const k of ['cpv','frete','meta','descontoBase','mpBruta'])exigir(valido(p[k])&&p[k]>=0,'Valor inválido em '+k+'.');
  exigir(valido(regra.minMargem)&&regra.minMargem>=0&&regra.minMargem<100,'Margem mínima deve ser menor que 100%.');
  exigir(regra.baseMeta!=='operacao'||p.meta<100,'Meta sobre a operação deve ser menor que 100%.');
  const custo=dec(p.cpv).plus(p.frete),meta=pct(p.meta),desc=dec(p.descontoBase),f=fator(p,parametro);
  // Regra gerencial do autor: descontoBase reduz a receita alvo após a meta.
  // Não confundir com desconto em R$ no total cobrado: a interface mostra ambos.
  const antes=regra.baseMeta==='cpv'?custo.plus(dec(p.cpv).mul(meta)):custo.div(dec(1).minus(meta));
  exigir(desc.lte(antes),'Desconto sobre a receita excede o valor antes do desconto.');
  const alvo=antes.minus(desc),sugerido=teto(alvo.mul(f));
  const r=decompor(precoManual==null?sugerido:precoManual,p,parametro),lucro=dec(r.receita).minus(custo);
  const minimo=teto(custo.div(dec(1).minus(pct(regra.minMargem))).mul(f));
  const equilibrio=teto(custo.mul(f));
  const mOper=dec(r.receita).isZero()?0:num(lucro.div(r.receita).mul(100));
  return {...r,sugerido,alvo:num(alvo),antesDesconto:num(antes),custo:num(custo),lucro:num(lucro),mOper,mVenda:r.preco?num(lucro.div(r.preco).mul(100)):0,markup:p.cpv?num(lucro.div(p.cpv).mul(100)):null,minimo,equilibrio,descontoMax:r.preco?Math.max(0,piso(dec(1).minus(dec(minimo).div(r.preco)).mul(100))):0,descontoBase: num(desc),descontoFinalEquivalente:dinheiro(desc.mul(f)),status:p.cpv<=0?'pendente':lucro.lt(0)?'prejuizo':mOper+1e-9<regra.minMargem?'abaixo':'seguro'};
 }
 function faixa(p,q,regra){
  const erros=validarFaixas(p.faixas,regra.descMin,regra.descMax);exigir(!erros.length,erros.join(' '));
  const fs=[...p.faixas].sort((a,b)=>a.de-b.de);let ativa={de:1,pct:0};
  fs.forEach(f=>{if(q>=f.de)ativa=f});
  const proxima=fs.find(f=>f.de>q)||null;
  return {...ativa,proxima};
 }
 // LC 214 art.12: desconto do pedido tratado como incondicional nesta simulação.
 // Rateio em centavos: maiores restos, desempate pela posição do item.
 function ratear(total,subtotais,limitar=true){
  const centavos=dec(total).mul(100).toDecimalPlaces(0).toNumber(),soma=subtotais.reduce((s,v)=>s.plus(v),dec(0));
  exigir(centavos>=0&&(!limitar||dec(total).lte(soma)),'Desconto não pode ultrapassar o valor dos itens.');
  if(soma.isZero()){exigir(centavos===0,'Não é possível ratear valor adicional sobre itens de valor zero.');return subtotais.map(()=>0);}
  const partes=subtotais.map((v,k)=>{const exato=dec(centavos).mul(v).div(soma),chao=exato.floor().toNumber();return {k,chao,resto:exato.minus(chao)}});
  let faltam=centavos-partes.reduce((s,p)=>s+p.chao,0);
  [...partes].sort((a,b)=>b.resto.cmp(a.resto)||a.k-b.k).forEach(p=>{if(faltam>0){partes[p.k].chao++;faltam--}});
  return partes.map(p=>p.chao/100);
 }
 function calcularPedido(pedido,produtos,regra,parametros,ano){
  exigir(valido(pedido.desconto)&&pedido.desconto>=0,'Desconto do pedido inválido.');
  for(const k of ['outrasDespesas','ipiInformado','icmsStInformado'])exigir(pedido[k]==null||(valido(pedido[k])&&pedido[k]>=0),'Valor inválido em '+k+'.');
  exigir(pedido.itens.length>0||!(pedido.outrasDespesas||pedido.ipiInformado||pedido.icmsStInformado),'Inclua um produto antes de informar despesas ou tributos adicionais.');
  const ids=new Set();
  const iniciais=pedido.itens.map(l=>{
   exigir(!ids.has(l.produtoId),'Produto duplicado no pedido.');ids.add(l.produtoId);
   const original=produtos.find(p=>p.id===l.produtoId);exigir(original,'Produto do pedido não encontrado.');
   const p=l.tabelaId?{...original,tabelaVendaId:l.tabelaId}:original;
   exigir(Number.isInteger(l.quantidade)&&l.quantidade>0,'Quantidade deve ser inteira e positiva.');
   const par=parametros[ano];exigir(par,'Horizonte fiscal não encontrado.');
   const r=calcularProduto(p,regra,par),fxBase=faixa(p,l.quantidade,regra),tabela=p.tabelasPreco?.find(t=>t.id===p.tabelaVendaId),limiteDesconto=tabela?Math.min(regra.descMax,tabela.desconto):regra.descMax,fx={...fxBase,pctOriginal:fxBase.pct,pct:Math.min(fxBase.pct,limiteDesconto)},auto=dinheiro(dec(r.preco).mul(dec(1).minus(pct(fx.pct))));
   exigir(l.descontoPct==null||(valido(l.descontoPct)&&l.descontoPct>=0&&l.descontoPct<100),'Desconto do item deve ficar entre 0% e menos de 100%.');
   const precoDigitado=l.preco??r.preco;exigir(valido(precoDigitado)&&precoDigitado>=0,'Preço do item inválido.');
   const praticado=l.descontoPct==null?(l.preco==null?auto:l.preco):dinheiro(dec(precoDigitado).mul(dec(1).minus(pct(l.descontoPct))));
   const brutoItem=dinheiro(dec(l.descontoPct==null&&l.preco==null?r.preco:precoDigitado).mul(l.quantidade)),subtotal=dinheiro(dec(praticado).mul(l.quantidade));
   return {p,l,par,r,fx,limiteDesconto,auto,precoDigitado,praticado,brutoItem,descontoItem:dinheiro(dec(brutoItem).minus(subtotal)),subtotal};
  });
  const rateios=ratear(pedido.desconto,iniciais.map(x=>x.subtotal));
  const rateiosOutras=ratear(pedido.outrasDespesas||0,iniciais.map(x=>x.subtotal),false);
  const itens=iniciais.map((x,k)=>{
   const final=dinheiro(dec(x.subtotal).minus(rateios[k]).plus(rateiosOutras[k])),unitario=dec(final).div(x.l.quantidade),r=calcularProduto(x.p,regra,x.par,num(unitario));
   const unitarioComercial=dec(x.subtotal).minus(rateios[k]).div(x.l.quantidade);
   const desconto=x.r.preco?num(dec(1).minus(unitarioComercial.div(x.r.preco)).mul(100)):0;
   return {...x,final,rateio:rateios[k],rateioOutras:rateiosOutras[k],unitarioFinal:num(unitario),resultado:r,descontoEfetivo:desconto,foraIntervalo:desconto>x.limiteDesconto+1e-7||(desconto>0&&desconto<regra.descMin-1e-7)};
  });
  const somar=f=>num(itens.reduce((s,x)=>s.plus(f(x)),dec(0))),totalOperacao=dinheiro(somar(x=>x.final)),total=dinheiro(dec(totalOperacao).plus(pedido.ipiInformado||0).plus(pedido.icmsStInformado||0)),receita=somar(x=>dec(x.resultado.receita).mul(x.l.quantidade)),lucro=somar(x=>dec(x.resultado.lucro).mul(x.l.quantidade));
  const custo=somar(x=>dec(x.resultado.custo).mul(x.l.quantidade)),cpv=somar(x=>dec(x.resultado.cpv??x.p.cpv).mul(x.l.quantidade)),frete=somar(x=>dec(x.resultado.frete??x.p.frete).mul(x.l.quantidade));
  const impostos=Object.fromEntries(['icms','cbs','ibs','is','simples','operacional','comissao'].map(k=>[k,somar(x=>dec(x.resultado[k]||0).mul(x.l.quantidade))]));
  const margem=receita?num(dec(lucro).div(receita).mul(100)):0;
  const folga=somar(x=>dec(x.final).minus(dec(x.resultado.minimo).mul(x.l.quantidade)));
  return {itens,total,totalOperacao,outrasDespesas:pedido.outrasDespesas||0,ipi:pedido.ipiInformado||0,icmsSt:pedido.icmsStInformado||0,brutoItens:somar(x=>x.brutoItem),descontoItens:somar(x=>x.descontoItem),descontoTotal:dinheiro(dec(somar(x=>x.descontoItem)).plus(pedido.desconto)),semReforma:dinheiro(dec(total).minus(impostos.cbs).minus(impostos.ibs)),reforma:dinheiro(dec(impostos.cbs).plus(impostos.ibs)),receita,lucro,custo,cpv,frete,...impostos,mOper:margem,mVenda:total?lucro/total*100:0,markup:cpv?lucro/cpv*100:null,quantidade:somar(x=>x.l.quantidade),tabela:somar(x=>dec(x.r.preco).mul(x.l.quantidade)),descontoMaxAdicional:Math.max(0,piso(folga)),status:!itens.length?'vazio':itens.some(x=>x.resultado.status==='pendente')?'pendente':itens.some(x=>x.resultado.lucro<0)?'prejuizo':itens.some(x=>x.resultado.status==='abaixo'||x.foraIntervalo)?'abaixo':'seguro'};
 }
 function calcularCaixa(venda,creditos,caixa){
  for(const v of Object.values(creditos))exigir(valido(v)&&v>=0,'Crédito informado inválido.');
  for(const k of ['cobertura','percentualSimplificado'])exigir(valido(caixa[k])&&caixa[k]>=0&&caixa[k]<=100,'Percentual do split deve estar entre 0% e 100%.');
  for(const k of ['extintoCbs','extintoIbs','volume'])exigir(valido(caixa[k])&&caixa[k]>=0,'Dados de caixa inválidos.');
  const c=dec(venda.cbs),i=dec(venda.ibs);
  // LC 214 art.32 §3º: débitos já extintos não são retidos novamente.
  // Crédito disponível não é automaticamente débito extinto desta operação.
  const padrao=D.max(0,c.minus(caixa.extintoCbs)).plus(D.max(0,i.minus(caixa.extintoIbs)));
  // Art.33: percentual oficial deve ser configurado; valor inicial é hipotético.
  const ret=caixa.modo==='desligado'?dec(0):caixa.modo==='simplificado'?dec(venda.preco??venda.total).mul(pct(caixa.percentualSimplificado)):padrao;
  const retido=dinheiro(ret.mul(pct(caixa.cobertura))),total=venda.preco??venda.total;
  exigir(retido<=total,'Retenção simulada excede o recebimento.');
  return {retido,deposito:dinheiro(dec(total).minus(retido)),gapComparativo:dinheiro(dec(retido).minus(creditos.cbs).minus(creditos.ibs)),gapMensal:dinheiro(dec(retido).minus(creditos.cbs).minus(creditos.ibs).mul(caixa.volume)),saldoCbs:num(c.minus(creditos.cbs)),saldoIbs:num(i.minus(creditos.ibs)),saldoIcms:num(dec(venda.icms).minus(creditos.icms))};
 }
 function validarImportacao(o){
  exigir(o&&o.versao===4,'Versão de dados não suportada.');
  exigir(o.autoria&&o.autoria.criador==='MARCELO CLEITON','Autoria ausente ou incompatível.');
  exigir(['interno','comercial'].includes(o.tipo),'Tipo de pacote inválido.');
  exigir(Array.isArray(o.produtos)&&o.produtos.length>0&&o.produtos.length<=500,'Catálogo inválido.');
  exigir(new Set(o.produtos.map(p=>p.id)).size===o.produtos.length,'Identificadores duplicados.');
  exigir(o.regra&&o.parametros&&Object.keys(o.parametros).length>0,'Regras ou parâmetros ausentes.');
  const r=o.regra;exigir(['cpv','operacao'].includes(r.baseMeta)&&valido(r.minMargem)&&r.minMargem>=0&&r.minMargem<100,'Regra de margem inválida.');
  for(const [ano,par] of Object.entries(o.parametros)){
   exigir(/^\d{4}$/.test(ano)&&par&&['encadeado','original'].includes(par.modelo),'Horizonte ou modelo inválido.');
   exigir(['icms','cbs','ibs','is'].every(k=>valido(par[k])&&par[k]>=0&&par[k]<100),'Alíquotas inválidas.');
   exigir(valido(par.fatorReduzida)&&par.fatorReduzida>=0&&par.fatorReduzida<=1&&typeof par.incluirNovosNoIcms==='boolean','Parâmetro de base inválido.');
   exigir(typeof par.fonte==='string'&&typeof par.inicio==='string'&&typeof par.atualizado==='string','Metadados fiscais ausentes.');
  }
  for(const p of o.produtos){
   exigir(typeof p.id==='string'&&p.id.length<100&&typeof p.nome==='string'&&p.nome.length<=160&&typeof p.unidade==='string','Produto inválido.');
   exigir(!validarFaixas(p.faixas,r.descMin,r.descMax).length,'Faixas inválidas no produto '+p.nome+'.');
   exigir(['padrao','reduzida','zero'].includes(p.tratamento),'Tratamento inválido.');
   if(o.tipo==='interno'){
    if(p.tabelasPreco){
     exigir(Array.isArray(p.tabelasPreco)&&p.tabelasPreco.length>0&&p.tabelasPreco.length<=100,'Grade de tabelas inválida.');
     exigir(new Set(p.tabelasPreco.map(t=>t.id)).size===p.tabelasPreco.length,'Tabelas duplicadas.');
     exigir(p.entrada&&['custoBruto','desconto','creditoIcms','creditoCbs','creditoIbs','pesoKg','quantidade','estoque'].every(k=>valido(p.entrada[k])&&p.entrada[k]>=0),'Dados de entrada inválidos.');
     exigir(p.tabelasPreco.some(t=>t.id===p.tabelaVendaId),'Tabela de venda ausente.');
     for(const t of p.tabelasPreco){
      exigir(typeof t.nome==='string'&&t.nome.length<=100&&typeof t.id==='string','Identificação da tabela inválida.');
      exigir(['regular','simples'].includes(t.regime)&&['desconto','margem','simples','operacional','comissao'].every(k=>valido(t[k])&&t[k]>=0&&t[k]<100)&&valido(t.freteTonelada)&&t.freteTonelada>=0,'Percentuais ou frete da tabela inválidos.');
      exigir(t.precoConsumidor==null||(valido(t.precoConsumidor)&&t.precoConsumidor>=0),'Preço consumidor inválido.');
      for(const v of Object.values(t.fiscal||{}))exigir(['icms','cbs','ibs','is'].every(k=>valido(v[k])&&v[k]>=0&&v[k]<100),'Alíquota efetiva da tabela inválida.');
     }
     // Backup de rascunho conserva pendências de peso/viabilidade para correção.
     // Publicação comercial exige cálculo válido e política respeitada na interface.

    }
    exigir(p.creditos&&p.clienteCredito&&p.caixa,'Dados de créditos ou caixa ausentes.');
    exigir(['icms','cbs','ibs'].every(k=>valido(p.creditos[k])&&p.creditos[k]>=0&&valido(p.clienteCredito[k])&&p.clienteCredito[k]>=0),'Créditos inválidos.');
    exigir(valido(p.clienteMarkup)&&p.clienteMarkup>=0,'Markup de cliente inválido.');
    exigir(['desligado','padrao','simplificado'].includes(p.caixa.modo),'Procedimento de split inválido.');
    if(!p.tabelasPreco)for(const par of Object.values(o.parametros)){
     const res=calcularProduto(p,r,par);calcularCaixa(res,p.creditos,p.caixa);
    }
   }
   else exigir(valido(p.precoComercial)&&p.precoComercial>=0&&valido(p.pisoComercial)&&p.pisoComercial>=0,'Preço comercial inválido.');
  }
  if(o.pedido){
   for(const k of ['outrasDespesas','ipiInformado','icmsStInformado'])exigir(o.pedido[k]==null||(valido(o.pedido[k])&&o.pedido[k]>=0),'Adicional do pedido inválido.');
   exigir(Array.isArray(o.pedido.itens)&&typeof o.pedido.cliente==='string'&&Number.isInteger(o.pedido.prazo)&&o.pedido.prazo>=0&&o.pedido.prazo<=365,'Pedido do backup inválido.');
   if(o.tipo==='interno'&&!o.produtos.some(p=>p.tabelasPreco))calcularPedido(o.pedido,o.produtos,o.regra,o.parametros,o.parametros[o.ano]?o.ano:Object.keys(o.parametros)[0]);
   else if(o.tipo==='interno')for(const l of o.pedido.itens)exigir((l.descontoPct==null||(valido(l.descontoPct)&&l.descontoPct>=0&&l.descontoPct<100))&&o.produtos.some(p=>p.id===l.produtoId)&&Number.isInteger(l.quantidade)&&l.quantidade>0&&(l.preco==null||(valido(l.preco)&&l.preco>=0)),'Item do backup inválido.');
   else calcularPedidoComercial(o.pedido,o.produtos,o.regra);
  }
  return true;
 }
 function calcularPedidoComercial(pedido,produtos,regra){
  const itens=pedido.itens.map(l=>{
   const p=produtos.find(p=>p.id===l.produtoId);exigir(p,'Produto não encontrado.');
   exigir(Number.isInteger(l.quantidade)&&l.quantidade>0,'Quantidade inválida.');
   const fxBase=faixa(p,l.quantidade,regra),limiteDesconto=p.descontoTabela==null?regra.descMax:Math.min(regra.descMax,p.descontoTabela),fx={...fxBase,pctOriginal:fxBase.pct,pct:Math.min(fxBase.pct,limiteDesconto)},auto=dinheiro(dec(p.precoComercial).mul(dec(1).minus(pct(fx.pct))));
   const praticado=l.preco==null?auto:l.preco;exigir(valido(praticado)&&praticado>=0,'Preço inválido.');
   return {p,l,fx,limiteDesconto,auto,praticado,subtotal:dinheiro(dec(praticado).mul(l.quantidade))};
  });
  const rateios=ratear(pedido.desconto,itens.map(x=>x.subtotal));
  const finais=itens.map((x,k)=>{
   const final=dinheiro(dec(x.subtotal).minus(rateios[k])),unitarioFinal=num(dec(final).div(x.l.quantidade)),descontoEfetivo=x.p.precoComercial?(1-unitarioFinal/x.p.precoComercial)*100:0;
   return {...x,final,unitarioFinal,rateio:rateios[k],descontoEfetivo,foraIntervalo:descontoEfetivo>x.limiteDesconto+1e-7||(descontoEfetivo>0&&descontoEfetivo<regra.descMin-1e-7),bloqueado:unitarioFinal+1e-9<x.p.pisoComercial};
  });
  return {itens:finais,total:dinheiro(finais.reduce((s,x)=>s.plus(x.final),dec(0))),quantidade:finais.reduce((s,x)=>s+x.l.quantidade,0),status:!finais.length?'vazio':finais.some(x=>x.bloqueado||x.foraIntervalo)?'abaixo':'seguro'};
 }
 function calcularEntrada(p){
  if(!p.entrada)return {custoBruto:p.cpv,creditoTotal:0,custoLiquido:p.cpv,pesoKg:0,quantidade:0,estoque:0};
  const e=p.entrada;
  for(const k of ['custoBruto','desconto','creditoIcms','creditoCbs','creditoIbs','pesoKg','quantidade','estoque'])exigir(valido(e[k])&&e[k]>=0,'Entrada: valor inválido em '+k+'.');
  const creditos=dec(e.creditoIcms).plus(e.creditoCbs).plus(e.creditoIbs),liquido=dec(e.custoBruto).minus(e.desconto).minus(creditos);
  exigir(liquido.gte(0),'Créditos e desconto da entrada superam o custo bruto.');
  return {...e,creditoTotal:num(creditos),custoLiquido:num(liquido)};
 }
 function fiscalTabela(p,t,parametro){
  const ano=String(parametro.inicio).slice(0,4),override=t.fiscal?.[ano];
  const mult=p.tratamento==='zero'?0:p.tratamento==='reduzida'?parametro.fatorReduzida:1;
  const efetivas={a:dec(parametro.icms).div(100),c:dec(parametro.cbs).mul(mult).div(100),i:dec(parametro.ibs).mul(mult).div(100),s:dec(p.seletivo?parametro.is:0).div(100)};
  const taxas=override?{icms:override.icms,cbs:override.cbs,ibs:override.ibs,is:override.is}:{icms:num(efetivas.a.mul(100)),cbs:num(efetivas.c.mul(100)),ibs:num(efetivas.i.mul(100)),is:num(efetivas.s.mul(100))};
  return {ano,taxas,alterado:!!override,fonte:override?.fonte||parametro.fonte,atualizado:override?.atualizado||parametro.atualizado};
 }
 function calcularTabela(p,t,regra,parametro,override=null){
  for(const k of ['desconto','margem','simples','operacional','comissao','freteTonelada'])exigir(valido(t[k])&&t[k]>=0,'Tabela '+t.nome+': valor inválido em '+k+'.');
  for(const k of ['desconto','margem','simples','operacional','comissao'])exigir(t[k]<100,'Tabela '+t.nome+': '+k+' deve ser menor que 100%.');
  exigir(valido(regra.minMargem)&&regra.minMargem>=0&&regra.minMargem<100,'Margem mínima inválida.');
  exigir(['regular','simples'].includes(t.regime),'Composição tributária inválida.');
  const entrada=calcularEntrada(p),cpv=dec(entrada.custoLiquido),peso=dec(entrada.pesoKg);
  exigir(!t.fretePendente||peso.gt(0),'Informe o peso: há frete unitário da versão anterior que não pode ser convertido para tonelada.');
  exigir(t.freteTonelada===0||peso.gt(0),'Informe o peso da unidade de venda para calcular o frete por tonelada.');
  const frete=dec(t.freteTonelada).mul(peso).div(1000),custo=cpv.plus(frete),fiscal=fiscalTabela(p,t,parametro);
  exigir(fiscal.alterado||p.tratamento!=='reduzida'||(valido(parametro.fatorReduzida)&&parametro.fatorReduzida>=0&&parametro.fatorReduzida<=1),'Fator de redução inválido.');
  const contexto={...parametro,...fiscal.taxas},produtoFiscal={...p,tratamento:'padrao',seletivo:fiscal.taxas.is>0};
  // A taxa do Simples é a efetiva total informada pelo responsável, não é
  // derivada de anexo/RBT12. LC 123 art.13 e LC 214 art.41: composição alternativa.
  // Não somar DAS total com os mesmos tributos novamente. Cenário híbrido fora do escopo.
  exigir(t.regime!=='simples'||fiscal.taxas.is===0,'IS fora do DAS exige tratamento específico. Este cenário simplificado não o calcula.');
  const f=t.regime==='simples'?dec(1).div(dec(1).minus(pct(t.simples))):fator(produtoFiscal,contexto);
  const despesa=pct(t.operacional).plus(pct(t.comissao)),m=pct(t.margem),d=pct(t.desconto),um=dec(1),fracao=um.div(f);
  // Política comercial explícita: despesas sobre preço efetivamente praticado.
  // A tabela protege a meta mesmo após o desconto máximo: gross-up comercial.
  const denom=regra.baseMeta==='cpv'?fracao.minus(despesa):um.minus(m).div(f).minus(despesa);
  exigir(denom.gt(0),'A combinação de tributos, despesas e margem não permite formar um preço. Reduza os percentuais.');
  const alvoPraticado=(regra.baseMeta==='cpv'?custo.plus(cpv.mul(m)):custo).div(denom);
  const sugerido=teto(alvoPraticado.div(um.minus(d)));
  const consumidor=override!=null?override:t.precoConsumidor==null?sugerido:t.precoConsumidor;
  exigir(valido(consumidor)&&consumidor>=0,'Preço consumidor deve ser não negativo.');
  const preco=dec(consumidor),receita=preco.div(f),operacional=preco.mul(pct(t.operacional)),comissao=preco.mul(pct(t.comissao)),lucro=receita.minus(custo).minus(operacional).minus(comissao);
  const dd=um.minus(pct(regra.minMargem)).div(f).minus(despesa);
  exigir(dd.gt(0),'A margem mínima é inviável com estes tributos e despesas.');
  const pisoTecnico=teto(custo.div(dd)),equilibrio=teto(custo.div(fracao.minus(despesa)));
  const minimoComercial=dinheiro(preco.mul(um.minus(d))),receitaMin=dec(minimoComercial).div(f),lucroMin=receitaMin.minus(custo).minus(dec(minimoComercial).mul(despesa));
  const decomposicao=t.regime==='simples'?{icms:0,cbs:0,ibs:0,is:0,baseCbsIbs:0,baseIcms:0,tributos:num(preco.minus(receita)),aliquotas:{icms:0,cbs:0,ibs:0,is:0}}:decompor(consumidor,produtoFiscal,contexto);
  const margem=receita.gt(0)?num(lucro.div(receita).mul(100)):0,margemMin=receitaMin.gt(0)?num(lucroMin.div(receitaMin).mul(100)):0;
  return {...decomposicao,preco:consumidor,precoConsumidor:consumidor,precoReforma:num(receita),receita:num(receita),precoMinimoComercial:minimoComercial,sugerido,f:num(f),alvo:num(alvoPraticado.div(f)),antesDesconto:num(alvoPraticado.div(f)),custo:num(custo),cpv:num(cpv),frete:num(frete),pesoKg:num(peso),operacional:num(operacional),comissao:num(comissao),simples:t.regime==='simples'?num(preco.minus(receita)):0,lucro:num(lucro),mOper:margem,mVenda:preco.gt(0)?num(lucro.div(preco).mul(100)):0,markup:cpv.gt(0)?num(lucro.div(cpv).mul(100)):null,minimo:pisoTecnico,pisoTecnico,equilibrio,margemNoMinimo:margemMin,lucroNoMinimo:num(lucroMin),descontoMax:preco.gt(0)?Math.max(0,piso(um.minus(dec(pisoTecnico).div(preco)).mul(100))):0,descontoBase:0,descontoFinalEquivalente:0,status:cpv.lte(0)?'pendente':lucro.lt(0)?'prejuizo':margem+1e-9<regra.minMargem?'abaixo':'seguro',statusMinimo:cpv.lte(0)?'pendente':lucroMin.lt(0)?'prejuizo':margemMin+1e-9<regra.minMargem?'abaixo':'seguro',fiscalTabela:fiscal,tabelaId:t.id,percentuais:{desconto:t.desconto,margem:t.margem,operacional:t.operacional,comissao:t.comissao,simples:t.simples},denominador:num(denom),despesasFracao:num(despesa)};
 }
 const api={dinheiro,teto,piso,validarFaixas,aliquotas,fator:(p,s)=>num(fator(p,s)),decompor,calcularProduto,faixa,ratear,calcularPedido,calcularPedidoComercial,calcularCaixa,validarImportacao,calcularEntrada,fiscalTabela,calcularTabela};
 root.Motor=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
