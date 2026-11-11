# Modalidade de precificacao comercial sem CBS e IBS

Branch de desenvolvimento: `feature/precificacao-sem-cbs-ibs`.

## Segurança e retorno

A branch `main` permanece inalterada. Ponto de partida: `6a460aeca2198ec1808180183d02533570e4e807`. Voltar para `main` restaura o comportamento anterior sem reverter commits. Não mesclar antes da homologação.

## Modos

- `atual` (padrão para novos estudos e backups antigos): preserva a formação do preço, bases e total do pedido anteriores.
- `sem_cbs_ibs`: forma o preço comercial a partir dos custos, margens, ICMS, IS e despesas aplicáveis, porém sem CBS/IBS; em seguida projeta o preço de faturamento com as taxas efetivas completas e sua interação parametrizada com o ICMS. Para Simples total, preserva o cálculo da alíquota efetiva do DAS, sem decompor IBS/CBS indevidamente.

A edição do preço da tabela e do pedido sempre se refere ao **preço comercial** no novo modo. Descontos por quantidade, do item e desconto geral incidem sobre o valor comercial antes da projeção. O total projetado é arredondado em centavos por item; campos de base e imposto unitários podem ter pequenas diferenças visuais de arredondamento.

## Limites

O simulador é estudo gerencial, não emite documento fiscal. CBS e IBS projetados e suas bases dependem de enquadramento e validação tributária; ICMS-ST, IPI e demais tributos informados à parte continuam fora da apuração automática. O acréscimo entre os dois preços pode incluir reflexos de bases encadeadas, e não corresponde necessariamente apenas à soma isolada dos dois tributos.

Testes: `node testes/precificacao-modalidade.test.cjs` e suíte existente (`testes/*.test.cjs`).
