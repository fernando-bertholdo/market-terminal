# Modo Local — o meio primário de trabalho (e `--publish`)

O modo local **não é fallback**: é onde o design acontece. Zero dependência externa — funciona em qualquer camada (`.claude/`, `.codex/`, `.agents/`), qualquer máquina, sem auth. A ponte Claude Design entra como **publicação** do que for durável e curado.

## Localização dos artefatos

- **Trabalho de iniciativa (default):** `.planning/<tipo>/<nome>/design/` — commitável, evidência da iniciativa
- **Exploração descartável:** `output/` — gitignored, efêmero, não registrado

## Matriz etapa → artefato local

| # | Etapa | Artefato local | Publicável? |
|---|---|---|---|
| 1 | Discovery | `design/discovery-<unidade>.md` (+ `design/boards/*.excalidraw` opcional) | Raro (board é meio) |
| 2 | Arquitetura de Informação | `design/flows/flow-<unidade>.mmd` + `inventario-<unidade>.md` | Raro |
| 3 | Wireframe lo-fi | `design/lofi-<unidade>/NN-<tela>.html` | Opcional (blueprint durável) |
| 4 | Design System | `design/ds/` — `design-tokens.md` → `tokens.css` → componentes | **Sim — via `/design-sync`** (caminho preferido) |
| 5 | Hi-fi | `design/hifi-<unidade>/NN-<tela>.html` | Sim (`--publish` por tela) |
| 6 | Protótipo | click-through local + `design/prototipo-<unidade>.md` | Protótipo rico nasce no app; local documenta |
| 7 | Handoff | `design/handoff-<unidade>.md` | Bundle nasce no app |

**Marcador de estado** na 1ª linha de todo artefato de iniciativa, na sintaxe de comentário do formato (`<!-- -->` HTML/markdown; `%%` Mermaid):
`claude-design-flow: <estado> | etapa N | <unidade> | YYYY-MM-DD` — estados: `local-draft` → `local-approved` → `publication-pending` → `published`.

## Contrato de publicabilidade (o que pode virar card)

Um artefato só é publicável se:
1. **Autocontido:** 1 arquivo HTML por card; CSS inline ou `<style>` no próprio arquivo; sem imports externos; assets embutidos (data URI) ou publicados junto no plano
2. **Card ID estável:** o path no projeto é a identidade (`<grupo>/<nome>.html`) — re-publicar o mesmo path = atualizar (upsert), nunca duplicar
3. **Header `@dsCard`** na PRIMEIRA linha: `<!-- @dsCard group="<Grupo>" viewport="<L>x<A>" name="<Nome legível>" -->`
4. **Estado `local-approved`** e security gate PASS ([reconciliacao.md](reconciliacao.md))

Navegação entre telas (`<a href>`) funciona no browser local; no pane de design os cards são referência individual — protótipos navegáveis ricos vivem no app (etapa 6), não nos cards.

## `--publish` (protocolo)

1. Resolver iniciativa e alvo: REGISTRY → `projectId` (+ confirmar org/projeto com o usuário — security gate)
2. **Dry-run:** listar paths a escrever (e eventuais deletes), destino, grupos → **aprovação do usuário**
3. `finalize_plan` (writes; `deletes: []` é obrigatório mesmo vazio; `localDir` = diretório dos artefatos)
4. `write_files` via `localPath` (conteúdo não passa pelo contexto) — ≤256 arquivos/call
5. Verificar: `list_files` contém os paths → REGISTRY: estado `published`, `last_published` (hash git curto + data), grupos
6. Design system completo → **preferir `/design-sync`** (conversão + render-check + incremental); `--publish` direto é para lotes pequenos de cards prontos

**Publication request (camadas sem a tool):** escrever `design/publication-request.md` na iniciativa — paths `local-approved` a publicar, projeto alvo (ou "criar"), grupos, estado. Uma sessão Claude Code consome com `--publish` e atualiza o REGISTRY.

## Erros comuns

- `finalize_plan` sem `deletes` → erro do contrato (passar `[]`)
- Path fora do plano → rejeitado (replanejar)
- Artefato com asset relativo quebrado → embutir antes de publicar (o card congela o que renderiza)
