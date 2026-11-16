# Plano: drill-down "até o extremo do detalhe" no Detalhamento financeiro

Status: **proposta para aprovação. Nada implementado.** Mockup: `docs/mockup-drilldown.html` (dados fictícios).

## 1. O que você pediu
Clicar em qualquer número do detalhamento (taxas do Asaas, "entrou pelo Asaas, 66 Pix", por fora, cortesia, pendente, tokens), ver **cada pagamento um a um**, com a taxa descontada, abrir o **comprovante** de cada um e, embaixo, um **relatório** que bate com o total clicado.

## 2. O que já existe e será reaproveitado (não começa do zero)
- **Comprovante bancário do Asaas**: `getPaymentReceiptDetailsAction(registrationId)` busca a página oficial do comprovante no Asaas e extrai valor, data, código Pix, nome/CPF/banco do pagador. Já há o diálogo `BankReceiptDialog`.
- **Comprovante de inscrição** (Pix direto da academia e cortesia): `getRegistrationProofDataAction`.
- **Recibos** emitidos (`receipts`) e o botão de gerar recibo na tela de Transações.
- **Reenvio do Pix** para pendentes (`ResendPixModal`).
- Dados por pagamento já gravados: `asaas_payment_id`, `fee_pix_snapshot` (taxa real), `payer_type`, `qtd_inscricoes`, `status`.

## 3. Como funciona na tela
**Clique em qualquer card, fatia da pizza ou linha da tabela** abre, logo abaixo, o painel "Relatório detalhado" já filtrado por aquela origem. O filtro vai na URL (`?origem=asaas`), então dá para compartilhar e atualizar a página sem perder a seleção.

| Clique em | Mostra |
|---|---|
| Entrou pelo Asaas / Pago pelo Asaas | 1 linha por **pagamento Asaas** |
| Taxas do Asaas | mesma lista, ordenada pela taxa e destacando a coluna Taxa |
| Pago por fora (Pix da academia, dinheiro) | 1 linha por inscrição, com método e quem deu a baixa |
| Cortesia / Grátis / Pacote | 1 linha por inscrição, valor R$ 0,00, motivo/observação |
| Pendente | 1 linha por inscrição, valor esperado, há quanto tempo, botão reenviar Pix |
| Líquido | todas as linhas que compõem o líquido (Asaas + por fora) |
| Custo de tokens | 1 linha por consumo/estorno de token (data, inscrição, tokens, valor unitário) |

**Colunas da lista do Asaas:** data/hora do pagamento · atleta · categoria · nº da inscrição · ID do Asaas · valor bruto · **taxa** · **líquido** · situação (recebido / agendado) · quem pagou (atleta ou academia) · ações (comprovante bancário, recibo, abrir inscrição).

**Pagamento com várias inscrições** (carrinho): a linha é o **pagamento** (a taxa real é por pagamento); ao expandir mostra as inscrições dentro, com a taxa rateada marcada como "rateio". Assim você analisa o valor real cobrado pelo Asaas e, se quiser, por atleta.

**Relatório embaixo:** totais da lista (quantidade, bruto, taxas, líquido) e uma **marca de conferência**: "Soma da lista = card clicado (R$ x)". Se não bater, aparece o alerta com a diferença, em vez de esconder.

**Ferramentas da lista:** busca por atleta/CPF/ID do Asaas, ordenação por qualquer coluna, 50 linhas por página, exportar CSV e PDF do que está filtrado.

## 4. Pontos que exigem decisão ou cuidado
1. **Taxa não registrada**: pagamentos antigos podem ter `fee_pix_snapshot` vazio. Na lista aparece "taxa não registrada" com o botão "buscar no Asaas" (consulta `GET /v3/payments/{id}`, lê `netValue`, só mostra, não grava). Gravar de volta no banco (backfill) é a fase 3 e precisa da sua autorização, pois altera dados.
2. **Comprovante do Asaas só sob demanda**: abrir o comprovante faz uma chamada ao Asaas por clique. A lista **não** pré-carrega os 66 de uma vez (evita limite de requisições do Asaas e gasto de CPU). Um "baixar todos os comprovantes (ZIP)" é possível depois, rodando em lote com pausa.
3. **Comprovante de quem pagou por fora (Pix na chave da academia, dinheiro)**: hoje o sistema só tem o *comprovante de inscrição*; não guarda o comprovante bancário. Para "ver cada comprovante" também aí, seria preciso permitir **anexar a foto/PDF do comprovante na baixa manual** (novo campo e armazenamento). É opcional e é a maior mudança do plano.
4. **Paginação com classificação em código**: a origem hoje é decidida em código, não em SQL. Para até alguns milhares de inscrições funciona (busca tudo, filtra, fatia). Na fase 3, com a coluna `payment_origin` gravada, passa a paginar direto no banco.
5. **Privacidade**: CPF aparece mascarado (só os últimos dígitos) na lista; completo só dentro do comprovante. Mesmas regras de acesso da tela atual (tenant do evento).
6. **Período**: continua pela data da inscrição; o filtro por data do pagamento chega com `paid_at` (fase 3).

## 5. Fases
- **2a – Asaas e taxas** (o que você descreveu primeiro): clique nos cards/pizza/tabela, lista por pagamento com bruto, taxa e líquido, expansão de carrinho, comprovante bancário por linha (diálogo existente), conferência da soma, busca/ordenar/paginar.
- **2b – Demais origens**: por fora, cortesia/grátis/pacote, pendente (reenviar Pix), tokens.
- **2c – Exportação e comprovantes**: CSV/PDF da lista, link para recibo, ZIP de comprovantes em lote, "buscar taxa no Asaas".
- **2d – Dados (precisa autorização)**: gravar `paid_at`, `payment_origin`, taxa por pagamento antigo; anexo de comprovante na baixa manual (se aprovado o item 3).

Cada fase publica separado e só depois de validada com números reais, para não gastar deploys à toa. Testes: unitários do agrupamento por pagamento, do rateio e da conferência de soma; comparação com o extrato do Asaas de um campeonato encerrado.

## 6. Dúvidas para você
1. Quer **anexar o comprovante** do Pix/dinheiro na baixa manual (item 3), ou basta o comprovante de inscrição para o que é por fora?
2. Na lista, mostrar o **nome completo** do atleta e do pagador, com CPF mascarado? Ok?
3. Exportação: **CSV, PDF ou os dois**?
4. Pode eu, na fase 2d, **gravar a taxa real** nos pagamentos antigos que estão sem ela (alteração de dados, feita com cuidado e só depois do seu OK)?
5. Posso ter acesso **somente leitura** ao banco (ou export de agregados) para validar antes de publicar?
