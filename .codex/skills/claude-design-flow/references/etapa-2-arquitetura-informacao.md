# Etapa 2 — Arquitetura de Informação / User Flows

**Bundle:** todos (B1, B2, B3). É a primeira etapa executada em B1/B2.

## O que produz

Para a unidade em escopo: user flow (entrada → objetivo, com desvios críticos), site map/hierarquia (quando a unidade é o produto/módulo) e inventário de conteúdo por tela.

## Executor

- **Primário (sempre):** Mermaid local — `.planning/<tipo>/<nome>/design/flows/flow-<unidade-kebab>.mmd` (fonte única, versionável, renderiza em qualquer viewer markdown/artifacts). Marcador na 1ª linha em sintaxe `%%`.
- **Opcional (Excalidraw):** diagrama interativo quando a conversa pedir manipulação visual — mesma convenção de armazenamento da etapa 1 (`design/boards/*.excalidraw`, single-writer, re-salvar a cena). O `.mmd` permanece a fonte canônica; o Excalidraw é projeção.

## Insumos

- Personas e objetivos (`documents/strategy/user-personas.md`) — o flow parte de QUEM e PARA QUÊ
- Escopo da unidade (diagnóstico em conversa)
- REGISTRY: flows existentes de unidades vizinhas (consistência de navegação)

## Protocolo

1. Escrever o(s) flow(s) em Mermaid e iterar EM TEXTO com o usuário (barato)
2. Inventário de conteúdo em `design/flows/inventario-<unidade>.md` (tabela: tela → dados/conteúdo → estados → mídia) — referenciar do CONTEXT, não inflá-lo
3. Se Excalidraw: projetar o diagrama na cena e re-salvar
4. Gate: aprovação do usuário → `local-approved`

## Critério de done (`local-approved`)

- [ ] User flow cobre caminho feliz + estados de erro/vazio relevantes
- [ ] Cada tela do flow tem linha no inventário de conteúdo
- [ ] Fonte `.mmd` salva com marcador `%%` na 1ª linha

## Convenções

- Grafar sempre "Arquitetura de Informação" por extenso (sigla é ambígua em pt-BR)
- Nome de flow: `flow-<unidade-kebab>` (ex.: `flow-onboarding`)
- Mudou o flow → editar o `.mmd` (fonte) e re-projetar onde for preciso
