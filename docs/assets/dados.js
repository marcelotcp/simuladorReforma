/* MARCELO CLEITON, criador do projeto. © 2026 Marcelo Cleiton.
 * Dados de cenário editáveis; estimativas não constituem alíquotas oficiais.
 */
const AUTORIA={criador:'MARCELO CLEITON',finalidade:'Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA.',copyright:'© 2026 Marcelo Cleiton',credito:'MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton'};
const FONTES={
 lc214:'https://www2.camara.leg.br/legin/fed/leicom/2025/leicomplementar-214-16-janeiro-2025-796905-normaatualizada-pl.html',
 ec132:'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
 lc87:'https://www2.camara.leg.br/legin/fed/leicom/1996/leicomplementar-87-13-setembro-1996-370965-normaatualizada-pl.html',
 lc123:'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
 pr:'https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/56',
 tcu:'https://portal.tcu.gov.br/imprensa/noticias/presidente-do-tcu-entrega-ao-senado-acordao-sobre-aliquota-de-referencia-da-cbs',
 split:'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/comunicado-5',
 decreto:'https://www2.camara.leg.br/legin/fed/decret/2026/decreto-12955-29-abril-2026-799019-normaatualizada-pe.html'
};
const PARAMETROS_INICIAIS={
 '2026':{icms:18,cbs:0.9,ibs:0.1,is:0,fatorReduzida:0.4,modelo:'encadeado',incluirNovosNoIcms:false,inicio:'2026-01-01',fim:'2026-12-31',atualizado:'2026-11-11',fonte:'EC 132/2023, ADCT art.125; LC 214 arts.343,346,348; ICMS 18%: hipótese sem UF.',url:FONTES.lc214,situacao:'Ilustrativo: PIS/Cofins e dispensa de recolhimento não calculados',alterado:false},
 '2027':{icms:18,cbs:11.2,ibs:0.1,is:0,fatorReduzida:0.4,modelo:'encadeado',incluirNovosNoIcms:true,inicio:'2027-01-01',fim:'2027-12-31',atualizado:'2026-11-11',fonte:'CBS 11,2%: hipótese (referência TCU 11,3% menos 0,1 p.p.; fixação a validar). IBS: LC 214 art.344; ICMS: hipótese. Bases: Consulta SEFA/PR 48/2026.',url:FONTES.pr,situacao:'Premissa de estudo — validar UF, regime, produto e atos vigentes',alterado:false},
 '2029':{icms:16.2,cbs:8.8,ibs:1.77,is:0,fatorReduzida:0.4,modelo:'encadeado',incluirNovosNoIcms:true,inicio:'2029-01-01',fim:'2029-12-31',atualizado:'2026-11-11',fonte:'ADCT art.128: ICMS a 90% da taxa aplicável; 18% × 90% = 16,2%. CBS 8,8% e IBS 1,77%: hipóteses do autor.',url:FONTES.ec132,situacao:'Projeção ilustrativa — alíquotas futuras a validar',alterado:false},
 '2033':{icms:0,cbs:8.8,ibs:17.7,is:0,fatorReduzida:0.4,modelo:'encadeado',incluirNovosNoIcms:false,inicio:'2033-01-01',fim:'2033-12-31',atualizado:'2026-11-11',fonte:'ADCT art.129: extinção ICMS. CBS 8,8% e IBS 17,7%: hipóteses do autor.',url:FONTES.ec132,situacao:'Projeção ilustrativa — alíquotas futuras a validar',alterado:false}
};
const GLOSSARIO={
 cpv:['CPV líquido','Custo de uma unidade de venda, descontados apenas créditos recuperáveis efetivamente considerados no custo. Não desconte o mesmo crédito novamente do lucro.','Entrada gerencial; confirmar composição do custo.'],
 frete:['Frete CIF','Custo da entrega assumido pelo fornecedor. Se já integra o CPV, não informe outra vez. O frete cobrado na operação tem tratamento tributário próprio.','Receita alvo inclui frete; LC 214 art.12 §1º IV.'],
 receita:['Receita sem tributos modelados','Parcela gerencial que sobra do preço após os tributos calculados neste cenário. Evita confundir este número com o valor jurídico da operação de cada imposto.','Receita = preço final ÷ fator.'],
 preco:['Preço final ao cliente','Valor informado por telefone, já com frete e tributos modelados. Os impostos não serão cobrados novamente sobre esse total.','Preço final = receita × fator.'],
 lucro:['Resultado por unidade','Sobra após CPV, frete e tributos modelados. Não equivale necessariamente ao lucro líquido contábil: outras despesas e tributos podem existir.','Resultado = receita sem tributos − CPV − frete.'],
 mOper:['Margem sobre a operação','Indicador gerencial calculado sobre a receita sem os tributos modelados. É a mesma base da margem mínima em todo o produto.','Resultado ÷ receita sem tributos × 100.'],
 mVenda:['Margem sobre a venda','Quanto do total pago pelo cliente corresponde ao resultado calculado.','Resultado ÷ preço final × 100.'],
 markup:['Retorno sobre o CPV (markup do autor)','Mede o resultado sobre o custo. Mantém o indicador do projeto original; não confundir com o multiplicador preço ÷ custo.','Resultado ÷ CPV × 100.'],
 meta:['Meta de margem','Pode ser aplicada ao CPV ou à receita sem tributos. A meta é calculada antes da concessão do desconto sobre a receita.','CPV: receita alvo = CPV + CPV × meta + frete − desconto. Operação: (CPV + frete) ÷ (1 − meta) − desconto.'],
 minimo:['Preço mínimo','Menor preço final que preserva a margem mínima sobre a receita, neste cenário.','(CPV + frete) ÷ (1 − margem mínima) × fator; teto ao centavo.'],
 equilibrio:['Ponto de equilíbrio','Preço que cobre CPV e frete após os tributos modelados.','(CPV + frete) × fator; teto ao centavo.'],
 desconto:['Desconto incondicional','Redução definida na operação, indicada no documento fiscal e sem evento futuro. O desconto do pedido é em reais do total final; o desconto do precificador é na receita alvo.','LC 214 art.12 §2º III e §3º.'],
 faixa:['Faixa por quantidade','Cada produto tem suas faixas. Aplica-se a última quantidade inicial alcançada, sem somar percentuais. A quantidade já definida na venda é diferente de meta futura de compras.','Preço da faixa = tabela × (1 − desconto%).'],
 icms:['ICMS por dentro','Tributo estadual. A taxa depende da operação. No cenário encadeado com inclusão, CBS/IBS compõem sua base. ST, FCP, DIFAL e benefícios não são automatizados nesta versão.','LC 87 art.13; Consulta SEFA/PR 48/2026, sujeita à validação na UF.'],
 cbs:['CBS','Tributo federal por fora da própria base. A alíquota inicial é premissa, com fonte e vigência.','CBS = base CBS/IBS × alíquota efetiva; LC 214 art.12.'],
 ibs:['IBS','Tributo de estados e municípios. Alíquotas reduzidas ou zero dependem do produto e das condições legais.','IBS = base CBS/IBS × alíquota efetiva; LC 214 art.12.'],
 is:['Imposto Seletivo','Incidência restrita às hipóteses legais; não é um regime alternativo da CBS/IBS. Não incidente para o exemplo comum de pão, sem estender essa conclusão a qualquer produto.','LC 214 art.409 e Anexo XVII; alíquotas art.422. Não integra split IBS/CBS.'],
 credito:['Crédito fiscal','Informe os créditos elegíveis das aquisições, separados por tributo. Matéria-prima bruta não permite deduzir automaticamente o crédito.','LC 214 arts.47 a 49; ICMS: LC 87 arts.20 e 33; Simples: LC 123.'],
 split:['Split payment','Simulação da separação de IBS/CBS na liquidação. O padrão desconta parcelas do débito já extintas. Implantação e cobertura dependem dos atos aplicáveis.','LC 214 arts.31–35. Retenção padrão = max(CBS − extinto,0) + max(IBS − extinto,0).'],
 gap:['Comparativo de caixa','Retenção menos créditos de CBS/IBS informados. Não prevê sozinho capital de giro, ressarcimento nem datas de disponibilidade.','(Retenção − crédito CBS − crédito IBS) × volume.'],
 regime:['Tratamento do produto','Padrão, redução de 60% e zero exigem NCM, descrição e condições legais. IS é analisado separadamente.','LC 214 art.125/Anexo I e art.135/Anexo VII.'],
 fator:['Fator de conversão','Converte receita desejada no preço final. Modelo original preservado para estudo; bases encadeadas levam em conta a configuração de ICMS.','Sem IS, com inclusão: f = (1 + CBS + IBS) ÷ (1 − ICMS).'],
 mp:['Matéria-prima bruta','Valor da aquisição de referência. Não estima créditos automaticamente porque composição, alíquotas e elegibilidade podem ser diferentes das da saída.','Informar os créditos documentados na aba Créditos e caixa.']
};
const REGRAS_AUDITADAS=[
 ['R01','Base de CBS/IBS e desconto incondicional','Confirmada na lei','LC 214 art.12 §1º IV, §2º I,III,V e §3º','decompor / ratear','T04, T08','Descontos futuros não são tratados como incondicionais.',FONTES.lc214],
 ['R02','ICMS por dentro e bases cruzadas','Confirmada / aplicação por UF a validar','LC 87 art.13 §1º I; Consulta SEFA/PR 48/2026','fator / decompor','T01, T05','Inclusão parametrizada; ICMS 18% é hipótese.',FONTES.pr],
 ['R03','CBS 11,2% no exemplo','Premissa do autor, a validar','LC 214 art.347; referência TCU encaminhada ao Senado','aliquotas','T01','Não apresentada como alíquota definitivamente fixada.',FONTES.tcu],
 ['R04','Horizontes 2026–2033','Confirmada quanto ao cronograma; taxas futuras estimadas','EC 132/2023, ADCT arts.125–129','aliquotas','T09','2026 não modela PIS/Cofins, compensação ou dispensa.',FONTES.ec132],
 ['R05','Crédito apenas na matéria-prima','Divergente da lei','LC 214 arts.47–49; LC 87 arts.20 e 33','calcularCaixa','T06','Créditos elegíveis separados; sem inferência pela taxa de saída.',FONTES.lc214],
 ['R06','Split integral obrigatório em todo boleto e inclusão de IS','Divergente como regra universal','LC 214 arts.31–35, especialmente art.32 §3º','calcularCaixa','T06, T07','IS excluído. Cronograma e meio de pagamento a validar.',FONTES.split],
 ['R07','Pães e congelados automaticamente na cesta básica','Divergente da lei','LC 214 art.125/Anexo I e art.135/Anexo VII','aliquotas','T09','NCM e descrição técnica pendentes no catálogo de exemplo.',FONTES.lc214],
 ['R08','IS genérico de 15%','Premissa sem fundamento demonstrado','LC 214 arts.409,414,422; Anexo XVII','fator / decompor','T10','IS separado do tratamento CBS/IBS; simulação apenas.',FONTES.lc214],
 ['R09','Margens e faixas comerciais','Premissa gerencial do autor','Sem artigo: política comercial; desconto fiscal depende do art.12','calcularProduto / faixa','T02, T03, T11','Margem mínima uniforme sobre a receita sem tributos.',FONTES.lc214],
 ['R10','Crédito automático por ser cliente PJ','Divergente da lei','LC 214 arts.41,47–49; LC 123 art.23','calcularCaixa','T06','Não prometer crédito em argumento comercial.',FONTES.lc123],
 ['R11','Rateio e arredondamento','Decisão de implementação','Política comercial; regras fiscais do documento a validar','ratear / teto / dinheiro','T08, T12','Centavos por maiores restos, sem presunção de regra fiscal universal.',FONTES.lc214],
 ['R12','Perdas de perecíveis','Confirmada na lei, com condições','LC 214 art.47 §6º','Dados / futura apuração','Pendente','Estorno por perecimento não automatizado na versão inicial.',FONTES.lc214]
];
function estadoInicial(){
 const nomes=[['Pão Francês Congelado','cx 5kg',50,10,20,30],['Pão de Queijo Congelado','cx 10kg',118,14,25,70],['Massa Folhada Pré-assada','cx 4kg',72,12,22,40],['Pão de Forma Tradicional','cx 12un',38,6,18,20],['Bolo Congelado Fatiado','cx 3kg',64,9,28,35]];
 return {versao:4,autoria:AUTORIA,tipo:'interno',ano:Object.keys(PARAMETROS_INICIAIS)[1],selecionado:'p1',tema:'light',modo:'gestor',aba:'preco',revisao:1,parametros:JSON.parse(JSON.stringify(PARAMETROS_INICIAIS)),regra:{baseMeta:'cpv',minMargem:8,descMin:0,descMax:10,modoPrecificacao:'atual'},contexto:{ufOrigem:'',ufDestino:'',regime:'Não informado',observacao:'Estudo B2B. Sem emissão fiscal; ST/FCP/DIFAL, PIS/Cofins e IPI não automatizados.'},produtos:nomes.map(([nome,unidade,cpv,frete,meta,mpBruta],i)=>({id:'p'+(i+1),nome,unidade,cpv,frete,meta,mpBruta,descontoBase:0,preco:null,ncm:'',validado:false,tratamento:'padrao',seletivo:false,faixas:[{de:1,pct:0},{de:10,pct:3},{de:20,pct:5},{de:50,pct:8}],creditos:{icms:0,cbs:0,ibs:0},clienteCredito:{icms:0,cbs:0,ibs:0},caixa:{modo:'desligado',cobertura:100,percentualSimplificado:5,extintoCbs:0,extintoIbs:0,volume:600},clienteMarkup:35})),pedido:{cliente:'Cliente de exemplo',perfil:'Regime não confirmado',prazo:28,data:'',desconto:0,itens:[{produtoId:'p1',quantidade:1,preco:null}]},historico:[]};
}
