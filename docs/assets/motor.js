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
  exigir(['original','encadeado'].includes(parametro.modelo),'Modelo tributário inválido.');
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
  exigir(valido(total)&&total>=0&&Array.isArray(subtotais)&&subtotais.every(v=>valido(v)&&v>=0),'Valores inválidos para rateio.');
  const centavos=dec(total).mul(100).toDecimalPlaces(0).toNumber(),soma=subtotais.reduce((s,v)=>s.plus(v),dec(0));
  exigir(centavos>=0&&(!limitar||dec(total).lte(soma)),'Desconto não pode ultrapassar o valor dos itens.');
  if(soma.isZero()){exigir(centavos===0,'Não é possível ratear valor adicional sobre itens de valor zero.');return subtotais.map(()=>0);}
  const partes=subtotais.map((v,k)=>{const exato=dec(centavos).mul(v).div(soma),chao=exato.floor().toNumber();return {k,chao,resto:exato.minus(chao)}});
  let faltam=centavos-partes.reduce((s,p)=>s+p.chao,0);
  [...partes].sort((a,b)=>b.resto.cmp(a.resto)||a.k-b.k).forEach(p=>{if(faltam>0){partes[p.k].chao++;faltam--}});
  return partes.map(p=>p.chao/100);
 }
 // Política comercial do projeto: faixa por quantidade tem precedência.
 // Atingiu uma faixa com desconto: aplica diretamente, mesmo com desconto do
 // item em zero. Sem faixa aplicável, usa o desconto manual do item. Não acumula.
 // O limite da tabela restringe o desconto manual; a faixa segue o limite global
 // do produto e a margem resultante continua sendo validada separadamente.
 function descontoPedido(p,l,regra,precoTabela,limiteManual){
  const fxBase=faixa(p,l.quantidade,regra),fx={...fxBase,pctOriginal:fxBase.pct,pct:Math.min(fxBase.pct,regra.descMax)};
  exigir(l.descontoPct==null||(valido(l.descontoPct)&&l.descontoPct>=0&&l.descontoPct<100),'Desconto do item deve ficar entre 0% e menos de 100%.');
  exigir(l.descontoModo==null||['automatico','manual'].includes(l.descontoModo),'Modo de desconto do item inválido.');
  // Versões anteriores guardavam o percentual da faixa em descontoPct no modo
  // automático: esse valor é um cache legado, não um desconto manual adicional.
  const descontoInformadoPct=l.descontoModo==='automatico'?0:(l.descontoPct??0),descontoAutomatico=fx.pct>0;
  const descontoAplicadoPct=descontoAutomatico?fx.pct:descontoInformadoPct;
  const origemDesconto=descontoAutomatico?'quantidade':descontoInformadoPct>0?'item':'nenhum';
  const informado=l.preco??precoTabela;exigir(valido(informado)&&informado>=0,'Preço do item inválido.');
  const precoDigitado=dinheiro(informado);
  const praticado=dinheiro(dec(precoDigitado).mul(dec(1).minus(pct(descontoAplicadoPct))));
  const brutoItem=dinheiro(dec(precoDigitado).mul(l.quantidade)),subtotal=dinheiro(dec(praticado).mul(l.quantidade));
  return {fx,limiteDesconto:descontoAutomatico?regra.descMax:limiteManual,limiteDescontoManual:limiteManual,auto:dinheiro(dec(precoTabela).mul(dec(1).minus(pct(fx.pct)))),descontoAutomatico,origemDesconto,descontoInformadoPct,descontoAplicadoPct,precoDigitado,praticado,brutoItem,descontoItem:dinheiro(dec(brutoItem).minus(subtotal)),subtotal};
 }
 function calcularPedido(pedido,produtos,regra,parametros,ano){
  exigir(valido(pedido.desconto)&&pedido.desconto>=0,'Desconto do pedido inválido.');
  for(const k of ['outrasDespesas','ipiInformado','icmsStInformado'])exigir(pedido[k]==null||(valido(pedido[k])&&pedido[k]>=0),'Valor inválido em '+k+'.');
  pedido={...pedido,desconto:dinheiro(pedido.desconto),outrasDespesas:dinheiro(pedido.outrasDespesas||0),ipiInformado:dinheiro(pedido.ipiInformado||0),icmsStInformado:dinheiro(pedido.icmsStInformado||0)};
  exigir(pedido.itens.length>0||!(pedido.outrasDespesas||pedido.ipiInformado||pedido.icmsStInformado),'Inclua um produto antes de informar despesas ou tributos adicionais.');
  const ids=new Set();
  const iniciais=pedido.itens.map(l=>{
   exigir(!ids.has(l.produtoId),'Produto duplicado no pedido.');ids.add(l.produtoId);
   const original=produtos.find(p=>p.id===l.produtoId);exigir(original,'Produto do pedido não encontrado.');
   const p=l.tabelaId?{...original,tabelaVendaId:l.tabelaId}:original;
   exigir(Number.isInteger(l.quantidade)&&l.quantidade>0,'Quantidade deve ser inteira e positiva.');
   const par=parametros[ano];exigir(par,'Horizonte fiscal não encontrado.');
   const r=calcularProduto(p,regra,par),tabela=p.tabelasPreco?.find(t=>t.id===p.tabelaVendaId),limiteManual=tabela?Math.min(regra.descMax,tabela.desconto):regra.descMax;
   return {p,l,par,r,...descontoPedido(p,l,regra,r.preco,limiteManual)};
  });
  const rateios=ratear(pedido.desconto,iniciais.map(x=>x.subtotal));
  const rateiosOutras=ratear(pedido.outrasDespesas||0,iniciais.map(x=>x.subtotal),false);
  const itens=iniciais.map((x,k)=>{
   const final=dinheiro(dec(x.subtotal).minus(rateios[k]).plus(rateiosOutras[k])),unitario=dec(final).div(x.l.quantidade),r=calcularProduto(x.p,regra,x.par,num(unitario));
   const unitarioComercial=dec(x.subtotal).minus(rateios[k]).div(x.l.quantidade);
   const desconto=x.r.preco?num(dec(1).minus(unitarioComercial.div(x.r.preco)).mul(100)):0;
   const projecao=r.projecaoReforma?projetarComIcmsIncluido(r,r.fiscalTabela,x.l.quantidade,final):null;
   const totalReforma=projecao?projecao.total:final;
   if(projecao){
    r.projecaoReforma=projecao.resultado;
    r.precoReforma=num(dec(totalReforma).div(x.l.quantidade));
    r.acrescimoReforma=num(dec(r.precoReforma).minus(r.preco));
   }
   const conciliacaoReforma=conciliarReforma(r,r.projecaoReforma||r,x.l.quantidade,final,totalReforma);
   return {...x,totalReforma,conciliacaoReforma,acrescimoReforma:dinheiro(dec(totalReforma).minus(final)),final,rateio:rateios[k],rateioOutras:rateiosOutras[k],unitarioFinal:num(unitario),resultado:r,descontoEfetivo:desconto,foraIntervalo:desconto>x.limiteDesconto+1e-7||(desconto>0&&desconto<regra.descMin-1e-7)};
  });
  const somar=f=>num(itens.reduce((s,x)=>s.plus(f(x)),dec(0))),totalOperacao=dinheiro(somar(x=>x.final)),total=dinheiro(dec(totalOperacao).plus(pedido.ipiInformado||0).plus(pedido.icmsStInformado||0)),receita=somar(x=>dec(x.resultado.receita).mul(x.l.quantidade)),lucro=somar(x=>dec(x.resultado.lucro).mul(x.l.quantidade));
  const custo=somar(x=>dec(x.resultado.custo).mul(x.l.quantidade)),cpv=somar(x=>dec(x.resultado.cpv??x.p.cpv).mul(x.l.quantidade)),frete=somar(x=>dec(x.resultado.frete??x.p.frete).mul(x.l.quantidade));
  const impostos=Object.fromEntries(['icms','cbs','ibs','is','simples','operacional','comissao'].map(k=>[k,somar(x=>dec((regra.modoPrecificacao==='sem_cbs_ibs'&&x.resultado.projecaoReforma&&['icms','cbs','ibs','is'].includes(k)?x.resultado.projecaoReforma[k]:x.resultado[k])||0).mul(x.l.quantidade))]));
  const margem=receita?num(dec(lucro).div(receita).mul(100)):0;
   const totalReforma=dinheiro(dec(somar(x=>x.totalReforma)).plus(pedido.ipiInformado||0).plus(pedido.icmsStInformado||0));
   const acrescimoReforma=dinheiro(dec(totalReforma).minus(total));
   const conciliacaoReforma=fecharConciliacao(total,totalReforma,Object.fromEntries(['cbs','ibs','icms','is','simples'].map(k=>[k,somar(x=>dec((x.resultado.projecaoReforma||x.resultado)[k]||0).minus(x.resultado[k]||0).mul(x.l.quantidade))])));
  const folga=somar(x=>dec(x.final).minus(dec(x.resultado.minimo).mul(x.l.quantidade)));
  return {itens,total,totalReforma,acrescimoReforma,conciliacaoReforma,descontoGeral:pedido.desconto,modoPrecificacao:regra.modoPrecificacao||'atual',totalOperacao,outrasDespesas:pedido.outrasDespesas,ipi:pedido.ipiInformado,icmsSt:pedido.icmsStInformado,brutoItens:somar(x=>x.brutoItem),descontoItens:somar(x=>x.descontoItem),descontoTotal:dinheiro(dec(somar(x=>x.descontoItem)).plus(pedido.desconto)),semReforma:dinheiro(dec(totalReforma).minus(impostos.cbs).minus(impostos.ibs)),reforma:dinheiro(dec(impostos.cbs).plus(impostos.ibs)),receita,lucro,custo,cpv,frete,...impostos,mOper:margem,mVenda:total?lucro/total*100:0,markup:cpv?lucro/cpv*100:null,quantidade:somar(x=>x.l.quantidade),tabela:somar(x=>dec(x.r.preco).mul(x.l.quantidade)),descontoMaxAdicional:Math.max(0,piso(folga)),status:!itens.length?'vazio':itens.some(x=>x.resultado.status==='pendente')?'pendente':itens.some(x=>x.resultado.lucro<0)?'prejuizo':itens.some(x=>x.resultado.status==='abaixo'||x.foraIntervalo)?'abaixo':'seguro'};
 }
 // Conciliação de apresentação: mantém precisão interna e explicita os resíduos
 // da soma exibida. Não distribui diferenças silenciosamente em um imposto.
 function fecharConciliacao(comercial,projetado,diferencas){
  const parcelas=Object.entries(diferencas).map(([tributo,valor])=>({tributo,valor:dinheiro(valor)}));
  const ajuste=dinheiro(dec(projetado).minus(comercial).minus(parcelas.reduce((s,p)=>s.plus(p.valor),dec(0))));
  return {comercial:dinheiro(comercial),projetado:dinheiro(projetado),acrescimo:dinheiro(dec(projetado).minus(comercial)),parcelas,ajuste};
 }
 function conciliarReforma(comercial,projecao,quantidade=1,totalComercial=dinheiro(dec(comercial.preco).mul(quantidade)),totalProjetado=dinheiro(dec(projecao.preco).mul(quantidade))){
  return fecharConciliacao(totalComercial,totalProjetado,Object.fromEntries(['cbs','ibs','icms','is','simples'].map(k=>[k,num(dec(projecao[k]||0).minus(comercial[k]||0).mul(quantidade))])));
 }
 // Memória estruturada a partir dos resultados já calculados. Não arredonda
 // bases nem tributos: valores unitários × quantidade, como os totais do pedido.
 // Não cria base fiscal para IPI/ST informados nem separa parcelas do DAS.
 // Conciliação didática: explica a passagem do preço à base já calculada.
 // LC 214 art.12: exclusões no cenário regular; o IS permanece na base CBS/IBS.
 // Ajustes abaixo são apenas de exibição da soma de parcelas em centavos.
 function conciliarPrecoBase(r,quantidade=1){
  exigir(valido(quantidade)&&quantidade>0,'Quantidade inválida para conciliar a base.');
  const simples=r.fiscalTabela?.regime==='simples',etapas=[];
  const adicionar=(rotulo,valor,tipo)=>etapas.push({rotulo,tipo,valorUnitario:valor,valorItem:num(dec(valor).mul(quantidade))});
  const diferenca=(alvo,inicio,deducoes,q)=>{
   let saldo=dec(dinheiro(dec(inicio).mul(q)));
   for(const valor of deducoes)saldo=saldo.minus(dinheiro(dec(valor).mul(q)));
   return dinheiro(dec(dinheiro(dec(alvo).mul(q))).minus(saldo));
  };
  const ajustar=(rotulo,a,b)=>{if(a||b)etapas.push({rotulo,tipo:'ajuste',valorUnitario:a,valorItem:b})};
  if(r.icmsIncluidoNoComercial){
   const preco=r.precoComercial,base=num(dec(preco).minus(r.icms));
   adicionar('Preço comercial com ICMS incluído',preco,'inicio');
   adicionar('ICMS já incluído no preço comercial',-r.icms,'deducao');
   adicionar('Base de cálculo de CBS e IBS',base,'resultado');
   return {regime:'regular',origem:'preco-comercial',quantidade,etapas,precoComercial:preco,baseCbsIbs:base,baseCbsIbsItem:num(dec(base).mul(quantidade)),ajusteUnitario:0,ajusteItem:0,formula:'Base CBS/IBS = preço comercial − ICMS já incluído. CBS e IBS são calculados depois, sobre essa base.'};
  }
  adicionar('Preço de venda com os tributos modelados',r.preco,'inicio');
  if(simples){adicionar('Estimativa total do Simples (não segrega os tributos)',-r.simples,'deducao');const a=diferenca(r.receita,r.preco,[r.simples],1),b=diferenca(r.receita,r.preco,[r.simples],quantidade);ajustar('Ajuste apenas da soma exibida em centavos',a,b);adicionar('Receita após estimativa do Simples',r.receita,'resultado');return {regime:'simples',quantidade,etapas,baseCbsIbs:null,baseCbsIbsItem:null,ajusteUnitario:a,ajusteItem:b,formula:'Preço − estimativa total do Simples = receita. Bases individuais de CBS/IBS não segregadas.'};}
  for(const [k,nome] of [['icms','ICMS'],['cbs','CBS'],['ibs','IBS']])adicionar(nome+' retirado do preço',-r[k],'deducao');
  const ajusteUnitario=diferenca(r.baseCbsIbs,r.preco,[r.icms,r.cbs,r.ibs],1),ajusteItem=diferenca(r.baseCbsIbs,r.preco,[r.icms,r.cbs,r.ibs],quantidade);
  ajustar('Ajuste apenas da soma exibida em centavos',ajusteUnitario,ajusteItem);
  adicionar('Base de cálculo de CBS e IBS',r.baseCbsIbs,'resultado');
  if(r.is){adicionar('IS retirado somente para chegar à receita sem tributos',-r.is,'deducao');ajustar('Ajuste apenas da receita exibida em centavos',diferenca(r.receita,r.baseCbsIbs,[r.is],1),diferenca(r.receita,r.baseCbsIbs,[r.is],quantidade));adicionar('Receita sem os tributos modelados',r.receita,'liquido');}
  return {regime:'regular',quantidade,etapas,baseCbsIbs:r.baseCbsIbs,baseCbsIbsItem:num(dec(r.baseCbsIbs).mul(quantidade)),ajusteUnitario,ajusteItem,formula:'Base CBS/IBS = preço final − ICMS − CBS − IBS. IS permanece na base quando incidente.',formulaInversa:'Base CBS/IBS = (preço final − ICMS) ÷ (1 + alíquota CBS + alíquota IBS)'};
 }
 function memoriaTributos(r,parametro,quantidade=1){
  exigir(valido(quantidade)&&quantidade>0,'Quantidade inválida para detalhar os tributos.');
  const simples=r.fiscalTabela?.regime==='simples';
  const fonte=r.fiscalTabela?.fonte||parametro.fonte,atualizado=r.fiscalTabela?.atualizado||parametro.atualizado;
  const baseIcmsCompleta=parametro.modelo!=='original'&&parametro.incluirNovosNoIcms;
  const dados=[
   ['icms','ICMS',r.baseIcms,r.icmsIncluidoNoComercial?'Base ICMS = preço comercial, que já contém o ICMS; CBS/IBS acrescentados não aumentam esse valor':baseIcmsCompleta?'Base ICMS = preço final (inclui o próprio ICMS e CBS/IBS no cenário)':'Base ICMS = (receita sem tributos modelados + IS) ÷ (1 − alíquota ICMS)',r.icmsIncluidoNoComercial?String(r.precoComercial):baseIcmsCompleta?String(r.preco):'('+r.receita+' + '+(r.is||0)+') ÷ (1 − '+num(pct(r.aliquotas.icms))+')'],
   ['cbs','CBS',r.baseCbsIbs,r.icmsIncluidoNoComercial?'Base CBS = preço comercial − ICMS já incluído':'Base CBS = receita sem tributos modelados + IS',r.icmsIncluidoNoComercial?r.precoComercial+' − '+r.icms:r.receita+' + '+(r.is||0)],
   ['ibs','IBS',r.baseCbsIbs,r.icmsIncluidoNoComercial?'Base IBS = preço comercial − ICMS já incluído':'Base IBS = receita sem tributos modelados + IS',r.icmsIncluidoNoComercial?r.precoComercial+' − '+r.icms:r.receita+' + '+(r.is||0)],
   ['is','IS',r.receita,'Base IS de referência do modelo = receita antes do IS',String(r.receita)]
  ];
  const linhas=dados.map(([chave,tributo,base,formulaBase,expressaoBase])=>({chave,tributo,quantidade,baseUnitaria:simples?null:base,baseItem:simples?null:num(dec(base).mul(quantidade)),aliquota:simples?null:r.aliquotas[chave],valorUnitario:simples?null:r[chave],valorItem:simples?null:num(dec(r[chave]).mul(quantidade)),formulaBase:simples?'Não segregado no modelo de Simples total. Não representa tributo isento nem base zero.':formulaBase,expressaoBase:simples?null:expressaoBase,fonte,atualizado,observacao:simples?'A taxa efetiva total é informada pelo responsável; o motor não separa os tributos do DAS.':chave==='is'&&r.aliquotas.is===0?'IS não incidente no cenário; base exibida apenas como referência matemática.':'Base do cenário de estudo; confirmar enquadramento e incidência com o responsável fiscal.'}));
  if(simples)linhas.push({chave:'simples',tributo:'Simples · estimativa total',quantidade,baseUnitaria:r.preco,baseItem:num(dec(r.preco).mul(quantidade)),aliquota:r.percentuais.simples,valorUnitario:r.simples,valorItem:num(dec(r.simples).mul(quantidade)),formulaBase:'Base da estimativa gerencial = preço final de venda',expressaoBase:String(r.preco),fonte,atualizado,observacao:'Preço × taxa efetiva informada. Não é apuração fiscal do DAS nem cálculo de RBT12.'});
  return linhas;
 }
 function calcularCaixa(venda,creditos,caixa){
  venda=venda.projecaoReforma||venda;
  exigir(['desligado','padrao','simplificado'].includes(caixa.modo),'Procedimento de split inválido.');
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
  const r=o.regra;exigir([undefined,'atual','sem_cbs_ibs'].includes(r.modoPrecificacao),'Modalidade de precificacao invalida.');exigir(['cpv','operacao'].includes(r.baseMeta)&&valido(r.minMargem)&&r.minMargem>=0&&r.minMargem<100,'Regra de margem inválida.');
  for(const [ano,par] of Object.entries(o.parametros)){
   exigir(/^\d{4}$/.test(ano)&&par&&['encadeado','original'].includes(par.modelo),'Horizonte ou modelo inválido.');
   exigir(['icms','cbs','ibs','is'].every(k=>valido(par[k])&&par[k]>=0&&par[k]<100),'Alíquotas inválidas.');
   exigir(valido(par.fatorReduzida)&&par.fatorReduzida>=0&&par.fatorReduzida<=1&&typeof par.incluirNovosNoIcms==='boolean','Parâmetro de base inválido.');
   exigir(par.simplesEfetivo==null||(valido(par.simplesEfetivo)&&par.simplesEfetivo>=0&&par.simplesEfetivo<100),'Alíquota efetiva do Simples inválida.');
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
      for(const v of Object.values(t.fiscal||{}))exigir(['icms','cbs','ibs','is'].every(k=>!Object.hasOwn(v,k)||(valido(v[k])&&v[k]>=0&&v[k]<100)),'Alíquota efetiva da tabela inválida.');
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
   const limiteManual=p.descontoTabela==null?regra.descMax:Math.min(regra.descMax,p.descontoTabela);
   return {p,l,...descontoPedido(p,l,regra,p.precoComercial,limiteManual)};
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
 // Projeção pura do estado: contexto central chega a todas as telas e ao pedido,
 // sem gravar cópias do regime em cada produto/tabela nem alterar os dados de entrada.
 function prepararCenario(s){
  return {...s,parametros:Object.fromEntries(Object.entries(s.parametros).map(([ano,p])=>[ano,{...p,horizonte:ano,contextoFiscal:{...s.contexto}}]))};
 }
 function fiscalTabela(p,t,parametro){
  const ano=String(parametro.horizonte||String(parametro.inicio).slice(0,4)),override=t.fiscal?.[ano];
  const mult=p.tratamento==='zero'?0:p.tratamento==='reduzida'?parametro.fatorReduzida:1;
  const herdadas={icms:parametro.icms,cbs:num(dec(parametro.cbs).mul(mult)),ibs:num(dec(parametro.ibs).mul(mult)),is:p.seletivo?parametro.is:0};
  const camposAlterados=['icms','cbs','ibs','is'].filter(k=>override&&Object.hasOwn(override,k));
  const taxas={...herdadas,...Object.fromEntries(camposAlterados.map(k=>[k,override[k]]))};
  const global=parametro.contextoFiscal,herdarRegime=!!global&&global.regime!=='Não informado'&&!!global.regime;
  const regime=herdarRegime?(global.regime==='Simples'?'simples':global.regime==='Simples regular'?'simples-regular':'regular'):t.regime;
  return {ano,taxas,herdadas,camposAlterados,alterado:camposAlterados.length>0,regime,regimeOrigem:herdarRegime?'fiscal':'tabela',simples:herdarRegime&&regime==='simples'?parametro.simplesEfetivo:t.simples,fonte:override?.fonte||parametro.fonte,atualizado:override?.atualizado||parametro.atualizado};
 }
 function calcularTabelaAtual(p,t,regra,parametro,override=null){
  const fiscal=fiscalTabela(p,t,parametro);
  // LC 214/2025 art.41 §§2º–4º: Simples e opção regular de IBS/CBS são distintos.
  // Composição híbrida ainda não implementada: bloquear, sem somar DAS total e IBS/CBS.
  exigir(fiscal.regime!=='simples-regular','Simples com IBS/CBS no regime regular: composição híbrida ainda não implementada. Revise a aba Fiscal; não é seguro somar DAS total e IBS/CBS.');
  exigir(fiscal.regime!=='simples'||valido(fiscal.simples),'Informe na aba Fiscal a alíquota efetiva total do Simples para este estudo.');
  t={...t,regime:fiscal.regime,simples:fiscal.simples};
  for(const k of ['desconto','margem','simples','operacional','comissao','freteTonelada'])exigir(valido(t[k])&&t[k]>=0,'Tabela '+t.nome+': valor inválido em '+k+'.');
  for(const k of ['desconto','margem','simples','operacional','comissao'])exigir(t[k]<100,'Tabela '+t.nome+': '+k+' deve ser menor que 100%.');
  exigir(valido(regra.minMargem)&&regra.minMargem>=0&&regra.minMargem<100,'Margem mínima inválida.');
  exigir(['regular','simples'].includes(t.regime),'Composição tributária inválida.');
  const entrada=calcularEntrada(p),cpv=dec(entrada.custoLiquido),peso=dec(entrada.pesoKg);
  exigir(!t.fretePendente||peso.gt(0),'Informe o peso: há frete unitário da versão anterior que não pode ser convertido para tonelada.');
  exigir(t.freteTonelada===0||peso.gt(0),'Informe o peso da unidade de venda para calcular o frete por tonelada.');
  const frete=dec(t.freteTonelada).mul(peso).div(1000),custo=cpv.plus(frete);
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
  // O desconto fixa a unidade em centavos. Fechar primeiro o alvo praticado
  // para cima impede que o half-up posterior reduza o resultado abaixo da meta.
  const sugerido=teto(dec(teto(alvoPraticado)).div(um.minus(d)));
  const informado=override!=null?override:t.precoConsumidor==null?sugerido:t.precoConsumidor;
  exigir(valido(informado)&&informado>=0,'Preço consumidor deve ser não negativo.');
  // Rateios do pedido podem produzir unidade fracionária de centavo. Preservá-la
  // quando passada pelo motor; somente o preço comercial digitado é fechado.
  const consumidor=override!=null?informado:dinheiro(informado);
  const preco=dec(consumidor),receita=preco.div(f),operacional=preco.mul(pct(t.operacional)),comissao=preco.mul(pct(t.comissao)),lucro=receita.minus(custo).minus(operacional).minus(comissao);
  const dd=um.minus(pct(regra.minMargem)).div(f).minus(despesa);
  exigir(dd.gt(0),'A margem mínima é inviável com estes tributos e despesas.');
  const pisoTecnico=teto(custo.div(dd)),equilibrio=teto(custo.div(fracao.minus(despesa)));
  const minimoComercial=dinheiro(preco.mul(um.minus(d))),receitaMin=dec(minimoComercial).div(f),lucroMin=receitaMin.minus(custo).minus(dec(minimoComercial).mul(despesa));
  const decomposicao=t.regime==='simples'?{icms:0,cbs:0,ibs:0,is:0,baseCbsIbs:0,baseIcms:0,tributos:num(preco.minus(receita)),aliquotas:{icms:0,cbs:0,ibs:0,is:0}}:decompor(consumidor,produtoFiscal,contexto);
  const margem=receita.gt(0)?num(lucro.div(receita).mul(100)):0,margemMin=receitaMin.gt(0)?num(lucroMin.div(receitaMin).mul(100)):0;
  return {...decomposicao,preco:consumidor,precoConsumidor:consumidor,precoReforma:num(receita),receita:num(receita),precoMinimoComercial:minimoComercial,sugerido,f:num(f),alvo:num(alvoPraticado.div(f)),antesDesconto:num(alvoPraticado.div(f)),custo:num(custo),cpv:num(cpv),frete:num(frete),pesoKg:num(peso),operacional:num(operacional),comissao:num(comissao),simples:t.regime==='simples'?num(preco.minus(receita)):0,lucro:num(lucro),mOper:margem,mVenda:preco.gt(0)?num(lucro.div(preco).mul(100)):0,markup:cpv.gt(0)?num(lucro.div(cpv).mul(100)):null,minimo:pisoTecnico,pisoTecnico,equilibrio,margemNoMinimo:margemMin,lucroNoMinimo:num(lucroMin),descontoMax:preco.gt(0)?Math.max(0,piso(um.minus(dec(pisoTecnico).div(preco)).mul(100))):0,descontoBase:0,descontoFinalEquivalente:0,status:cpv.lte(0)?'pendente':lucro.lt(0)?'prejuizo':margem+1e-9<regra.minMargem?'abaixo':'seguro',statusMinimo:cpv.lte(0)?'pendente':lucroMin.lt(0)?'prejuizo':margemMin+1e-9<regra.minMargem?'abaixo':'seguro',fiscalTabela:fiscal,tabelaId:t.id,percentuais:{desconto:t.desconto,margem:t.margem,operacional:t.operacional,comissao:t.comissao,simples:t.simples},denominador:num(denom),despesasFracao:num(despesa)};
 }
 // Modalidade opcional: preco comercial exclui CBS/IBS; a projecao os inclui.
 function projetarComIcmsIncluido(comercial,fiscal,quantidade=1,totalComercial=num(dec(comercial.preco).mul(quantidade))){
  // Preço comercial já contém ICMS/IS. Preservá-los e acrescentar somente
  // CBS/IBS sobre a base sem ICMS. Não recalcular ICMS sobre o faturamento.
  const q=dec(quantidade),base=dec(totalComercial).minus(dec(comercial.icms).mul(q));
  const cbsPreciso=base.mul(pct(fiscal.taxas.cbs)),ibsPreciso=base.mul(pct(fiscal.taxas.ibs));
  // Fechar cada tributo do item antes de totalizar: o faturamento deve ser
  // exatamente comercial + CBS exibida + IBS exibido, sem centavo artificial.
  const cbs=dec(dinheiro(cbsPreciso)),ibs=dec(dinheiro(ibsPreciso));
  const total=dinheiro(dec(totalComercial).plus(cbs).plus(ibs));
  const preco=num(dec(total).div(q)),ajuste=dec(total).minus(totalComercial).minus(cbs).minus(ibs).div(q);
  return {total,resultado:{preco,receita:comercial.receita,icms:comercial.icms,is:comercial.is,simples:comercial.simples,baseIcms:comercial.baseIcms,precoComercial:num(dec(totalComercial).div(q)),baseCbsIbs:num(base.div(q)),cbs:num(cbs.div(q)),ibs:num(ibs.div(q)),cbsPreciso:num(cbsPreciso.div(q)),ibsPreciso:num(ibsPreciso.div(q)),fechamentoTributos:'por-item',quantidadeFechamento:quantidade,tributos:num(dec(comercial.icms).plus(comercial.is).plus(cbs.div(q)).plus(ibs.div(q))),aliquotas:{...comercial.aliquotas,cbs:fiscal.taxas.cbs,ibs:fiscal.taxas.ibs},fiscalTabela:fiscal,icmsIncluidoNoComercial:true,ajusteFechamento:num(ajuste),f:comercial.receita?num(dec(preco).div(comercial.receita)):comercial.f}};
 }
 function calcularTabela(p,t,regra,parametro,override=null){
  exigir([undefined,'atual','sem_cbs_ibs'].includes(regra.modoPrecificacao),'Modalidade de precificação inválida.');
  if(regra.modoPrecificacao!=='sem_cbs_ibs')return calcularTabelaAtual(p,t,regra,parametro,override);
  const fiscal=fiscalTabela(p,t,parametro);
  if(fiscal.regime==='simples'){
   const atual=calcularTabelaAtual(p,t,regra,parametro,override);
   return {...atual,precoReforma:atual.preco,acrescimoReforma:0};
  }
  const ano=fiscal.ano;
  const sem={...parametro,cbs:0,ibs:0};
  const tSem={...t,fiscal:{...t.fiscal,[ano]:{...t.fiscal?.[ano],cbs:0,ibs:0}}};
  const comercial=calcularTabelaAtual(p,tSem,regra,sem,override);
  const projetado=projetarComIcmsIncluido(comercial,fiscal),precoReforma=projetado.total,projecao=projetado.resultado;
  const multiplicador=dec(1).plus(dec(1).minus(pct(fiscal.taxas.icms)).mul(pct(fiscal.taxas.cbs).plus(pct(fiscal.taxas.ibs))));
  return {...comercial,precoComercial:comercial.preco,icmsIncluidoNoComercial:true,precoReforma,projecaoReforma:projecao,fiscalTabela:fiscal,
   modalidadePrecificacao:'sem_cbs_ibs',fatorReforma:projecao.f,multiplicadorReforma:num(multiplicador),
   acrescimoReforma:dinheiro(dec(precoReforma).minus(comercial.preco))};
 }
 const api={descontoPedido,conciliarReforma,conciliarPrecoBase,memoriaTributos,prepararCenario,dinheiro,teto,piso,validarFaixas,aliquotas,fator:(p,s)=>num(fator(p,s)),decompor,calcularProduto,faixa,ratear,calcularPedido,calcularPedidoComercial,calcularCaixa,validarImportacao,calcularEntrada,fiscalTabela,calcularTabela};
 root.Motor=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
