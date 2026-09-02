# Etapa 1 — Discovery (board local; Excalidraw opcional)

**Bundle:** só B3 (B1/B2 consomem a estratégia silenciosamente no preflight; esta etapa a *materializa* como board).

## O que produz

Board de discovery da unidade/produto: empathy map por persona, teardown competitivo, cluster de ideias, norte estratégico e metadados (fonte, data, iniciativa).

## Executor

- **Primário (sempre disponível):** board markdown estruturado em `.planning/<tipo>/<nome>/design/discovery-<unidade>.md` — seções: Norte (visão + no-goals), Empathy Map por persona (`[PREMISSA]`/`[A VALIDAR]` destacados), Teardown competitivo, Ideias/clusters, Decisões emergentes.
- **Opcional (se MCP Excalidraw disponível e o usuário quiser board visual):** canvas interativo. **Convenção de armazenamento obrigatória:** a cena vive como `.planning/<tipo>/<nome>/design/boards/<nome>.excalidraw` (JSON puro, versionável). Iteração = reabrir a cena (excalidraw.com → File → Open, ou via MCP) → editar → **re-salvar o mesmo arquivo** (git = histórico do canvas). Single-writer: iterações sequenciais, sem edição concorrente. Sem imagens pesadas embutidas — exportar PNG ao lado (`<nome>.png`) para preview rápido. O board é **projeção complementar**: o markdown permanece a fonte canônica das conclusões.

## Insumos (a fonte é o markdown de estratégia)

| Insumo | Uso no board |
|---|---|
| `documents/strategy/user-personas.md` | Empathy map por persona |
| `documents/strategy/competitive-landscape.md` (se existir) | Teardown competitivo |
| `documents/strategy/vision-strategy.md` + `constraints-no-goals.md` | Seção "Norte" |
| `documents/core/Projeto.md` | Contexto de negócio; nunca contradizer (autoridade máxima) |

## Protocolo

1. Carregar insumos; montar o board markdown seção a seção com o usuário
2. Se Excalidraw: criar/reabrir a cena, espelhar as seções, re-salvar `.excalidraw` (+ PNG)
3. Gate: revisão do usuário → `local-approved`
4. Registrar no CONTEXT da iniciativa (path do board + estado); REGISTRY ganha linha na reconciliação

## Critério de done (`local-approved`)

- [ ] Board contém: norte estratégico, ≥1 empathy map (se user-facing), metadados
- [ ] Nada contradiz `Projeto.md`
- [ ] Insights que viraram decisão foram levados para `documents/strategy/` (markdown é a fonte; board não substitui docs)
- [ ] Se Excalidraw: `.excalidraw` salvo no repo (reabrível) + PNG de preview

## Limitação deliberada (ledger v2→v3)

Sem votação/stickies multiplayer (perda aceita — decisão #10 do detour de origem). Colaboração síncrona de workshop → ferramenta à parte, fora do fluxo.
