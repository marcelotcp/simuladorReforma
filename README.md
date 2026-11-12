MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

# Estudo B2B · versão 4.2

## Usar no Windows

1. Abra `docs/index.html` no Chrome ou Edge, ou acesse o link do GitHub Pages quando habilitado.
2. Em **Gestor**, escolha produto, confira CPV/frete, ajuste o preço e veja as três margens.
3. Em **Fiscal**, confira horizonte, contexto e fontes. Os exemplos não têm NCM, UF nem regime validados.
4. Em **Descontos**, defina as faixas de cada produto e a margem mínima global sobre a operação.
5. Em **Pedido**, informe produto, tabela, quantidade, preço e desconto, inclua os itens e confira margem e cartões de totais. O modo é somente Gestor.
6. Em **Estudo ERP**, gere um pacote comercial ou um backup interno. O comercial exclui custos para uso externo; somente o interno reabre o estudo e restaura também o pedido.

A mesma aplicação contém as abas de precificação e pedido, sempre no modo Gestor.

As áreas ficam no menu lateral esquerdo. No computador, o botão “Recolher menu lateral” mantém apenas os ícones e libera espaço para as tabelas; “Expandir menu lateral” restaura os rótulos. No celular e na prévia de celular, “Abrir menu” mostra a lista vertical; escolher uma área fecha o menu. A navegação não aparece na impressão.

A versão web carrega React, htm, Decimal.js, fontes IBM Plex e a tabela NCM de arquivos locais em docs/assets. Não depende de CDN. Os cálculos e a interface funcionam sem CDN ou conexão. Links legais e WhatsApp precisam de internet. Não há servidor, implantação remota ou envio automático de pedidos.

## Preservar o trabalho

Alterações são salvas no armazenamento local do navegador. Limpeza do navegador, navegação privada, troca de computador ou restrições de arquivos locais podem impedir persistência. Guarde backups internos em JSON. Nenhum dado é enviado a um servidor por este simulador.

O resumo copiado, o link para WhatsApp e a impressão usam apenas dados comerciais. WhatsApp abre uma tela para o operador escolher o destinatário e enviar. A aplicação não emite nota nem boleto bancário.

## Novidades da versão 4.2

Modo único Gestor, ações por ícones, lista de UFs e catálogo NCM oficial incorporado sem importação. Novo pedido com cabeçalho, inclusão de itens, grade e oito cartões de total. Clique nos valores para ver fórmulas e composição. IPI e ICMS-ST são valores apurados externamente e informados à parte; não há cálculo automático de suas bases. Veja `documentacao/ALTERACOES_V4_2.md`.

## Tela de entrada e precificação por tabela

A tela principal agora tem cabeçalho, grade de produtos da entrada e grade de preços por tabela do produto selecionado. Veja `documentacao/ALTERACOES_V4_1.md` para os campos, fórmulas e premissas. Preço consumidor permanece manual; sugerido e preço da reforma são calculados. Operacional e comissão são percentuais sobre o preço efetivamente praticado.

## O que mudou

- Produto unificado com entrada separada para precificação e venda.
- Uma só definição de margem mínima, sobre a receita sem os tributos modelados.
- Modelo original preservado como comparação; modelo de bases encadeadas configurável.
- Tratamento CBS/IBS e faixas por produto; IS separado do tratamento e do split.
- Créditos de compras separados da taxa de saída; sem promessa automática de crédito PJ.
- Parâmetros com fonte, vigência, data, situação e marcação de alteração; histórico local de edições fiscais.
- JSON, código Base64, backup, importação com validação e confirmação, suporte a códigos legados v2.
- Novo pedido, confirmação de remoção, resumo, impressão, tema e preview de celular.
- Fórmulas aplicadas, glossário comum às ajudas e material para o ERP.

O código legado Base64 v2 transportava custos: sua importação é considerada interna, identificada como histórica e sujeita a revisão. Não publica alíquotas como oficiais. A importação legada não recupera dados que não existiam no código, como NCM, autoria original do pacote, créditos e margens mínimas específicas.

