---
name: validate-docs-links
description: Validar integridade de links e backlinks em toda a documentação do projeto. Use após criar múltiplos documentos, antes de completar DoD, após renomear/mover arquivos, periodicamente ao completar fases, ou antes de releases importantes.
---

# Validate Documentation Links

Valida integridade do sistema de links e backlinks em toda a documentação do projeto.

## Ações Disponíveis

### Check
Verificar todos os links em documentos e gerar relatório de links quebrados.

### Fix
Tentar corrigir automaticamente links quebrados identificados pelo check.

## Quando Usar

### Check:
- Após criar múltiplos documentos novos
- Antes de completar DoD (meta: 0 links quebrados)
- Após renomear ou mover arquivos
- Periodicamente (a cada fase completada)
- Antes de releases importantes

### Fix:
- Após check identificar links quebrados
- Quando correção é óbvia (path relativo incorreto)
- ⚠️  Com cautela - sempre revisar mudanças

## Escopo de Validação

### Diretórios Escaneados

| Diretório | Pattern | Propósito |
|-----------|---------|-----------|
| `documents/` | `**/*.md` | Documentação core, technical, strategy |
| `.claude/rules/` | `*.md` | Regras Tier 1 e Tier 2 |
| `.claude/skills/` | `**/*.md` | Skills operacionais |
| Raiz | `README.md`, `CHANGELOG.md` | Docs principais |

### Arquivos Excluídos

- `node_modules/`, `venv/`, `.git/`
- `*.pdf`, `*.xlsx`, `*.json`
- `data/`, `logs/`, `htmlcov/`

### Tipos de Links Validados

| Tipo | Exemplo | Validação |
|------|---------|-----------|
| **Relativo (mesmo dir)** | `[TODO.md](../../../documents/core/TODO.md)` | Arquivo existe |
| **Relativo (pai)** | `[CLAUDE.md](../../CLAUDE.md)` | Resolve path e verifica |
| **Relativo (subdir)** | `[arch.md](../../../documents/technical/architecture.md)` | Path completo |
| **Âncora (mesmo arquivo)** | `[Seção](#secao)` | Âncora existe |
| **Âncora (outro arquivo)** | `[Proj](../../../documents/core/Projeto.md#resumo)` | Arquivo E âncora |
| **Skill** | `skill-name` | Skill existe |

### NÃO Validados (Intencionalmente)

