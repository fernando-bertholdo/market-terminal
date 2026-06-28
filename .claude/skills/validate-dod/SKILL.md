---
name: validate-dod
description: Validar Definition of Done de uma initiative (milestone ou detour) antes de marcá-la como completa. Use OBRIGATORIAMENTE antes de marcar initiative como completa, durante desenvolvimento como checklist de progresso, ou antes de transição para próximo milestone. Este é um gate bloqueador - nenhuma initiative pode ser marcada completa sem DoD 100% validado.
---

# Validate Definition of Done (DoD)

Valida que TODOS os critérios de conclusão de uma initiative (milestone ou detour) foram atendidos antes de marcar como completa.

## Regra de Ouro

> **"Se DoD não está 100% atendido, NÃO está done."**

Este é um **gate bloqueador** - nenhuma initiative deve ser marcada como completa sem DoD validado.

## Quando Usar

- ✅ **OBRIGATÓRIO** antes de marcar milestone ou detour como completo
- ✅ Durante desenvolvimento (checklist de progresso)
- ✅ Antes de transição para próximo milestone

## Workflow de Validação

```bash
1. Receber initiative-id (ex: M1.2, fee-intelligence, D-fee-intelligence)

2. Detectar tipo de initiative:
   - Se formato MX.X ou MX.X.X → MILESTONE
     Path: Glob .planning/milestones/MX.X-*/
   - Se outro formato → DETOUR (strip prefixo D- se presente)
     Path: Glob .planning/detours/<nome>/

3. Verificar infraestrutura de planning:
   - Se NÃO encontrado → BLOQUEADOR:
     Milestone: "Execute `init-milestone MX.X` antes de prosseguir."
     Detour: "Execute `init-detour <nome>` antes de prosseguir."
   - Se encontrado → prosseguir

4. Ler fontes de DoD por tipo:
   - MILESTONE: Roadmap.md § DoD do milestone + TODO.md § MX.X (verify: steps)
   - DETOUR: Roadmap.md § Desvios — Nome (DoD) + TODO.md § Nome (verify: steps)

5. Extrair verify: steps do TODO.md (se existirem)

6. EXECUTAR verificações programáticas:
   - Rodar cada comando verify:
   - Capturar output e exit code
   - Determinar PASS/FAIL

7. Validar categorias (programático + checklist):
   - Funcional (features implementadas)
   - Qualidade (testes, code quality)
   - Documentação (inline, README, notas de implementação)
   - Segurança (secrets, validação)
   - Integração (code review)

8. Identificar verificações humanas necessárias:
   - Visual/UX que requer olho humano
   - Comportamento interativo
   - Performance percebida

9. Gerar Verification Report:
   - Usar template: templates/verification-report.md
   - Incluir output de cada verify: step
   - Listar verificações humanas pendentes
   - Salvar em:
     Milestone: .planning/milestones/MX.X-nome/verification/MX.X-dod-report.md
     Detour: .planning/detours/<nome>/verification/<nome>-dod-report.md

10. Resultado: PASS (100%) ou FAIL (<100%)

11. Se PASS E initiative é a última da fase/grupo:
    a. Consultar .planning/README.md — buscar initiatives relacionadas
    b. Se todas (concluido): é a última → invocar reconcile-initiative
    c. Se alguma ainda (ativo)/(pendente): não é a última → pular
    d. Resultado final: DoD PASS + Reconciliation [LIMPO | REQUER ATENÇÃO]

12. Se FAIL: Gerar plano de correção focado
```

## Verify Steps - Formato no TODO.md

O skill extrai e executa `verify:` steps inline nas tarefas:

```markdown
#### M1.2: Coletor Básico

- [x] Implementar login automatizado
  - files: src/collectors/btg_scraper.py
  - verify: `pytest tests/unit/test_btg_scraper.py::test_login -v`
  - verify: `python -c "from src.collectors import BTGScraper; print('OK')"`
  - done: Login bem-sucedido com credenciais de .env

- [ ] Download de carteira diária
  - files: src/collectors/btg_scraper.py
  - verify: `pytest tests/unit/test_btg_scraper.py::test_download -v`
  - done: Arquivo XML baixado e validado
```

### Regras de Execução

1. **Executar TODOS** os `verify:` steps encontrados
2. **Capturar output** de cada comando
3. **PASS** = exit code 0
4. **FAIL** = exit code != 0
5. **Timeout** = 60 segundos por comando (configurável)
6. **Continuar** mesmo se um falhar (executar todos)

