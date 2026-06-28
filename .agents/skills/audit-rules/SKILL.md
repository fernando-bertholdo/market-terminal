---
name: audit-rules
description: Auditar qualidade e integridade das regras do projeto (Tier 1 e Tier 2). Use quando precisar validar regras antes de commits, após criar/modificar regras, ao completar fases, ou periodicamente para garantir que a documentação de regras está completa e consistente.
---

# Audit Rules

Audita regras do projeto para garantir qualidade, completude e consistência da documentação de regras.

## Modos de Auditoria

### Quick Mode
Validação rápida das regras Tier 1 (Always-On). Use para validações rápidas durante desenvolvimento.

**Verificações:**
- Existência de arquivos obrigatórios
- Metadata completa (versão, status, data, responsável, tier)
- Seções obrigatórias presentes
- Links críticos funcionais

**Tempo estimado:** ~30s

### Full Mode
Auditoria completa de todas as regras (Tier 1 e Tier 2), incluindo conteúdo, exemplos, links e changelog.

**Verificações adicionais:**
- Qualidade de conteúdo (exemplos ✅❌, code blocks)
- Changelog atualizado
- Todos os links funcionais (via validate-docs-links)
- Alinhamento com Projeto.md e Roadmap.md
- Cobertura de roadmap

**Tempo estimado:** ~3-5min

## Quando Usar

**Quick:**
- Antes de commits (parte do checklist pré-commit)
- Durante desenvolvimento (sanity check)
- Após criar/modificar regra Tier 1
- Quando iniciar nova sessão

**Full:**
- Ao completar uma fase (final de milestone)
- Antes de releases importantes
- Periodicamente (a cada 3 meses)
- Onboarding de novo desenvolvedor
- Após feedback de retrospectiva

## Procedimento

### Quick Audit

```bash
# Execute auditoria rápida
1. Listar arquivos em .agents/rules/
2. Filtrar Tier 1 (arquivos obrigatórios):
   - code-quality-standards.md
   - testing-requirements.md
   - security-best-practices.md

3. Para cada arquivo Tier 1:
   a. Verificar metadata completa
   b. Verificar seções obrigatórias:
      - "Quando Aplicar Esta Regra"
      - "📚 Referências"
      - "Changelog"
   c. Verificar links críticos (AGENTS.md, Projeto.md)
   d. Classificar: ✅ OK, ⚠️  Warning, ❌ Erro

4. Gerar relatório resumido
5. Se failures > 0: Exit code 1 (bloqueia commit)
```

### Full Audit

```bash
# Execute auditoria completa
1. Executar quick audit primeiro (base)

2. Listar TODAS regras (Tier 1 + Tier 2)

3. Para cada regra:
   a. Validar qualidade de conteúdo:
      - Exemplos ✅ (bom) e ❌ (ruim) presentes
      - Code blocks com syntax highlighting
      - Skills mencionados existem

   b. Verificar changelog atualizado:
      - Última versão == versão em metadata
      - Formato semver correto
      - Data recente (< 1 mês se fase ativa)

   c. Executar validate-docs-links para esta regra

   d. Comparar conteúdo com Projeto.md:
      - Regras de negócio ainda corretas
      - Stack tecnológico atualizado

   e. Verificar alinhamento com roadmap:
      - Regras planejadas criadas?
      - Regras futuras documentadas?

4. Gerar relatório detalhado:
   - Score de qualidade (0-100) por regra
   - Issues priorizados: críticos, warnings, sugestões
   - Regras faltantes vs roadmap
   - Regras obsoletas vs fase atual

5. Gerar recomendações de ações

6. Se critical issues > 0: Alerta (não bloqueia, mas sugere resolução)
```

## Relatório de Saída

### Quick Mode Example

```
🔍 Auditoria Rápida - Regras Tier 1
====================================

Arquivos Tier 1 esperados: 3
Arquivos encontrados: 3

✅ code-quality-standards.md
   - Metadata: OK
   - Seções obrigatórias: OK (4/4)
   - Links críticos: OK (2/2)

✅ testing-requirements.md
   - Metadata: OK
   - Seções obrigatórias: OK (4/4)
   - Links críticos: OK (2/2)

✅ security-best-practices.md
   - Metadata: OK
   - Seções obrigatórias: OK (4/4)
   - Links críticos: OK (2/2)

---

📊 Resultado: ✅ PASS
Tempo: 0.8s

Regras Tier 1 estão OK para commit!
```

### Full Mode Structure

```markdown
# 🔍 Auditoria Completa - Todas as Regras

## Resumo Executivo
- Regras auditadas: X/X
- Score médio: XX/100
- Issues críticos: X
- Warnings: X
- Sugestões: X

## Detalhamento por Regra
[Para cada regra: score, status, issues, sugestões]

## Issues Priorizados
### 🚨 CRÍTICO (Bloqueia DoD)
### ⚠️  WARNINGS (Não-bloqueantes)
### 💡 SUGESTÕES (Melhorias)

## Alinhamento com Roadmap
- Regras esperadas: checklist
- Regras planejadas: status

## Métricas de Qualidade
- Score distribution
- Issues distribution

## Recomendações
- Ações imediatas
- Curto prazo
- Longo prazo
```

## Checklist Interno

### Por Regra
- [ ] Arquivo existe no diretório correto
- [ ] Metadata completa
- [ ] Seções obrigatórias presentes
- [ ] Exemplos presentes (✅❌, code blocks)
- [ ] Changelog atualizado (versão == metadata)
- [ ] Links funcionais
- [ ] Alinhamento com projeto

### Conjunto de Regras
- [ ] Todas regras Tier 1 presentes (obrigatórias)
- [ ] README.md de regras atualizado
- [ ] Roadmap de regras alinhado
- [ ] Sem duplicação de conteúdo
- [ ] Links bidirecionais (backlinks)

## Meta de Qualidade

**Setup Inicial:** Todas as regras Tier 1 devem estar completas e sem issues críticos.

**Fases Posteriores:** Score médio >90/100, sem issues críticos bloqueantes.

## Referências

- `.agents/rules/README.md` - Índice e lifecycle de regras
- `AGENTS.md` - Regras sempre ativas
- `documents/core/Projeto.md` - Contexto do projeto
- `documents/core/Roadmap.md` - Roadmap de regras

## Skills Relacionadas

**Desenvolvimento:**
- `audit-rules quick` - Validação rápida
- `pre-commit-check` - Checklist completo

**Final de Fase:**
- `audit-rules full` - Auditoria completa
- `validate-docs-links check` - Validar links
- `validate-dod [fase]` - Validar DoD
