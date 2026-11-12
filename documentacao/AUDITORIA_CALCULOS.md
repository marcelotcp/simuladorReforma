# Auditoria matemática dos cálculos — 12/11/2026

Branch: `feature/precificacao-sem-cbs-ibs`. A main não foi alterada nesta revisão.

## Correções

- Pedido: tributos e bases da projeção são decompostos a partir do total projetado do item, fechado em centavos. Não se usa o teto unitário da grade multiplicado pela quantidade para apurar esses tributos.
- Projeção corrigida após a definição do ICMS já incluído no preço comercial: o multiplicador é `1 + (1 − ICMS) × (CBS + IBS)`. Preserva o valor e a base do ICMS comercial. A projeção acrescenta somente CBS/IBS e não aplica novamente a hipótese de bases cruzadas. O preço projetado fecha por item em centavos (half-up); a diferença de fechamento é explícita, sem alterar os tributos.

- Preço sugerido: o alvo praticado é fechado para cima em centavos antes de recompor o desconto. Assim, o arredondamento unitário posterior não reduz o resultado abaixo da meta.
- Entradas monetárias do pedido: preço digitado, desconto geral, despesas cobradas, IPI e ST são fechados uma vez em centavos; rateios usam os valores normalizados. Unidades fracionárias após rateios mantêm precisão interna.
- Memória: total comercial e total projetado têm fórmulas distintas. A passagem até as bases começa pelo total correspondente. O ICMS incluído não é somado novamente; resíduos da soma exibida são identificados.
- Precisão: os tributos permanecem precisos internamente. Resíduos visuais não são distribuídos silenciosamente em impostos.
- Caixa/créditos: no modo sem CBS/IBS no comercial, os débitos, o split e o recebimento usam a projeção de faturamento.
- Resumo e JSON: distinguem os dois totais e usam as mesmas bases dos cartões e dos detalhes do item.
- Validação: modelos, modalidades e procedimentos de split desconhecidos, além de valores negativos ou não finitos de rateio, são bloqueados.

## Caso reproduzido da imagem

10 unidades a R$ 76,22; faixa de 3%; horizonte 2027; ICMS 18%, CBS 11,2%, IBS 0,1%; inclusão de CBS/IBS no ICMS habilitada; sem IPI/ST ou adicionais.

| Etapa | Valor |
|---|---:|
| Bruto | R$ 762,20 |
| Desconto após fixar a unidade em R$ 73,93 | − R$ 22,90 |
| Total comercial | R$ 739,30 |
| CBS da projeção, exibida | + R$ 67,90 |
| IBS da projeção, exibido | + R$ 0,61 |
| Total projetado | **R$ 807,81** |

CBS e IBS são fechados separadamente em centavos por item: R$ 67,90 + R$ 0,61 = R$ 68,51. O total projetado é R$ 739,30 + R$ 68,51 = R$ 807,81. A base é R$ 739,30 − ICMS já incluído; não se subtraem CBS/IBS para formar essa base e não há ajuste artificial nela.

## Verificação

`node testes/auditoria-calculos.test.cjs`: 10 grupos com referência numérica fixa, 384 combinações de horizonte/modelo/base/regime/tratamento/modalidade/despesas, 1.000 rateios contra um oráculo de inteiros BigInt, 240 formações de sugerido/piso e 96 verificações de limites de arredondamento.

A matriz inclui Simples total, taxas reduzidas e zero, IS e as duas opções de inclusão no ICMS. Há verificações de múltiplos produtos, descontos, rateios, frete, créditos, comissão, despesas, IPI e ST informados e split. A suíte anterior continua sendo executada; UI25/UI26 conferem valores dos cartões, memórias, resumo e identificação da projeção no caixa.

Executar todas as suítes:

```bash
node testes/motor.test.cjs
node testes/grade.test.cjs
node testes/pedido.test.cjs
node testes/precificacao-modalidade.test.cjs
node testes/auditoria-calculos.test.cjs
node testes/interface.test.cjs
python gerar.py
```

## Alcance

A revisão verifica a matemática e a consistência das telas dentro das premissas configuradas do simulador. Não é homologação de legislação, alíquotas, enquadramento, apuração oficial ou emissão de documento fiscal. A conferência visual em navegador real continua pendente; testes React não substituem essa conferência. Não existe garantia de ausência de defeitos fora dos cenários exercitados.

## Regressão do ICMS já incluído

A versão anterior projetava R$ 822,84 ao recompor o ICMS. Esse comportamento foi removido da modalidade sem CBS/IBS. O ICMS do exemplo permanece R$ 133,074 internamente (R$ 133,07 na apresentação), com base comercial de R$ 739,30. Somente CBS e IBS aumentam o total para R$ 807,81. N07–N09 verificam a preservação do ICMS, descontos/rateios, as duas posições da opção histórica de bases e o Simples total. A opção de bases cruzadas fica desabilitada nessa modalidade e permanece disponível no modo Atual para comparação.

## Base direta e fechamento dos tributos

A memória da modalidade comercial tem exatamente três etapas: preço comercial, ICMS incluído e base de CBS/IBS. Exemplo: R$ 100,00 − R$ 18,00 = R$ 82,00. Em seguida, CBS = arredondar(82 × 11,2%) = R$ 9,18; IBS = arredondar(82 × 0,1%) = R$ 0,08; total = R$ 109,26. Não usar o total projetado como preço de entrada da base e não subtrair CBS/IBS dessa base.

N10 e UI27 conferem a composição de três linhas e a ausência de deduções de CBS/IBS ou de ajustes nessa memória. Os valores antes do fechamento permanecem no JSON como `cbsPreciso` e `ibsPreciso`; os campos `cbs` e `ibs` da projeção representam os valores fechados por item, divididos pela quantidade para referência unitária. O modelo Atual mantém sua política histórica de comparação.
