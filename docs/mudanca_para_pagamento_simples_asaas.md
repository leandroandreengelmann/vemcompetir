# Mudança para Pagamento Simples Asaas (Conta Única)

Este documento detalha o que precisa ser alterado para simplificar a integração com o Asaas, removendo o split de pagamentos e unificando todas as transações em uma única conta global da plataforma.

## 1. Fluxo Principal de Pagamentos (Checkout)
**Arquivo:** `src/app/api/payments/create-event-payment/route.ts`

**O que precisa ser feito:**
- **Remover a validação da Subconta:** O sistema não deve mais buscar o `organizerWalletId` na tabela `asaas_subaccounts`. Todo o dinheiro irá para a conta mestre.
- **Remover o array de Split:** Na criação do pagamento (chamada `POST /v3/payments`), a propriedade `split` precisa ser removida do corpo da requisição.
- **Cobrança Única:** O `value` enviado para o Asaas será o valor total do carrinho (`total_inscricoes`), independentemente de quem estiver comprando (seja o próprio organizador ou terceiros comprando para eventos de terceiros).
- **Resultado:** O dinheiro de 100% das inscrições cairá exclusivamente na conta Asaas da plataforma (Super Admin).

## 2. Criação de Subcontas (Onboarding no Asaas)
**Arquivo:** `src/app/api/asaas/subaccounts/route.ts`
**Arquivos UI:** `src/app/(panel)/academia-equipe/dashboard/financeiro/asaas/*`

**O que precisa ser feito:**
- **Eliminação do Fluxo:** Todo este módulo de criação de subconta pode ser **desativado ou deletado**. Os organizadores não precisarão mais de onboarding financeiro e aprovação de documentos no Asaas.
- **Limpeza da UI:** As telas de "Status da Conta" (Criada, Aprovada, Aguardando Ação, etc.) deixarão de existir para os donos de academia/equipe. Em seu lugar, futuramente, poderá entrar uma tela de "Extrato/Saldo na Plataforma".

## 3. Webhooks e Conciliação
**Arquivo:** `src/app/api/webhooks/asaas/route.ts`

**O que precisa ser feito:**
- **Nenhuma alteração na lógica base de aprovação.** 
- O fluxo de confirmação (Double Check) já funciona baseado no `asaas_payment_id` e no token da conta mestre. A ausência do Split não afeta o recebimento e conciliação do webhook para liberar os atletas na chave.

## 4. Banco de Dados
**Tabelas impactadas:**
- `asaas_subaccounts`: Pode ser limpa/removida, pois não haverá mais retenção de `wallet_id` por *Tenant*.
- `payments`: A estrutura atual (com `fee_saas_gross_snapshot`, `total_inscricoes_snapshot`, `fee_unit_snapshot`) é excelente e **deve ser mantida**. Ela servirá como base para calcular quanto a plataforma deve a cada organizador.

## 5. Próximos Passos (O "Dia Seguinte")
Ao simplificar para Conta Única, a complexidade foi movida do *Asaas* para a *Plataforma*:
Como 100% do dinheiro cairá na conta do Super Admin, será necessário implementar controles internos:

1. **Extrato/Ledger Interno:** Uma tela no painel da Academia onde ela veja quanto tem de "Saldo a Receber" (Total Vendas - Taxas Plataforma).
2. **Sistema de Saque:** Um fluxo (`Request Payout`) para que o organizador solicite uma transferência (e.g. via PIX manual ou automatizado via API do Asaas) do saldo da Plataforma para a sua conta bancária.

## Conclusão
A migração para a "Conta Única" **simplifica drasticamente o Checkout** e remove atritos de onboarding dos organizadores, exigindo em troca um controle de saldos interno a ser desenvolvido. Nenhuma linha de código complexo adicional para cobrança é necessária—trata-se primariamente de um processo de remoção/limpeza de funcionalidade (Split e Subcontas).