## Tipos de Verificação

### Programática (Automática)

Executada automaticamente pelo skill:

| Tipo | Exemplo de verify: |
|------|-------------------|
| Testes | `pytest tests/unit/test_X.py -v` |
| Coverage | `pytest --cov=src --cov-fail-under=80` |
| Lint/Imports | `ruff check src/ tests/` |
| Format | `ruff format --check src/ tests/` |
| Type check | `mypy src/` |
| Import check | `python -c "from src.X import Y"` |
| Arquivo existe | `test -f path/to/file.py` |

### Humana (Checkpoint)

Listada para validação manual:

| Tipo | Exemplo |
|------|---------|
| Visual | "Layout do e-mail está correto?" |
| UX | "Fluxo de login é intuitivo?" |
| Performance | "Tempo de resposta aceitável?" |
| Dados | "Valores calculados batem com planilha manual?" |

**Regra:** Claude prepara tudo (dev server, dados, instruções), humano apenas confirma.

## Categorias de DoD

### 1. Funcional

**O que validar:**
- Funcionalidade implementada (100% dos requisitos)
- Fluxo completo testado (happy path + edge cases)
- Integração com componentes existentes OK

**Como validar:**
- Executar aplicação manualmente
- Rodar testes de integração
- Verificar logs de execução

### 2. Qualidade

**O que validar:**
- Cobertura de testes >80% (overall), >90% (business logic)
- Todos os testes passando (pytest)
- Code quality OK (ruff format + ruff check)
- Type hints em funções públicas
- Docstrings Google style em código novo
- Validação de completude implementada
- Tratamento de erros básico

**Como validar:**
- `pre-commit-check` → ✅ PASS (inclui code quality)
- `validate-testing` → ✅ PASS (coverage OK)
- Revisar código para error handling

### 3. Documentação

**O que validar:**
- Documentação inline completa (docstrings + type hints)
- README atualizado (se necessário)
- Projeto.md atualizado com decisões/entregas do milestone (inclui Changelog) e Roadmap.md referencia a entrada relevante
- Projeto.md atualizado (se arquitetura mudou)

**Como validar:**
- Verificar docstrings em funções públicas
- Ler README (seções relevantes atualizadas?)
- Confirmar atualização em `documents/core/Projeto.md` (seções relevantes + Changelog) e referência em `documents/core/Roadmap.md`

### 4. Segurança

**O que validar:**
- Nenhum secret hardcoded
- Validação de inputs implementada
- Error handling adequado (não expõe credenciais)

**Como validar:**
- `pre-commit-check` (inclui check de secrets)
- Revisar código para validação de inputs
- Verificar logs não expõem credenciais

### 5. Integração

**O que validar:**
- Code review aprovado (se trabalho colaborativo)
- Não há conflitos de merge
- Commits organizados (conventional commits)

**Como validar:**
- Confirmar review approval (se aplicável)
- `git status` limpo
- `git log --oneline` mostra commits bem estruturados

## Exemplo de Execução de Verify Steps

### Input: TODO.md com verify: steps

```markdown
#### M1.2: Coletor Básico

- [x] Implementar login automatizado
  - files: src/collectors/btg_scraper.py
  - verify: `pytest tests/unit/test_btg_scraper.py::test_login -v`
  - verify: `python -c "from src.collectors.btg_scraper import BTGScraper; print('Import OK')"`
  - done: Login bem-sucedido
```

### Execução Programática

```bash
# Executando verify step 1/2...
$ pytest tests/unit/test_btg_scraper.py::test_login -v

tests/unit/test_btg_scraper.py::test_login PASSED [100%]
========================= 1 passed in 0.45s =========================

# Exit code: 0 → PASS ✅

# Executando verify step 2/2...
$ python -c "from src.collectors.btg_scraper import BTGScraper; print('Import OK')"

Import OK

# Exit code: 0 → PASS ✅
```

### Output: Verification Report

```
## Verificações Programáticas

| Verificação | Comando | Resultado | Output |
|-------------|---------|-----------|--------|
| Test login | pytest ...::test_login | ✅ PASS | 1 passed in 0.45s |
| Import check | python -c "from ..." | ✅ PASS | Import OK |

**Programático:** 2/2 PASS (100%)
```

## Exemplos de Relatórios