## Premissas declaradas

- Cenário inicial: horizonte 2027, ICMS hipotético de 18%, CBS hipotética de 11,2%, IBS de referência 0,1%, IS não incidente para o exemplo.
- O modelo encadeado inicial considera CBS/IBS na base do ICMS, como cenário de estudo apoiado na orientação SEFA/PR; isso exige validação na UF da operação.
- Os produtos começam como padrão **não validado**. Não foi presumida cesta básica a partir do nome comercial.
- O CPV deve conter somente custo líquido de créditos recuperáveis considerados. Frete já incluído no CPV não deve ser repetido.
- O desconto do precificador reduz a receita alvo **depois da formação da meta**; seu equivalente no total é mostrado. O desconto do pedido reduz o valor final em reais e é rateado por item.
- O desconto por quantidade é considerado definido na venda e documentável, sem evento futuro. Desconto condicional não é tratado como redução fiscal de base.
- O resultado é gerencial após os custos/tributos calculados; não é lucro líquido contábil.
- A data do pedido é comercial. O horizonte fiscal é escolhido explicitamente; conferir a compatibilidade entre data de operação e vigência no ERP.

## Limites fiscais e de segurança

Não automatizados: DAS, ICMS-ST, FCP, DIFAL, benefícios e reduções específicas de base, PIS/Cofins, IPI, devoluções, estornos por perecimento, enquadramento NCM, apuração oficial, emissão fiscal e integração bancária. Os horizontes são comparações, não reprodução completa da carga tributária. Em 2026, não confundir destaque de teste com desembolso automático.

No modelo de IS há apenas estudo ad valorem das bases gerais. Monofasia, momento de incidência, alíquotas específicas por unidade e tratamentos especiais não foram implementados. O modelo original aceita IS não incidente; use bases encadeadas para o estudo hipotético de IS.

O split começa desligado. Os cenários padrão e simplificado são hipóteses de caixa, dependentes da implantação e dos atos aplicáveis. Créditos disponíveis não são considerados automaticamente débitos extintos de uma operação. O comparativo de retenção menos crédito não prevê sozinho capital de giro ou ressarcimento.

Modo único Gestor: HTML e armazenamento contêm informações internas. Para uso no ERP, autenticação e autorização devem existir no servidor. Base64 não é criptografia; o piso comercial também é informação da política de preços.

## Publicação para a equipe

O site está preparado em `docs/index.html`, com dados fictícios e sem servidor.

No GitHub, abrir **Settings → Pages → Build and deployment** e escolher:

- Source: **Deploy from a branch**.
- Branch: **main**.
- Folder: **/docs**.

Após salvar e concluir a publicação, o endereço padrão será:

https://marcelotcp.github.io/simuladorReforma/

O endereço acima só fica disponível quando o Pages estiver habilitado e a publicação concluir. O repositório é público; não versionar dados reais de clientes, custos internos, senhas ou backups de uso. Os dados digitados no simulador são locais ao navegador, sem sincronização entre usuários.

Para atualizar o site: alterar os fontes, executar os testes, executar `python gerar.py` e incluir o `docs/index.html` regenerado no commit. A autoria deve ser preservada no topo, no rodapé e no JSON.

Para relatar um problema, abrir uma Issue com versão, aba, valores utilizados, comportamento esperado e observado. Usar dados fictícios nas capturas e anexos.

## Estrutura de desenvolvimento

| Arquivo | Função |
|---|---|
| `src/motor.js` | Funções puras, validação, formação/decomposição de preço, pedido e caixa |
| `src/dados.js` | Exemplos, parâmetros, glossário, autoria e rastreabilidade |
| `src/aplicacao.js` | Interface React com htm |
| `src/estilo.css` e `src/grade.css` | Aparência, temas, responsividade e impressão |
| `gerar.py` | Incorpora fontes/bibliotecas e gera os três HTMLs |
| `testes/motor.test.cjs` | Testes de resultados e invariantes de cálculo |
| `testes/interface.test.cjs` | Renderização React e eventos, sem navegador |
| `documentacao/` | Contratos, entidades, arredondamento, validação e testes esperados |
| `originais/` | Os anexos recebidos, preservados para comparação |

