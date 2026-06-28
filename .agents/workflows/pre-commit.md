---
description: Executar checklist completo de qualidade antes de git commit
---

# Workflow: Pre-Commit Check

Checklist de qualidade obrigatório antes de fazer commit.

## Passos

1. **Confirmar stack/tooling**
   - Ler `documents/core/Projeto.md` para identificar o stack
   - Confirmar arquivos marcadores (`pyproject.toml`, `package.json`, etc.)

2. **Validar Code Quality**
   ```bash
   # Formatação (adaptar ao stack)
   npx prettier --check .
   
   # Lint
   npm run lint
   
   # Type checking (se aplicável)
   npm run type-check
   ```

3. **Buscar secrets hardcoded**
   ```bash
   rg -n "password\s*=\s*['\"]" src/
   rg -n "api_key\s*=\s*['\"]" src/
   rg -n "SECRET\s*=\s*['\"]" -S src/
   ```
   - Se encontrado: **BLOQUEAR commit**

4. **Validar testes**
   ```bash
   npm run type-check
   npm run type-check
   ```

5. **Validar segurança**
   - `.env` NÃO staged (`git status | grep .env`)
   - `.env.example` atualizado
   - Manifesto de dependências atualizado

6. **Validar git status**
   - Verificar arquivos corretos staged
   - Nenhum arquivo sensível staged
   - Planejar mensagem de commit (conventional)

7. **Gerar relatório**: ✅ READY ou ❌ NOT READY

## Referências

- `.agents/skills/pre-commit-check/SKILL.md` — Skill completa
- `.agents/skills/organize-commits/SKILL.md` — Se múltiplas mudanças
- `.agents/rules/code-quality-standards.md` — Padrões de código
