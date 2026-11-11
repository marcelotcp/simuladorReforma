/* MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton */
function migrarGrade(s){
 s.modo='gestor';s.regra.modoPrecificacao??='atual';s.pedido.outrasDespesas??=0;s.pedido.ipiInformado??=0;s.pedido.icmsStInformado??=0;
 if(s.tipo==='comercial')return s;
 for(const p of s.produtos){
  if(!p.entrada){
   const peso=Number((p.unidade.match(/(\d+(?:[.,]\d+)?)\s*kg/i)||[])[1]?.replace(',','.'))||0;
   p.entrada={documento:'A informar',data:'',fornecedor:'A informar',custoBruto:p.cpv,desconto:0,creditoIcms:0,creditoCbs:0,creditoIbs:0,quantidade:0,estoque:0,estoqueInformado:false,pesoKg:peso};
  }
  if(!p.tabelasPreco?.length){
   p.tabelasPreco=[{id:'padrao',nome:'Tabela padrão',precoConsumidor:p.preco,desconto:0,margem:p.meta,regime:'regular',simples:0,operacional:0,comissao:0,freteTonelada:p.entrada.pesoKg?p.frete*1000/p.entrada.pesoKg:0,fretePendente:!p.entrada.pesoKg&&p.frete>0,freteUnitarioLegado:p.frete,fiscal:{}}];
   // Um preço antigo é migrado para a coluna consumidor; não será substituído
   // pela recomendação a cada edição de percentual.
   p.preco=null;p.tabelaVendaId='padrao';
   const base=p.tabelasPreco[0];
   p.tabelasPreco.push({...JSON.parse(JSON.stringify(base)),id:'atacado',nome:'Atacado · exemplo',desconto:5,margem:p.meta,precoConsumidor:null});
   p.tabelasPreco.push({...JSON.parse(JSON.stringify(base)),id:'distribuidor',nome:'Distribuidor · exemplo',desconto:8,margem:p.meta,precoConsumidor:null});
   for(const t of p.tabelasPreco){if(t.precoConsumidor==null){try{t.precoConsumidor=Motor.calcularTabela(p,t,s.regra,s.parametros[s.ano]).sugerido}catch(e){}}}
  }
  if(!p.tabelasPreco.some(t=>t.id===p.tabelaVendaId))p.tabelaVendaId=p.tabelasPreco[0].id;
 }
 return s;
}
Object.assign(GLOSSARIO,{
 consumidor:['Preço consumidor','Preço final editável que será levado à venda quando esta tabela estiver marcada como tabela de venda. Não muda silenciosamente ao editar percentuais.','Entrada do operador. Use Aplicar sugerido quando quiser substituir pelo cálculo.'],
 sugeridoTabela:['Preço sugerido da tabela','Recomendação somente para leitura. Cobre custo, frete, despesas e a meta mesmo após o desconto máximo da linha.','Sobre operação: sugerido = teto((custo + frete) ÷ ((1−margem)/f − operacional − comissão) ÷ (1−desconto)). Sobre CPV: numerador inclui CPV × meta e denominador é 1/f − despesas.'],
 minimoComercial:['Preço mínimo com desconto','Valor após o desconto manual parametrizado nesta linha. A faixa por quantidade do produto tem prioridade no pedido e pode resultar em outro preço, sempre com conferência de margem. Não é o piso técnico.','Preço mínimo = preço consumidor × (1 − desconto máximo).'],
 precoReforma:['Preço da reforma · líquido','Preço consumidor sem os tributos modelados na composição ativa. Ainda contém os valores que pagarão custo, frete, operacional, comissão e resultado. Não é o valor do boleto nem o lucro.','Regular: consumidor ÷ fator tributário. Simples total: consumidor × (1 − alíquota efetiva informada).'],
 operacional:['Despesa operacional (%)','Parcela gerencial calculada sobre o preço efetivamente praticado, com tributos incluídos. Não informe despesas já incorporadas ao custo.','Despesa operacional em R$ = preço praticado × operacional ÷ 100.'],
 comissao:['Comissão (%)','Parcela da comissão sobre o preço efetivamente praticado. A base é uma premissa comercial editável no projeto, não uma regra tributária.','Comissão em R$ = preço praticado × comissão ÷ 100.'],
 freteTonelada:['Frete por tonelada','Valor do transporte de 1.000 kg. É convertido usando o peso da unidade de venda selecionada; sem peso, um frete positivo é bloqueado.','Frete unitário = R$/tonelada × peso da unidade (kg) ÷ 1.000.'],
 simplesTabela:['Simples Nacional (%)','Alíquota efetiva total informada pelo responsável. Só compõe o preço no cenário Simples total, sem somar novamente ICMS/CBS/IBS regulares. Não calcula DAS por anexo e RBT12.','Simples estimado em R$ = preço praticado × alíquota efetiva. LC 123 art.13; LC 214 art.41. Cenário híbrido não automatizado.'],
 custoEntrada:['Custo líquido da entrada','Custo bruto unitário menos desconto unitário e créditos recuperáveis informados da mesma unidade. Os créditos não são abatidos novamente do resultado.','Custo líquido = bruto − desconto − crédito ICMS − crédito CBS − crédito IBS.'],
 margemTabela:['Margem desejada da tabela','Meta usada para formar o preço sugerido. A base escolhida no cabeçalho vale para as linhas. O resultado efetivo é conferido separadamente.','Resultado = preço da reforma − custo líquido − frete − operacional − comissão. A meta deve caber no denominador de formação de preço.']
});
REGRAS_AUDITADAS.push(['R13','Despesas, frete por tonelada e desconto de tabela','Premissas comerciais explícitas','Sem fórmula legal de precificação; Simples: LC 123 art.13 e LC 214 art.41','calcularEntrada / calcularTabela','G01–G10','Não somar DAS total aos mesmos tributos regulares; validar bases comerciais.',FONTES.lc123]);

Object.assign(GLOSSARIO,{
 composicaoFiscal:['Regime da empresa e composição da tabela','Regular: usa as alíquotas efetivas ICMS/CBS/IBS/IS do cenário. Simples total: deduz a taxa efetiva total informada, sem somar novamente esses tributos. Não é a classificação padrão/reduzida/zero do produto. A aba Fiscal centraliza o regime da empresa; sem informação, permanece a hipótese local da tabela.','Regular: líquido = preço ÷ fator do cenário. Simples total: líquido = preço × (1 − taxa efetiva). LC 214/2025 art.41 §§2º–4º; LC 123/2006 art.13. A opção IBS/CBS fora do Simples exige composição própria ainda não implementada.'],
});

Object.assign(GLOSSARIO,{
 gradePreco:['Como usar a grade de preços','Edite P. venda para definir o preço levado ao pedido. P. sugerido, P. mínimo e P. líquido são calculados; clique para ver fórmulas e bases. O ícone de confirmação ao lado do sugerido aplica esse preço. O ícone ao lado do nome escolhe a tabela de venda. Expanda Tributos e despesas para editar os parâmetros.','P. mínimo = preço consumidor × (1 − desconto manual da tabela). P. líquido = preço ÷ fator tributário. A faixa de quantidade do produto tem prioridade no pedido; os alertas de margem continuam ativos.'],
});