Não é necessário npm para usar ou executar os testes. Para regenerar: Python 3. Para testar: Node.js moderno (recomendado 18 ou superior). As dependências estão incorporadas, com versões registradas em `LICENCAS.md`.

```bash
node testes/motor.test.cjs
node testes/grade.test.cjs
node testes/pedido.test.cjs
node testes/interface.test.cjs
python gerar.py
```

O gerador grava o site em `docs/index.html`. Os fontes mantêm nomes de domínio em português.

## Validação realizada

16 testes básicos do motor, 12 de entrada/grade, 12 de pedido/cadastros e 16 de renderização/interação React: 56 verificações. Resultados em JSON na pasta de testes.

Conferência visual em navegador não concluída: a execução local e o acesso ao arquivo foram bloqueados pelo ambiente. Os testes React não certificam aparência, teclado virtual, impressão real ou WCAG 2.2 AA. Esses itens devem ser conferidos no Chrome/Edge do usuário, incluindo celular real e leitor de tela.

## Próximas validações com o responsável tributário

1. UF de origem/destino, natureza da operação, regime e opção IBS/CBS do Simples.
2. NCM existente na base oficial incorporada, descrição técnica, composição e estágio de preparo de cada produto. Existência do código não confirma enquadramento.
3. Alíquotas efetivamente fixadas por ato vigente; benefícios, ST, FCP e DIFAL.
4. Composição das bases e efeitos cruzados por UF/período, inclusive IPI e IS quando aplicáveis.
5. Créditos elegíveis, documento, extinção, apropriação, estornos e disponibilidade.
6. Desconto definido na nota versus desconto dependente de evento futuro.
7. Procedimento e cronograma do split, cobertura do boleto, conciliação e ressarcimento.
8. Política do documento fiscal para precisão, arredondamento e totalização.

**A implementação precisa ser validada por contador ou advogado tributarista antes de orientar produção fiscal.**

MARCELO CLEITON, criador do projeto. Análise do impacto da Reforma Tributária nas aplicações da SN SISTEMA. © 2026 Marcelo Cleiton

## Empacotamento web

A versão para Pages divide a base NCM em partes locais e usa scripts defer na ordem de dependências. A base e as regras são idênticas à versão 4.2 entregue em HTML único. Manter a pasta docs/assets junto de docs/index.html ao copiar ou publicar o site.

### Ajuste de leitura e densidade

Layout de referência: notebook 1366 × 768, com largura máxima de 1440 px. A precificação concentra oito colunas; regime, alíquotas, despesas e frete ficam nos parâmetros expansíveis de cada tabela. Cabeçalhos têm fundo contrastante nos dois temas. Nomes abreviados mantêm ajuda e fórmulas. Em telas pequenas, a grade preserva rolagem para não reduzir campos a alvos ilegíveis.

### Desconto por quantidade no pedido

A faixa cadastrada no produto tem prioridade: ao atingir a quantidade, o desconto é aplicado diretamente ao preço, mesmo com desconto do item vazio/zero e limite manual da tabela igual a zero. Não acumula com o desconto do item. Sem faixa positiva aplicável, usa o desconto manual do item. A faixa respeita o intervalo global do produto; o limite da tabela restringe o desconto manual. Desconto geral da nota vem depois, por rateio, e não elimina os alertas de margem.

O campo “Desconto do item” conserva o percentual manual; o percentual efetivamente aplicado aparece separado, com sua origem e fórmula. Editar a quantidade reavalia a faixa. `descontoModo: "automatico"` de versões anteriores identifica um cache legado: seu percentual não vira desconto manual quando a quantidade sai da faixa. A regra atual também recalcula pedidos antigos ao abri-los. Arredondamento: preço unitário após o desconto escolhido ao centavo, depois multiplicação pela quantidade. Motor compartilhado: `descontoPedido`, usado no pedido Gestor e comercial. Regressões: G08, P02, P13–P15, UI17.
### Integração da aba Fiscal

