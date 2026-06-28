---
description: Executar kick-off completo de um novo projeto usando o template padrão
---

# Workflow: Kick-off de Projeto

Executa o preenchimento completo dos templates do projeto com informações específicas.

## Passos

0. **Explorar design (se necessario)**
   - Se nao ha materiais brutos e o projeto parte de uma ideia → usar skill `design-sprint`
   - `design-sprint` gera documentos estrategicos em `documents/strategy/`
   - Esses documentos alimentam `generate-tap` e o kickoff

1. **Verificar materiais de entrada**
   - Listar arquivos em `documents/archive/` e `documents/strategy/`
   - Se TAP nao existe e nao ha strategy docs → considere `design-sprint` primeiro
   - Se TAP nao existe mas ha materiais brutos → considere `generate-tap` primeiro

2. **Extrair informações-chave dos documentos**
   - Ler TAP (Termo de Abertura do Projeto)
   - Ler transcrições, specs, e outros materiais
   - Se TAP tem Apêndice B (Mapa de Extração), usar como guia prioritário

3. **Escanear e preencher placeholders**
   ```bash
   # Encontrar todos os arquivos com placeholders
   grep -rl '{{' --include='*.md' --include='*.json' --include='*.toml' --include='*.sh' .
   ```
   - Pular arquivos com `<!-- @kickoff-exclude -->`
   - Respeitar `<!-- @runtime-placeholders: ... -->`
   - Preencher na ordem: CRITICAL → HIGH → MEDIUM → LOW

4. **Garantir consistência entre arquivos**
   - Mesmo placeholder = mesmo valor em todos os arquivos
   - `Market Terminal`, `web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning`, `npm run type-check` etc.

5. **Criar estrutura de diretórios**
   - Criar dirs de código e testes conforme o stack

6. **Configurar ambiente**
   - Ajustar `.env.example`
   - Configurar settings do projeto

7. **Remover comentários de instrução**
   ```bash
   grep -rn 'INSTRUÇÃO\|PREENCHER\|Preencher\|Substitua' --include='*.md' . | grep '<!--'
   ```
   - NÃO remover `@runtime-placeholders` e `@kickoff-exclude`

8. **Validar**
   - Invocar skill `validate-kickoff`
   - Invocar skill `validate-docs-links check`

## Referências

- `.agents/skills/design-sprint/SKILL.md` — Exploracao colaborativa de design (pre-TAP)
- `.agents/prompts/kickoff-prompt.md` — Prompt detalhado
- `.agents/skills/validate-kickoff/SKILL.md` — Validacao pos-kickoff
- `.agents/skills/generate-tap/SKILL.md` — Gerar TAP
