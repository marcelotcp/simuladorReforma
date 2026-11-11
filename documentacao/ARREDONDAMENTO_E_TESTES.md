MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

# Arredondamento e referências de teste

Estas são decisões do simulador. Não substituem especificações de NF-e, regras de validação do documento ou normas de cada tributo.

| Operação | Decisão | Motivo |
|---|---|---|
| Cálculo intermediário | Decimal.js, precisão de 32 dígitos significativos | Reduzir os erros de ponto flutuante binário |
| Alíquota reduzida | Multiplicar a referência pelo fator sem fechar em duas casas | Preservar taxas como IBS 0,04% |
| Preço sugerido e mínimo | Teto ao centavo | Preservar a receita alvo e a margem mínima |
| Preço negociado/por faixa | Centavos, half-up | Fixar o preço praticado comercialmente |
| Desconto seguro percentual | Piso em duas casas | Evitar sugerir desconto acima do limite |
| Subtotal do item e desconto global | Centavos | Total comercial reprodutível |
| Rateio do desconto | Proporcional, maiores restos em centavos | Soma dos rateios igual ao desconto; empate pela posição |
| Tributos e margens internos | Precisão intermediária, sem fechar cada etapa | Não acumular arredondamentos prematuros |
| Exibição de tributos | Duas casas para leitura; detalhamento com mais casas | Componentes exibidos podem não somar exatamente o total exibido |

A memória registra esse eventual resíduo de exibição. A aplicação não distribui silenciosamente um centavo em um tributo para fazê-lo coincidir com o boleto. A totalização fiscal definitiva é uma etapa própria do ERP e precisa seguir a especificação aplicável.

O motor retorna números serializáveis após o cálculo decimal. Para o ERP, contratos monetários podem usar strings decimais ou inteiros de centavos, com escalas explícitas para quantidades e alíquotas; evitar `double`/`float` para valores monetários no Java/SQL.

## Valores esperados

Entradas: CPV 50, frete 10, meta 20% sobre CPV, desconto zero, ICMS 18%, CBS 11,2%, IBS 0,1%, IS não incidente, margem mínima 8% sobre receita.

| Resultado | Modelo original | Bases encadeadas, inclusão CBS/IBS no ICMS |
|---|---:|---:|
| Receita alvo | 70 | 70 |
| Fator | 1,3325121951219512 | 1,3573170731707317 |
| ICMS teórico antes de fechar preço | 15,365853658536585 | 17,10219512195122 |
| CBS teórica | 7,84 | 7,84 |
| IBS teórico | 0,07 | 0,07 |
| Total teórico | 93,27585365853659 | 95,01219512195122 |
| Preço sugerido, teto | 93,28 | 95,02 |
| Preço mínimo, teto | 86,91 | 88,53 |
| Preço após 5% sobre sugerido | 88,62 | 90,27 |
| Margem/operação após 5% | 9,782518949089288% | 9,782846582204606% |

Depois de fechar o preço em centavos, a decomposição inversa recalcula a receita e o resultado a partir desse preço. Portanto, a receita pode passar de 70,000000 para pouco mais de 70,00. Não force o resultado a ser exatamente 10,00 após esse fechamento comercial.

## O que os testes demonstram

T01–T03 cobrem os casos obrigatórios e a mudança de bases. T04 testa mistura de produtos padrão e zero. T05 verifica conservação em 500 cenários. T06/T07 separam split e créditos. T08 testa rateio. T09 preserva precisão de redução. T10 testa IS ad valorem. T11 rejeita parâmetros/faixas inválidos. T12 testa mínimo e desconto conservador em 100 cenários. T13 valida importação. T14 testa pedido com pacote comercial sem CPV. T15 testa faixas por produto. T16 evita duplicar desconto da receita.

As verificações UI01–UI12 usam React Test Renderer: renderização, navegação, alteração de preço, exportação comercial, ocultação de dados, temas, remoção e importação. Não executam browser, captura visual ou leitor de tela.

MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

Versão 4.1: G01–G12 cobrem a entrada e a grade. As decisões comerciais completas estão em ALTERACOES_V4_1.md.