`Motor.prepararCenario(estado)` é uma projeção pura que encaminha contexto da empresa e chave do horizonte aos cálculos, sem mutar os cadastros. `fiscalTabela` resolve alíquotas e composição centralizadas para precificação, descontos, pedido, créditos/caixa e análise de sensibilidade. A composição da tabela é usada como hipótese legada somente enquanto o regime da empresa não estiver informado. Regime e tratamento padrão/reduzido/zero são conceitos diferentes.

- Alíquotas próprias por tabela/horizonte são exceções efetivas explícitas. Editar uma taxa não congela as demais. Exceções completas de versões anteriores são preservadas e podem ser retiradas por tabela ou para todas as tabelas do produto/horizonte.
- Alterar parâmetros recalcula o sugerido, o líquido e as margens; não substitui o preço de venda manual. Itens do pedido preservam seu preço bruto e usam a decomposição fiscal vigente no cenário.
- Simples total herda `parametros[ano].simplesEfetivo`, informado pelo responsável e com a fonte/vigência do horizonte. A simulação não apura o DAS nem separa suas parcelas. LC 214/2025 art.41 §§2º–4º e LC 123/2006 art.13.
- Simples com IBS/CBS no regime regular fica com cálculo pendente: separar parcelas do DAS antes de implementar o cenário híbrido. Não somar DAS total com os mesmos tributos novamente.
- UF e NCM não são resolvedores automáticos de alíquota/enquadramento. Mudanças de contexto ou parâmetros invalidam a declaração local de revisão. A chave do horizonte não depende do ano digitado na data de início.

Rastreabilidade: herança central → `prepararCenario`/`fiscalTabela` → G13; redução/zero no pedido → G14; exceção parcial/horizonte → G15; Simples e cenário híbrido → G16; fluxo completo da interface → UI18. Validação tributária profissional continua necessária.

### Bases de cálculo visíveis

`Motor.memoriaTributos(resultado, parametro, quantidade)` devolve, para cada imposto, base unitária, base do item, alíquota, imposto unitário, imposto do item, fórmula da base, fonte e atualização. Usa a decomposição já calculada e multiplica pela quantidade, sem introduzir novo arredondamento nas bases.

O componente `BasesTributarias` apresenta a mesma memória na precificação, no Fiscal e nos detalhes do item do pedido. No pedido, o resultado utilizado já contém descontos e rateios. O JSON de estudo contém `resultado.basesTributarias` e `resultado.basesPorItem`. Bases e impostos são exibidos em centavos, com precisão adicional apenas na opção técnica; isso não altera a política de cálculo.

No Simples total, bases e valores individuais ficam como não segregados; a base da estimativa agregada é o preço de venda, sem afirmar que isso corresponde à apuração oficial do DAS. IPI e ICMS-ST continuam como valores informados, sem inventar base ou alíquota. Rastreabilidade: memória das bases → decomposição do cenário existente (`fator`, `decompor`, `calcularTabela`) → `memoriaTributos` → G17/G18/UI19.

### Tema escuro

