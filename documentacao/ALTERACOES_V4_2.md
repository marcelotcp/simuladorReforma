MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

# Versão 4.2 — Gestor, pedido e cadastros válidos

## Interface

- Modo único Gestor, inclusive ao abrir arquivo ou preferência da versão anterior. Não há seletor Vendedor. Arquivos comerciais sem custos podem ser exportados como tabela, mas não reabrem um estudo de gestão.
- Botões de ação com SVG incorporado, nome acessível e tooltip. Navegação e valores calculados mantêm texto/valor visível. O uso de ícone não esconde o nome da ação para leitores de tela.
- Superfícies mais leves, sem contorno nas seções e cartões. Campos mantêm indicação de foco. Divisores aparecem somente quando ajudam a distinguir linhas.
- Pedido: cabeçalho, formulário de inclusão/edição, grade e rodapé com oito cartões. A composição de cada cartão pode ser consultada clicando no valor e também pelo tooltip.

## UF e NCM

UF usa uma lista fechada com as 26 siglas estaduais e Distrito Federal. O valor vazio significa pendência; siglas inexistentes não são aceitas em um arquivo importado. NCM é digitado ou escolhido entre sugestões da tabela incorporada, sem importação de cadastro pelo usuário.

O catálogo tem **10.516 códigos de oito dígitos**, obtidos do endpoint oficial Classif/Siscomex em **11/11/2026**. Proveniência em `ncm-metadados.json`. A Receita informa que o download contém a tabela vigente, sem histórico ou códigos futuros. Por isso o aplicativo identifica a data da base e não promete vigência futura de um código em 2027/2029/2033.

- Fonte: https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/download-ncm-nomenclatura-comum-do-mercosul
- Download: https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
- Referência de UFs: https://servicodados.ibge.gov.br/api/v1/localidades/estados

O teste não se limita a oito dígitos: confirma existência no catálogo. Um código inexistente não fica gravado no produto. NCM vazio permanece pendente no estudo. Não se registra enquadramento revisado sem NCM existente, UFs preenchidas e regime informado. Existência do código não confirma que ele classifica corretamente o produto.

## Campos do item

O formulário contém produto, tabela de preço, quantidade, preço unitário antes do desconto e desconto percentual. O desconto explícito do formulário substitui o desconto por faixa; não é acumulado automaticamente com a faixa. Pedidos antigos sem esse campo preservam a interpretação anterior dos preços.

`preço praticado = arredondar_centavo(preço digitado × (1 − desconto do item))`

`subtotal do item = quantidade × preço praticado`

O desconto geral da nota é rateado pelos subtotais, em centavos, pelo método dos maiores restos. A edição de uma linha preserva seu produto/tabela e parâmetros; um produto já presente não é duplicado silenciosamente.

## Totalizadores e fórmulas

| Cartão | Cálculo / interpretação |
|---|---|
| Frete CIF incluído | Soma de quantidade × custo de frete unitário da tabela. É demonstrativo: já coberto pelos preços, não somar novamente. |
| Descontos | Reduções explícitas ou por faixa dos itens + desconto geral da nota. Preço negociado pode diferir da tabela sem ser uma linha adicional de desconto. |
| Outras despesas cobradas | Valor adicional informado no cabeçalho, com tributos modelados incluídos, rateado proporcionalmente pelos itens. Não é o percentual operacional interno. |
| CBS + IBS | Soma dos valores calculados por item; o tooltip separa CBS e IBS. Já estão dentro dos preços, não somar novamente. |
| IPI informado | Montante apurado externamente, acrescido uma vez, fora dos preços dos itens. Não é cálculo automático de incidência ou base. |
| ICMS-ST informado | Montante apurado externamente, acrescido uma vez, fora dos preços dos itens. Não calcula MVA, pauta ou FCP-ST. |
| Total com impostos | Bruto dos itens − descontos dos itens − desconto geral + outras despesas cobradas + IPI informado + ICMS-ST informado. |
| Total sem CBS e IBS | Total com impostos − CBS − IBS. Mantém ICMS, IS, Simples, IPI e ST quando existentes. Não significa remover todos os tributos. |

As outras despesas cobradas integram a composição comercial de cada item e a decomposição de seus tributos no modelo atual. O rateio de despesa não reduz artificialmente o percentual de desconto avaliado contra a política: essa verificação usa o preço comercial antes da adição dessas despesas.

`total comercial do item = subtotal − desconto geral rateado + outras despesas rateadas`

`receita sem tributos = total comercial do item ÷ fator da tabela`

`resultado = receita sem tributos − custo líquido − frete − operacional − comissão`

IPI e ST informados são repasses na composição do total e não aumentam o lucro gerencial. A aplicação não recalcula eventuais efeitos do IPI sobre a base do ICMS, nem valida se o ST era devido ou se seus valores estavam embutidos. A incidência e as bases exigem o contexto e as regras fiscais específicas, inclusive LC 87 art.13. As exclusões da base IBS/CBS e demais condições continuam sujeitas à LC 214 art.12 e especificações aplicáveis do documento fiscal. O uso de montantes informados não é apuração tributária oficial.

## Guarda-corpos

Prévia de margem antes da inclusão. Conferência efetiva por item após os ajustes gerais. Alertas específicos para custo pendente, prejuízo, margem inferior ao mínimo e desconto fora do intervalo. Resultado global favorável não aprova um item irregular.

O alerta mostra a diferença para o piso técnico. A ação de correção ajusta preço e retira o desconto geral, com novo cálculo dos itens. Impressão/cópia/WhatsApp são liberados somente com cliente, data e prazo válidos e todos os itens seguros. A existência de NCM e UF é uma validação cadastral; não equivale a aprovação fiscal do pedido.

## Testes

16 testes básicos do motor, 12 de grade, 12 de pedido/cadastro e 16 de renderização/interação React: **56 verificações**. Incluem cadastro inexistente, 27 UFs, total sem CBS/IBS, ausência de dupla soma, rateio de despesas, preservação do frete, repasse de IPI/ST e bloqueio por margem.

Conferência visual em navegador, leitor de tela e certificação WCAG permanecem pendentes; renderização React não substitui essas verificações.

**Validar a implementação com contador ou advogado tributarista antes de orientar produção fiscal.**

MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton
