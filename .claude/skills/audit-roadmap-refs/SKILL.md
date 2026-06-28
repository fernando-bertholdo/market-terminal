# Skill: audit-roadmap-refs

Auditar referências a skills em Roadmap.md e TODO.md.

---
name: audit-roadmap-refs
description: Auditar referências a skills em Roadmap.md e TODO.md para garantir que todas skills úteis estão documentadas e acessíveis. Use após criar nova skill, antes de completar milestone, durante auditoria periódica, ou quando sentir que falta uma skill em contexto.
---

## Quando Usar

- Após criar nova skill
- Antes de completar milestone
- Durante auditoria periódica (2-3 semanas)
- Quando sentir que falta uma skill em contexto
- Ao revisar documentação do projeto

## Input Esperado

```
audit-roadmap-refs [scope]
```

Scopes disponíveis:
- `full` - Auditoria completa de todas referências
- `skills` - Apenas referências a skills
- `docs` - Apenas referências a documentos
- (sem argumento) - Equivalente a `full`

## Workflow

### 1. Inventariar Skills Existentes

```
Ler .claude/skills/*/SKILL.md
Extrair lista de skills disponíveis:
  - Nome
  - Descrição (do frontmatter)
  - Quando usar
```

### 2. Escanear Roadmap.md

```
Buscar menções a skills no formato:
  - `skill-name`
  - `/skill-name`
  - "invocar skill"
  - "usar skill"

Verificar se skills mencionadas existem
Identificar skills úteis não mencionadas
```

### 3. Escanear TODO.md

```
Buscar referências a skills em:
  - Descrições de tarefas
  - Critérios de conclusão
  - Notas e observações

Verificar consistência com Roadmap.md
```

### 4. Identificar Gaps

```yaml
Skills não documentadas em Roadmap:
  - [skill-name]: [quando seria útil mencionar]

Skills mencionadas mas inexistentes:
  - [skill-name]: [onde foi mencionada]

Oportunidades de menção:
  - [contexto]: [skill que seria útil]
```

### 5. Gerar Audit Report

```markdown
# Audit Report: Roadmap & TODO Refs

**Data:** [YYYY-MM-DD]
**Escopo:** [full|skills|docs]

## Sumário

| Métrica | Valor |
|---------|-------|
| Skills existentes | X |
| Skills referenciadas em Roadmap | Y |
| Skills referenciadas em TODO | Z |
| Gaps identificados | W |

## Skills Existentes

| Skill | Em Roadmap | Em TODO | Status |
|-------|------------|---------|--------|
| validate-dor | ✅ | ✅ | OK |
| validate-dod | ✅ | ✅ | OK |
| fresh-context | ❌ | ❌ | ⚠️ Não documentado |

## Gaps Identificados

### Skills úteis não mencionadas em Roadmap

1. **`fresh-context`**
   - Sugestão: Mencionar em "Regras de Transição entre Milestones"
   - Contexto: Útil quando sessão >150k tokens

### Referências quebradas

1. **`/old-skill`** em Roadmap.md linha 45
   - Status: Skill não existe
   - Ação: Remover referência ou criar skill

### Oportunidades de melhoria

1. **Seção "Antes de Iniciar Milestone"**
   - Adicionar: `validate-dor [milestone]`

2. **Seção "Após Completar Milestone"**
   - Adicionar: `validate-dod [milestone]`
   - Adicionar: `update-docs task [milestone]`

## Recomendações

1. [ ] Adicionar referência a `fresh-context` em transições
2. [ ] Remover referência obsoleta a `/old-skill`
3. [ ] Documentar workflow de skills em seção dedicada
```

## Skills Comuns a Auditar

| Skill | Contexto de Uso | Onde Documentar |
|-------|-----------------|-----------------|
| `validate-dor` | Antes de iniciar milestone | DoR section |
| `validate-dod` | Ao completar milestone | DoD section |
| `pre-commit-check` | Antes de commits | Commit guidelines |
| `organize-commits` | Múltiplas mudanças | Commit guidelines |
| `fresh-context` | Sessão longa/handoff | Regras operacionais |
| `validate-testing` | Antes de completar | DoD section |
| `update-docs` | Após mudanças de arquitetura | Post-milestone |
| `audit-rules` | Auditoria periódica | Fase completion |
| `audit-architecture` | Detectar redundância | Fase completion |

## Regras

1. **Skills devem ser descobríveis** - Se útil, deve estar documentado
2. **Referências devem ser válidas** - Não referenciar skills inexistentes
3. **Consistência entre docs** - Roadmap e TODO devem concordar
4. **Manter atualizado** - Auditar após criar/modificar skills

## Output

Gera relatório com:
- Inventário de skills
- Status de referências
- Gaps identificados
- Recomendações de ação

## Integração com Outros Skills

| Skill | Relação |
|-------|---------|
| `audit-rules` | Audita regras, não skills |
| `audit-architecture` | Audita redundância em docs |
| `validate-docs-links` | Valida links, não menções |

## Exemplo de Uso

```
User: audit-roadmap-refs skills

Claude:
# Audit Report: Roadmap & TODO Refs

**Data:** 2026-01-25
**Escopo:** skills

## Sumário

| Métrica | Valor |
|---------|-------|
| Skills existentes | 11 |
| Skills referenciadas em Roadmap | 8 |
| Skills referenciadas em TODO | 6 |
| Gaps identificados | 3 |

## Skills Existentes

| Skill | Em Roadmap | Em TODO | Status |
|-------|------------|---------|--------|
| validate-dor | ✅ | ✅ | OK |
| validate-dod | ✅ | ✅ | OK |
| pre-commit-check | ✅ | ✅ | OK |
| organize-commits | ✅ | ❌ | ⚠️ |
| fresh-context | ❌ | ❌ | ⚠️ |
| validate-testing | ✅ | ✅ | OK |
| update-docs | ✅ | ❌ | ⚠️ |
| audit-rules | ✅ | ❌ | ⚠️ |
| audit-architecture | ❌ | ❌ | ⚠️ |
| validate-docs-links | ✅ | ❌ | ⚠️ |
| audit-roadmap-refs | ❌ | ❌ | ⚠️ |

## Recomendações

1. [ ] Adicionar `fresh-context` em seção de transições
2. [ ] Adicionar `audit-architecture` em fase completion
3. [ ] Mencionar `organize-commits` em TODO quando múltiplas mudanças
```

---

**Versão:** 1.0.0
**Última atualização:** Template