Paleta de tela centralizada em `src/tema-escuro.css`, carregada após os estilos compartilhados. Paleta inspirada em Primer/GitHub e Fluent/Windows: fundo grafite (#0d1117), superfícies em camadas, campos com linha inferior visível, cabeçalhos destacados, valores calculados distintos dos editáveis, ajuda com fundo escuro e alertas sem depender apenas da cor. O CSS é restrito a `@media screen`, preservando a impressão. As principais combinações de texto foram conferidas por luminância relativa (mínimo 4,5:1) e o contorno dos campos acima de 3:1; isso não equivale a uma certificação integral de acessibilidade.

### Leitura de números

Valores monetários exibidos em centavos e percentuais com até duas casas. Quantidades mantêm até três casas nos campos de estoque; fatores técnicos usam até quatro casas na leitura padrão. As fórmulas visuais são aproximadas e não alimentam o cálculo. A memória de bases oferece “Ver precisão técnica (opcional)” com até doze casas; o JSON conserva os valores do motor. Não houve alteração no arredondamento comercial, fiscal ou nos rateios.

### Conciliação do preço até a base CBS/IBS

Os detalhes mostram `preço final − ICMS − CBS − IBS = base CBS/IBS`, com valores por unidade e para o item. O IS, quando incidente no cenário, permanece na base e só é retirado na etapa posterior para chegar à receita sem tributos. Também se mostra a inversão `(preço − ICMS) ÷ (1 + CBS% + IBS%)`, para explicar como a base é encontrada, em vez de apenas subtrair resultados prontos.

No pedido, a composição comercial aparece antes: bruto do item − desconto do item − desconto geral rateado + outras despesas rateadas = valor submetido à decomposição. IPI e ST informados à parte não são incluídos artificialmente nessa base. O motor não passa a apurar esses tributos.

`Motor.conciliarPrecoBase` fornece a conciliação estruturada para a tela e o JSON (`resultado.conciliacaoBase` e conciliações por item). Uma linha de ajuste pode fechar apenas a soma dos valores exibidos em centavos; não muda valores internos, tributos, receita ou bases. Rastreabilidade: cenário de bases existente → `conciliarPrecoBase` → G19/UI20. A composição fiscal segue sujeita à validação profissional.

### Densidade da grade e referências visuais

Cabeçalhos de seção usam faixa de fundo, marcador lateral e separador para identificar o início das tabelas; rodapés discretos indicam seu término. A precificação mantém o alerta agregado apenas quando há pendências. Instruções gerais passam para a ajuda do cabeçalho e para o glossário. Selecionar tabela, aplicar sugerido e consultar/remover permanecem disponíveis por ícones na mesma linha dos valores. A densidade de desktop reduz alturas sem reduzir os alvos de toque no celular.

Referências de tema: Primer Theme Reference (https://primer.style/product/getting-started/react/theme-reference/) e Color in Windows (https://learn.microsoft.com/windows/apps/design/style/color). Adaptação ao ERP, sem pretender reproduzir integralmente a interface desses produtos.

### Alertas na análise “E se…”

O comparativo usa a tabela de venda selecionada e o mesmo motor da precificação. Cada cenário mostra resultado por unidade, três margens e situação: vermelho para prejuízo, amarelo para margem abaixo do mínimo ou custo pendente, verde para dentro da política. O preço atual, o equilíbrio e o piso técnico têm identificação própria. “Detalhar” abre a composição do resultado e as bases tributárias do cenário; “Usar preço” altera somente a tabela selecionada. Cenários com custo pendente não podem ser adotados. Comparar não altera o preço. A análise é anterior aos descontos e rateios do pedido.

Os avisos usam texto e ícones além das cores. A entrada dos cenários e a ênfase do aviso têm animações breves, desativadas por `prefers-reduced-motion`. Não há pulsação contínua. Na modalidade comercial sem CBS/IBS, o comparativo separa preço comercial e preço projetado na Reforma; aplicar um cenário grava o preço comercial. Testes UI21–UI24 verificam os estados comerciais, aplicação na tabela correta, correção pelo piso técnico, pendência de custo e erro fiscal.

### Revisão dos cálculos e das memórias

Correções no fechamento do pedido projetado, bases e tributos, proteção da meta no preço sugerido, normalização monetária e identificação de comercial/faturamento no caixa, resumo e memórias. A conciliação mostra a passagem entre os dois totais, incluindo a recomposição do ICMS e resíduos de apresentação. Ver `documentacao/AUDITORIA_CALCULOS.md`. A suíte de auditoria usa referências independentes e inclui o caso de R$ 739,30 → R$ 822,84.
