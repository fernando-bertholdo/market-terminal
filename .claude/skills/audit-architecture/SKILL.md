---
name: audit-architecture
description: Auditoria periódica para detectar redundância e drift entre arquivos de documentação. Use antes de completar fase, após criar novo arquivo de documentação, periodicamente (2-3 semanas), ou quando suspeitar de conteúdo duplicado.
---

# Audit Architecture

Auditoria periódica para detectar redundância e drift entre arquivos de documentação do projeto.

## Quando Usar

- **Antes de completar fase** - Garantir consistência antes de milestone
- **Após criar novo arquivo de documentação** - Verificar se não duplica existente
- **Periodicamente** - A cada 2-3 semanas de desenvolvimento ativo
- **Quando suspeitar de conteúdo duplicado** - Investigação sob demanda

## Arquitetura Single Source of Truth

O projeto segue a arquitetura de "fonte única de verdade":

| Tipo de Conteúdo | Fonte Única | Carregamento |
|------------------|-------------|--------------|
| Regras operacionais | `.claude/CLAUDE.md` | Sempre |
| Contexto de negócio | `documents/core/Projeto.md` | Sob demanda |
| Detalhes técnicos | `.claude/rules/*.md` | Path-targeted |
| Workflows | `.claude/skills/*/SKILL.md` | Quando trigga |
| Timeline | `documents/core/Roadmap.md` | Sob demanda |
| Tarefas | `documents/core/TODO.md` | Sob demanda |

## Procedimento de Auditoria

### 1. Verificar Sincronização CLAUDE.md ↔ Projeto.md

```
Checklist:
- [ ] CLAUDE.md referencia Projeto.md via @import (não duplica conteúdo)
- [ ] Regras de negócio existem APENAS em Projeto.md
- [ ] Estrutura prevista existe APENAS em Projeto.md
- [ ] Arquitetura detalhada existe APENAS em Projeto.md
- [ ] CLAUDE.md mantém ~150 linhas (apenas regras operacionais)
```

### 2. Verificar Skills vs Rules

```
Checklist:
- [ ] Skills são WORKFLOWS (procedimentos com julgamento/decisão)
- [ ] Skills NÃO duplicam conteúdo de rules/
- [ ] Skills REFERENCIAM rules/ quando precisam de detalhes técnicos
- [ ] Cada skill tem <200 linhas (concisa)
```

### 3. Verificar Duplicação Entre Arquivos

```
Arquivos a comparar:
1. .claude/CLAUDE.md vs documents/core/Projeto.md
2. .claude/rules/*.md vs .claude/skills/*/SKILL.md
3. documents/core/Roadmap.md vs documents/core/TODO.md
4. .claude/CLAUDE.md vs .claude/rules/*.md
```

### 4. Verificar Links e @imports

```
Validar:
- [ ] Todos @imports resolvem para arquivos existentes
- [ ] Links markdown funcionam
- [ ] Referências cruzadas são bidirecionais
```

### 5. Verificar Arquivos Órfãos

```
Checklist:
- [ ] Todo arquivo em .claude/ é referenciado em algum lugar
- [ ] Todo arquivo em documents/ é referenciado em algum lugar
- [ ] Nenhum arquivo obsoleto sem referência
```

## Output do Relatório

### Formato de Saída

```markdown
# Relatório de Auditoria de Arquitetura

**Data:** [data atual]
**Fase:** [fase atual do projeto]

## Resumo

| Categoria | Status | Issues |
|-----------|--------|--------|
| Sincronização CLAUDE.md ↔ Projeto.md | ✅/❌ | [N] |
| Skills vs Rules | ✅/❌ | [N] |
| Duplicação | ✅/❌ | [N] |
| Links/@imports | ✅/❌ | [N] |
| Arquivos órfãos | ✅/❌ | [N] |

**Resultado Geral:** ✅ PASS / ❌ FAIL

## Issues Encontrados

### [Categoria]

1. **[Descrição do problema]**
   - Arquivo 1: [caminho]
   - Arquivo 2: [caminho] (se duplicação)
   - Ação sugerida: [como corrigir]

## Ações Corretivas

- [ ] [Ação 1]
- [ ] [Ação 2]
- [ ] [Ação N]
```

## Regras de Conformidade

### CLAUDE.md Deve:

1. Ter ~150 linhas (máximo 200)
2. Conter APENAS regras operacionais dinâmicas
3. Usar @imports para referenciar contexto (não duplicar)
4. NÃO conter exemplos de código extensos
5. NÃO conter estrutura de diretórios estática
6. NÃO conter regras de negócio detalhadas

### Skills Devem:

1. Ser WORKFLOWS (procedimentos executáveis)
2. Ter <200 linhas
3. Referenciar rules/ para detalhes técnicos
4. NÃO ser apenas "consulta de referência"
5. Ter description clara no frontmatter

### Rules Devem:

1. Ter frontmatter com `paths:` quando aplicável
2. Ser detalhes técnicos de referência
3. NÃO duplicar conteúdo de skills
4. NÃO duplicar conteúdo de CLAUDE.md

### Projeto.md Deve:

1. Ser o CONSOLIDADOR de contexto de negócio
2. Conter regras de negócio, arquitetura, decisões
3. Ser atualizado quando contexto muda
4. Ter Changelog de alterações

## Sinais de Alerta (Red Flags)

### 🚨 Crítico - Corrigir Imediatamente

- CLAUDE.md >250 linhas
- Mesma informação em 3+ arquivos
- Link quebrado para arquivo crítico
- Skill com >500 linhas

### ⚠️ Atenção - Corrigir em Breve

- CLAUDE.md entre 200-250 linhas
- Duplicação parcial entre 2 arquivos
- Skill entre 200-300 linhas
- Arquivo órfão não crítico

### ℹ️ Info - Monitorar

- Padrões de escrita inconsistentes
- Formatação variável entre arquivos
- Referências unidirecionais

## Frequência Recomendada

| Trigger | Frequência |
|---------|-----------|
| Antes de completar milestone | Obrigatório |
| Após criar documentação nova | Recomendado |
| Desenvolvimento ativo | A cada 2-3 semanas |
| Após refatoração grande | Obrigatório |

## Skills Relacionadas

- `validate-docs-links` - Validar apenas links
- `audit-rules` - Auditar apenas rules/
- `audit-roadmap-refs` - Validar referências cruzadas Roadmap/TODO

## Referências

- `.claude/CLAUDE.md` - Regras operacionais
- `documents/core/Projeto.md` - Contexto de negócio
- `.claude/rules/` - Detalhes técnicos
