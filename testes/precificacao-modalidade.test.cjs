/* Testes da modalidade opt-in sem CBS/IBS na formacao comercial. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Motor=require('../src/motor.js');
const contexto={Motor};
vm.createContext(contexto);
for(const nome of ['dados.js','grade-dados.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',nome),'utf8'),contexto);
vm.runInContext('globalThis.cenario=migrarGrade(estadoInicial())',contexto);
const s=JSON.parse(JSON.stringify(contexto.cenario)),p=s.produtos[0],t=p.tabelasPreco[0],par=s.parametros[s.ano];
const atual={...s.regra,modoPrecificacao:'atual'},novo={...s.regra,modoPrecificacao:'sem_cbs_ibs'};
const perto=(a,b)=>assert.ok(Math.abs(a-b)<0.000001,a+' != '+b);
let n=0;
function teste(nome,fn){fn();n++;console.log(nome+' OK');}
teste('N01: preco atual preservado',()=>{const a=Motor.calcularTabela(p,t,s.regra,par),b=Motor.calcularTabela(p,t,atual,par);perto(a.preco,b.preco);perto(a.sugerido,b.sugerido);perto(a.precoReforma,b.precoReforma);});
teste('N02: CBS/IBS nao entram na formacao comercial',()=>{const r=Motor.calcularTabela(p,t,novo,par);perto(r.cbs,0);perto(r.ibs,0);assert.ok(r.projecaoReforma.cbs>0);assert.ok(r.projecaoReforma.ibs>0);assert.ok(r.precoReforma>r.preco);});
teste('N03: sem novos tributos nao existe acrescimo',()=>{const r=Motor.calcularTabela(p,t,novo,{...par,cbs:0,ibs:0});perto(r.precoReforma,r.preco);});
teste('N04: faixa por quantidade prevalece sobre desconto manual',()=>{const r=Motor.calcularPedido({itens:[{produtoId:p.id,tabelaId:t.id,quantidade:50,preco:90,descontoModo:'manual',descontoPct:0}],desconto:0},s.produtos,novo,s.parametros,s.ano);assert.equal(r.itens[0].origemDesconto,'quantidade');assert.ok(r.descontoItens>0);assert.ok(r.totalReforma>r.total);perto(r.acrescimoReforma,Motor.dinheiro(r.totalReforma-r.total));});
teste('N05: desconto geral reduz a projecao',()=>{const line={produtoId:p.id,tabelaId:t.id,quantidade:10,preco:90,descontoModo:'automatico',descontoPct:0};const x=Motor.calcularPedido({itens:[line],desconto:12.30},s.produtos,novo,s.parametros,s.ano);const y=Motor.calcularPedido({itens:[line],desconto:0},s.produtos,novo,s.parametros,s.ano);assert.ok(x.totalReforma<y.totalReforma);});
teste('N06: modalidade nao reconhecida bloqueada no backup',()=>{assert.throws(()=>Motor.validarImportacao({...s,regra:{...s.regra,modoPrecificacao:'invalido'}}),/Modalidade/);});
teste('N07: preco comercial 100 ja contem ICMS 18 e recebe somente CBS/IBS',()=>{const r=Motor.calcularTabela(p,t,novo,par,100),f=r.projecaoReforma;perto(r.icms,18);perto(f.icms,18);perto(f.baseIcms,100);perto(f.baseCbsIbs,82);perto(f.cbs,9.18);perto(f.ibs,.08);perto(f.cbsPreciso,9.184);perto(f.ibsPreciso,.082);perto(r.precoReforma,109.26);assert.equal(Motor.conciliarReforma(r,f).parcelas.find(x=>x.tributo==='icms').valor,0);});
teste('N08: flag de bases cruzadas nao aumenta o ICMS no preco comercial sem CBS/IBS',()=>{for(const tratamento of ['padrao','reduzida','zero'])for(const quantidade of [1,3,10,23]){const q={...p,tratamento};const pedido={desconto:.13,outrasDespesas:.21,itens:[{produtoId:p.id,tabelaId:t.id,quantidade,preco:100,descontoPct:0}]};for(const incluirNovosNoIcms of [true,false]){const x=Motor.calcularPedido(pedido,[q],novo,{[s.ano]:{...par,incluirNovosNoIcms}},s.ano),item=x.itens[0],f=item.resultado.projecaoReforma;perto(f.icms,item.resultado.icms);perto(f.baseIcms,item.final/quantidade);perto(x.icms,item.final*.18);assert.equal(item.conciliacaoReforma.parcelas.find(x=>x.tributo==='icms').valor,0);}}});
teste('N09: Simples total nao recebe ICMS ou CBS/IBS adicionais e preserva faturamento',()=>{const r=Motor.calcularTabela(p,{...t,regime:'simples',simples:6},novo,par,100);perto(r.precoReforma,100);perto(r.receita,94);perto(r.simples,6);perto(r.icms+r.cbs+r.ibs,0);});
teste('N10: base direta tem somente preco comercial menos ICMS, sem CBS/IBS ou ajuste',()=>{const r=Motor.calcularTabela(p,t,novo,par,100),f=r.projecaoReforma;for(const valor of [r,f]){const base=Motor.conciliarPrecoBase(valor);assert.equal(base.origem,'preco-comercial');assert.equal(base.etapas.length,3);perto(base.etapas[0].valorUnitario,100);perto(base.etapas[1].valorUnitario,-18);perto(base.etapas[2].valorUnitario,82);assert.ok(!base.etapas.some(e=>e.tipo==='ajuste'));}perto(f.preco,r.preco+f.cbs+f.ibs);perto(f.ajusteFechamento,0);});
console.log(n+' testes da nova modalidade OK');
