MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

# Versão 4.1 — entrada e precificação por tabela

## Organização da janela

1. Cabeçalho: estabelecimento, busca por produto/documento/fornecedor, estoque, horizonte fiscal, base da meta e margem mínima.
2. Grade central: produto, unidade, custo bruto, créditos, custo líquido, quantidade da entrada, estoque atual e peso da unidade de venda. Selecionar uma linha altera a grade inferior. “—” significa estoque ainda não informado.
3. Grade inferior: nome da tabela, composição tributária, preço consumidor, sugerido, desconto máximo, mínimo comercial, preço da reforma, margem desejada, ICMS/CBS/IBS/IS/Simples, operacional, comissão, frete por tonelada e ações.

As grades têm rolagem horizontal para preservar campos editáveis legíveis. A primeira coluna da precificação permanece fixa. A memória abaixo da grade mostra todos os números e origens da linha escolhida. Valores calculados são botões que abrem essa memória; não são campos editáveis.

## Decisões comerciais adotadas

| Campo | Origem / significado | Fórmula |
|---|---|---|
| Custo líquido | Entrada, por unidade de venda | Bruto − desconto − créditos recuperáveis informados |
| Estoque | Quantidade informada; não participa da formação de preço | Sem cálculo de inventário nesta versão |
| Peso kg/un. | Peso da mesma unidade usada para custo e venda | Informado pelo operador |
| Frete unitário | Conversão do valor por tonelada | R$/t × kg/un. ÷ 1.000 |
| Preço consumidor | Digitado pelo usuário; valor levado à venda pela tabela ativa | Não é sobrescrito ao editar percentuais |
| Desconto | Desconto máximo da tabela, não desconto automático acumulado | Percentual sobre consumidor |
| Preço mínimo | Mínimo comercial após desconto máximo | Consumidor × (1 − desconto) |
| Preço da reforma | Consumidor líquido dos tributos modelados na composição ativa | Consumidor ÷ fator |
| Operacional | Percentual sobre o preço final efetivamente praticado | Preço praticado × percentual |
| Comissão | Percentual sobre o preço final efetivamente praticado | Preço praticado × percentual |
| Resultado | Após tributos, custo líquido, frete e despesas da linha | Preço da reforma − custo − frete − operacional − comissão |
| Piso técnico | Menor praticado que preserva a margem mínima global | Custo total ÷ ((1−mínimo)/f − operacional − comissão), teto |

“Preço da reforma” é o nome solicitado para um indicador gerencial de decomposição; não é uma nova base jurídica universal nem um preço adicional a cobrar. Não desconta o custo nem as despesas da operação. “Margem de lucro” na grade é a meta editável; a margem efetiva aparece na memória.

## Formação do sugerido

Considere `C` o custo líquido, `F` o frete unitário, `f` o fator tributário, `m` a meta, `o` o percentual operacional, `c` a comissão e `d` o desconto máximo. Percentuais são frações, por exemplo 5% = 0,05.

Meta sobre a receita líquida:

`sugerido = teto_centavo((C + F) / ((1 − m) / f − o − c) / (1 − d))`

Meta sobre o CPV:

`sugerido = teto_centavo((C + F + C × m) / (1 / f − o − c) / (1 − d))`

Essa política protege a meta mesmo após a concessão do desconto máximo. Quanto maior o desconto permitido, maior o sugerido necessário. O preço consumidor manual não acompanha automaticamente a recomendação; usar “Aplicar sugerido” quando desejado.

Denominadores nulos/negativos são bloqueados como combinação inviável. Não são convertidos em preço zero nem em infinito. O mínimo comercial é confrontado com o piso técnico e tem ações para ajustar consumidor ou aplicar o sugerido.

## Composição tributária

- Regular: usa ICMS, CBS, IBS e IS efetivos da linha/horizonte e o modelo de bases já parametrizado. O percentual do Simples fica armazenado para comparação, sem ser somado.
- Simples total: usa a alíquota efetiva total informada. ICMS/CBS/IBS regulares não são somados novamente. Não deriva a taxa de anexo/RBT12 e não calcula guia DAS.
- A opção de IBS/CBS fora do DAS, sublimites, ICMS fora do Simples e outras composições híbridas exigem regras próprias; não foram presumidas. IS positivo com Simples total é bloqueado nesta composição simplificada.
- Tributos editados na grade são alíquotas **efetivas**, não uma nova referência a ser reduzida novamente. As alterações pertencem à tabela e ao horizonte selecionado, com fonte e data. Sem alteração local, herdam o enquadramento/horizonte do produto.
- Mudança de percentual não transforma uma hipótese em taxa legal. A validação tributária continua necessária.

## Ligação com a venda

A linha “Usada na venda” fornece consumidor, tributos e despesas ao motor de pedido. A formação do sugerido não concede desconto automaticamente. As faixas por quantidade continuam disponíveis; o percentual aplicado é limitado pelo máximo da tabela e pela política geral, com indicação no pedido. Não se soma desconto da tabela ao da faixa. Um desconto adicional do pedido ainda passa pelas validações.

Pacotes comerciais não transportam entrada, custos ou margens. Incluem preço, piso autorizado e limite comercial de desconto. O pacote interno mantém a grade e a entrada para reabertura do estudo.

## Migração e limites

Os custos anteriores viram custos brutos iniciais sem créditos presumidos. Os estoques não foram inventados. O peso é reconhecido somente quando a unidade já o descreve, como “cx 5kg”. Havendo frete anterior sem peso conhecido, a linha fica pendente até informar o peso ou redefinir explicitamente o frete por tonelada.

As tabelas “Atacado · exemplo” e “Distribuidor · exemplo” são demonstrações editáveis, não tabelas reais fornecidas pela empresa. A tabela padrão preserva a formação original sem despesas novas. O formato JSON continua na versão 4, com campos adicionais de entrada e tabela; a interface é 4.1.

Rascunhos podem guardar falta de peso ou combinação comercial inviável para correção posterior. Publicação comercial exige cálculo válido e preço dentro da margem mínima. Não há cálculo de estoque por movimentações, integração de NF-e ou apuração tributária oficial.

## Verificação

16 testes anteriores do motor + 12 testes novos de entrada/grade + 12 verificações React. Os novos testes verificam conversão de frete, custo líquido, despesas, percentuais, preço manual preservado, preço líquido, composição do Simples, teto de desconto, venda por tabela e migração.

A conferência visual real em navegador e a auditoria WCAG permanecem pendentes devido às restrições do ambiente. Os testes de renderização e eventos não as substituem.

**Validar regras e implementação com contador ou advogado tributarista.**

MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton
