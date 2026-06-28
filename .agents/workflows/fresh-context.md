---
description: Gerar documento CONTEXT.md para handoff entre sessões quando sessão está longa ou para novo milestone
---

# Workflow: Fresh Context

Gera documento CONTEXT.md para permitir continuação de trabalho em contexto limpo.

## Quando Usar

- Sessão >150k tokens (context rot)
- Iniciar novo milestone
- Handoff para subagente
- Retomada após pausa longa

## Passos

1. **Identificar milestone**
   - Se `milestone-id` fornecido, usar diretamente
   - Se não, consultar `documents/core/Roadmap.md` para detectar milestone ativo

2. **Resolver initiative**
   - Consultar `.planning/README.md` → tabela "Mapeamento Milestone ↔ Iniciativa"
   - Resolver path do CONTEXT.md existente (se houver)

3. **Ler documentos fonte**
   - `documents/core/Roadmap.md` → Escopo (DoR/DoD)
   - `documents/core/TODO.md` → Progresso
   - `documents/core/Projeto.md` → Decisões técnicas
   - `.planning/<initiative>/CONTEXT.md` → Contexto vivo (se existir)

4. **Gerar CONTEXT.md**
   - Invocar skill `fresh-context [milestone-id]`
   - Output salvo em:
     - COM milestone → `.planning/<initiative>/handoff/{milestone-id}-CONTEXT.md`
     - SEM milestone → `.planning/scratch/{slug}-CONTEXT.md`

5. **Gerar prompt de continuação (opcional)**
   - Invocar skill `generate-session-prompt`

## Referências

- `.agents/skills/fresh-context/SKILL.md` — Skill completa
- `.agents/skills/generate-session-prompt/SKILL.md` — Gerar prompt
- `.planning/README.md` — Hub de initiatives