Para calibrar o formato do relatório ou verificar estrutura esperada:
- Relatório ✅ PASS completo → `examples/dod-pass-report.md`
- Relatório ❌ FAIL completo → `examples/dod-fail-report.md`

## Checklists por Tipo de Milestone

Consulte `references/checklists-by-type.md` para checklists de Feature, Bug Fix e Refactoring.

## Parâmetros

### Initiative ID (obrigatório)

```bash
# Validar DoD de milestone
validate-dod M1.2
validate-dod M2.4

# Validar DoD de detour (ambas formas aceitas)
validate-dod fee-intelligence
validate-dod D-fee-intelligence
```

## Detecção de Tipo

```
Input: initiative-id

Se formato MX.X ou MX.X.X → MILESTONE
  Path: .planning/milestones/MX.X-*/

Se outro formato → DETOUR (strip D- se presente)
  Path: .planning/detours/<nome>/
```

## Template de Relatório

O skill usa o template em:
`templates/verification-report.md`

O relatório gerado inclui:
- Resumo executivo por categoria
- Output de cada verify: step
- Verificações humanas pendentes
- Plano de correção (se FAIL)

## Referências

- `validate-dor` - Skill complementar para validar DoR
- `init-milestone` - Criar infraestrutura de milestone (se ausente)
- `init-detour` - Criar infraestrutura de detour (se ausente)
- `documents/core/Roadmap.md` - DoD por milestone + seção Desvios para detours
- `documents/core/TODO.md` - Tracking de progresso e verify: steps
- `.planning/milestones/MX.X-nome/` - Diretório do milestone
- `.planning/detours/<nome>/` - Diretório do detour
- `.planning/*/verification/` - DoD reports co-localizados
- `templates/verification-report.md` - Template de relatório

## Skills Relacionadas

- `validate-dor [initiative-id]` - Validar DoR (antes de iniciar)
- `update-docs task [initiative-id]` - Atualizar Projeto.md + referência no Roadmap.md
- `pre-commit-check` - Validar qualidade (code quality + testing + security)
- `validate-testing` - Validar testes
- `fresh-context` - Gerar contexto para nova sessão
- `reconcile-initiative [initiative-id]` - Reconciliar docs core após conclusão
- `archive-initiative [initiative-id]` - Arquivar initiative concluída

---

## Uso Típico

**Após completar milestone:**
```bash
validate-dod M1.2
# Se PASS: Milestone completo
# Se FAIL: Resolver pendências
```

**Após completar detour:**
```bash
validate-dod fee-intelligence
# Se PASS: Detour completo
# Se FAIL: Resolver pendências
```

**Transição entre milestones:**
```bash
validate-dod M1.2   # Validar conclusão
validate-dor M1.3   # Validar próximo ready
```

---

## Changelog

### v4.0.0 (Março/2026)

**Unificação de Initiatives:**
- Aceita initiative-id (milestone ou detour)
- Detecção de tipo: MX.X → milestone, outro → detour (strip D-)
- Fontes de DoD por tipo (Roadmap § milestone vs § Desvios)
- Output path dual (milestones/ vs detours/)
- Verificação de infraestrutura com sugestão de init-milestone/init-detour
- Referências atualizadas com init-detour e paths de detour
- Adicionada seção "Detecção de Tipo" e "Uso Típico"

**Autor:** Fernando Bertholdo
**Contexto:** Padronização de Estrutura entre Milestones e Detours

### v3.0.0 (Fevereiro/2026)

**Post-DoD Reconciliation Gate:**
- Step 9: Se PASS e último milestone da initiative, invocar reconcile-initiative
- Próximas Ações: adicionado reconcile-initiative e archive-initiative
- Skills Relacionadas: adicionado reconcile-initiative e archive-initiative

**Autor:** Fernando Bertholdo
**Contexto:** Lifecycle completo de initiatives

### v2.0.0 (27/Janeiro/2026)

**Evolução para Verify Steps:**
- Adicionado suporte a `verify:` steps inline no TODO.md
- Execução programática de comandos de verificação
- Geração de Verification Report estruturado
- Distinção entre verificação programática e humana
- Template de relatório em `templates/verification-report.md`

**Autor:** Fernando Bertholdo
**Contexto:** Integração GSD patterns

### v1.0.0 (22/Janeiro/2026)

**Criação Inicial:**
- Validação de DoD por checklist
- 5 categorias (Funcional, Qualidade, Documentação, Segurança, Integração)
