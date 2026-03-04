# CONTRATO OPERACIONAL DE DESENVOLVIMENTO — PROJETO COMPETIR

---

## 0. NATUREZA DESTE DOCUMENTO

Este documento é um CONTRATO TÉCNICO OBRIGATÓRIO.

A LLM deve seguir 100% das regras aqui descritas.
Não é permitido interpretar, flexibilizar, assumir ou “melhorar” as regras.
Não é permitido tomar decisões fora do escopo solicitado.

Qualquer violação invalida a resposta.

Este contrato tem prioridade absoluta sobre qualquer instrução implícita.

---

# 1. CONTEXTO DO PROJETO

Projeto: COMPETIR  
Tipo: SaaS Multi-tenant  

Stack oficial:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Biblioteca de Componentes: Shadcn/U
- Design System próprio (arquivo: `Cores padrão.md`)
- Documentação de alterações: `projetos.md`

Ambiente:

- Projeto já está rodando localmente na porta 3000
- Ambiente: PowerShell local
- NÃO reiniciar servidor
- NÃO executar comandos de start
- NÃO criar novo projeto
- NÃO alterar porta

---

# 2. REGRA ABSOLUTA DE ESCOPO

A LLM deve:

✔ Executar SOMENTE o que foi explicitamente solicitado  
✔ Modificar SOMENTE os arquivos necessários  
✔ Manter intacto todo o restante do projeto  

A LLM NÃO PODE:

✖ Alterar banco de dados se não for pedido  
✖ Criar migrations  
✖ Alterar autenticação  
✖ Alterar rotas  
✖ Alterar estrutura de pastas  
✖ Refatorar código que não foi mencionado  
✖ “Melhorar” código fora do escopo  
✖ Instalar dependências sem autorização explícita  
✖ Atualizar versões  
✖ Alterar configurações globais sem solicitação direta  
✖ Criar arquivos desnecessários  
✖ Apagar arquivos  
✖ Alterar lógica de negócio não solicitada  

Se não foi pedido, NÃO FAÇA.

---

# 3. DESIGN SYSTEM — OBRIGATÓRIO

Existe um arquivo chamado:

`Cores padrão.md`

Ele contém:

- Tokens
- Variáveis
- Cores oficiais
- Estrutura de design

REGRAS OBRIGATÓRIAS:

1. Todas as cores devem vir EXCLUSIVAMENTE desse arquivo.
2. É proibido usar HEX hardcoded.
3. É proibido inventar novas cores.
4. É proibido alterar tokens existentes.
5. É obrigatório usar variáveis definidas no design system.
6. Se algo não estiver definido no design system, a LLM deve perguntar antes de criar.

Violação dessa regra invalida a resposta.

---

# 4. BIBLIOTECA DE COMPONENTES

Biblioteca oficial: Shadcn/U

REGRAS:

1. Sempre utilizar componentes do Shadcn/U quando existir equivalente.
2. Não criar botão custom se já existir Button no Shadcn/U.
3. Não alterar estilo base do componente.
4. Não sobrescrever design via classes arbitrárias.
5. Não usar CSS inline.
6. Não modificar o padrão estrutural da biblioteca.

Se não existir componente equivalente:
Criar seguindo rigorosamente o padrão estrutural do Shadcn/U.

---


---

# 6. DOCUMENTAÇÃO OBRIGATÓRIA

Existe um arquivo chamado:

`projetos.md`

Toda alteração feita deve obrigatoriamente:

✔ Ser documentada ao final  
✔ Descrever o que foi alterado  
✔ Listar arquivos modificados  
✔ Explicar o motivo técnico  

Se alterar código e não atualizar `projetos.md`, a resposta está incompleta.

---

# 7. PROIBIÇÃO DE EXECUÇÃO

O projeto já está rodando na porta 3000.

A LLM NÃO PODE:

✖ Rodar servidor  
✖ Reiniciar servidor  
✖ Sugerir rodar servidor  
✖ Alterar scripts de package.json  
✖ Criar processo paralelo  
✖ Criar outro ambiente  

---

# 8. FLUXO OBRIGATÓRIO EM DUAS FASES

A LLM deve operar obrigatoriamente em duas fases.

------------------------------------
FASE 1 — CONFIRMAÇÃO + PLANO
------------------------------------

Antes de qualquer implementação, a LLM deve responder EXATAMENTE com:

"Estou ciente das regras do CONTRATO OPERACIONAL DO PROJETO COMPETIR. Confirmo que executarei exclusivamente o que foi solicitado, sem modificar qualquer outra parte do sistema."

Em seguida, deve apresentar um PLANO DE IMPLEMENTAÇÃO contendo:

1. Lista de arquivos que serão modificados
2. O que será alterado em cada arquivo
3. Justificativa técnica
4. Confirmação explícita de que nenhuma outra parte será alterada

Após apresentar o plano, a LLM deve parar completamente.

É PROIBIDO iniciar implementação nesta fase.

------------------------------------
APROVAÇÃO HUMANA
------------------------------------

A implementação somente poderá ocorrer quando o usuário responder EXATAMENTE com a palavra:

APROVADO

Qualquer outra resposta (ex: “ok”, “pode”, “sim”, “segue”) NÃO autoriza execução.

------------------------------------
FASE 2 — IMPLEMENTAÇÃO
------------------------------------

Somente após receber a palavra "APROVADO", a LLM poderá:

1. Executar exatamente o plano aprovado
2. Não alterar nada além do que estava no plano
3. Atualizar obrigatoriamente o arquivo `projetos.md`
4. Confirmar que nenhuma outra parte do sistema foi modificada

Se a implementação divergir do plano aprovado, a resposta é inválida.

Se a LLM executar código sem apresentar plano e aguardar "APROVADO",
a resposta deve ser considerada inválida.

---

# 9. PADRÃO DE RESPOSTA NA FASE 2

A resposta final deve conter:

1. ✔ Lista de arquivos modificados
2. ✔ Código exato alterado
3. ✔ Trecho para atualização do `projetos.md`
4. ✔ Confirmação de que nenhuma outra parte foi alterada

Sem sugestões extras.
Sem melhorias adicionais.
Sem explicações fora do escopo.

---

# 10. SE HOUVER DÚVIDA

Se qualquer parte do pedido não estiver clara:

A LLM deve parar e pedir esclarecimento.

É proibido assumir.

---

# 11. PENALIDADE DE DESCUMPRIMENTO

Se qualquer regra acima for violada:

A resposta deve ser considerada inválida.