- URLs externas (http://, https://)
- Links de imagens (ex.: imagem Markdown)
- Links dentro de code blocks

## Procedimento

### Check Mode

```bash
1. Escanear todos arquivos .md em escopo

2. Extrair todos links markdown (formato link markdown texto→destino)

3. Para cada link:
   a. Resolver path relativo do arquivo fonte
   b. Verificar existência do arquivo/âncora
   c. Classificar: ✅ OK, ⚠️  Warning, ❌ Broken

4. Gerar relatório estruturado:
   - Links quebrados (CRÍTICO)
   - Links com warnings (não-bloqueante)
   - Estatísticas gerais

5. Sugerir ações corretivas para cada link quebrado
```

### Fix Mode

```bash
1. Executar check primeiro

2. Para cada link quebrado:
   a. Classificar tipo de problema

   b. Se fixable automaticamente:
      - Calcular correção
      - Mostrar diff (before/after)
      - Solicitar confirmação
      - Aplicar correção

   c. Se não-fixable:
      - Sugerir ação manual
      - Adicionar TODO no arquivo

3. Re-executar check para validar fixes

4. Gerar relatório de correções aplicadas

5. Sugerir commit:
   docs: corrige [N] links quebrados em documentação
```

## O Que Verifica

### 1. Links Relativos
Verifica se arquivo de destino existe e valida path relativo correto.

### 2. Links de Âncoras
Verifica se âncora existe no documento de destino e valida sintaxe do ID.

### 3. Links de Skills
Verifica se skill existe em `.claude/skills/` e valida sintaxe.

### 4. Backlinks (Bidirecionais)
Se A linka B, verifica se B menciona A em seção "Links Relacionados".
Alerta se backlink está faltando (não crítico, apenas informativo).

## Correções Automáticas

### Fix Pode Corrigir:

1. **Paths relativos incorretos**
   - Calcula path correto baseado em estrutura
   - Exemplo: `documents/core/Projeto.md` → `Projeto.md`

2. **Âncoras mal formatadas**
   - Normaliza IDs (remove acentos, espaços)
   - Exemplo: `#seção-exemplo` → `#secao-exemplo`

3. **Links para arquivos renomeados**
   - Busca arquivo similar (Levenshtein distance)
   - Sugere se confiança >80%

### Fix NÃO Corrige (Requer Manual):

- ❌ Arquivos que não existem
- ❌ Âncoras que não existem
- ❌ Backlinks faltantes

## Formato de Relatório

### Check Mode Output

```markdown
# 📊 Relatório de Validação de Links

**Data:** [DATA]
**Escopo:** [N] arquivos .md

## Resumo Executivo

| Métrica | Valor | Status |
|---------|-------|--------|
| Arquivos escaneados | [N] | - |
| Total de links | [N] | - |
| Links OK | [N] | ✅ [%] |
| Warnings | [N] | ⚠️  [%] |
| Quebrados | [N] | ❌ [%] |
| **Meta** | **0 quebrados** | **[STATUS]** |

## Detalhamento por Arquivo

### [arquivo.md]
- Links totais: [N]
- Status: [✅❌⚠️]
- Issues: [Lista]

## Ações Recomendadas (Priorizadas)

### CRÍTICO (Bloqueia)
[Lista de correções obrigatórias]

### NÃO-BLOQUEANTE (Melhorias)
[Lista de melhorias]

## Comandos para Resolução

```bash
validate-docs-links fix
validate-docs-links check
git commit -m "docs: corrige links"
```
```

### Fix Mode Output

```markdown
# 🔧 Correções Automáticas

Fixable: [N]/[TOTAL] ([%])
Requer manual: [N]/[TOTAL] ([%])

## Correções Aplicadas

### FIX 1/N: [arquivo]:[linha]

BEFORE:
[link antigo]

AFTER:
[link novo]

Motivo: [Explicação]
Confiança: [%]

Aplicar? [y/N]:

## Não Fixable (Requer Manual)

[Lista com ações sugeridas]

## Resumo

- Aplicadas: [N]
- Requerem manual: [N]
- Arquivos modificados: [N]

Re-executando check...
[Resultado]
```

## Meta de Qualidade

### Setup Inicial

**Meta:** 0 links quebrados

**Justificativa:**
- Sistema de links é camada de redundância
- Links quebrados degradam navegabilidade
- Múltiplos arquivos criados → alta probabilidade de erros

### Fases Posteriores

**Meta:** >95% links OK

**Justificativa:**
- Docs técnicos podem referenciar arquivos futuros
- TODOs explícitos são aceitáveis

## Exemplos

### Exemplo 1: Check Encontra Issues

```
📊 Relatório de Validação de Links
====================================

Arquivos escaneados: 24
Total de links: 187

✅ Links OK: 183 (97.9%)
⚠️  Warnings: 2 (1.1%)
❌ Links quebrados: 2 (1.1%)

---

❌ LINKS QUEBRADOS

1. documents/core/Roadmap.md:145
   Link: `documents/core/Projeto.md`
   Problema: Path incorreto
   Sugestão: `Projeto.md`

2. .claude/rules/architecture-guidelines.md:287
   Link: `integration.md` (referência ausente)
   Problema: Arquivo não existe
   Sugestão: Criar arquivo ou remover link
```

### Exemplo 2: Fix Corrige Automaticamente

```
🔧 Correções Automáticas
=========================

✅ FIX 1/2: documents/core/Roadmap.md:145

BEFORE: `documents/core/Projeto.md`
AFTER: `Projeto.md`

Motivo: Path relativo incorreto
Confiança: 100%

Aplicar? y
✅ Aplicado!

---

❌ FIX 2/2: Requer ação manual
Link: integration.md não existe
TODO adicionado ao arquivo

---

📊 Resumo:
Aplicadas: 1
Requerem manual: 1
```

## Referências

- `documents/README.md` - Índice central
- `.claude/rules/README.md` - Índice de regras
- `.claude/skills/README.md` - Índice de skills

## Skills Relacionadas

**Antes de completar milestone:**
- `validate-docs-links check` - OBRIGATÓRIO (DoD: 0 quebrados)

**Após criar/modificar docs:**
- `validate-docs-links check` - Validar links novos
- `update-docs` - Atualizar docs técnicos

**Manutenção:**
- `validate-docs-links check` - A cada fase
- `audit-rules full` - Validação completa (inclui links)
