---
name: organize-commits
description: Organizar mudanças pendentes em commits granulares seguindo Conventional Commits. Use quando houver múltiplas mudanças sem commitar, após trabalho extenso, quando não tiver certeza de como organizar commits logicamente, antes de push, ou como parte do checklist pré-commit.
---

# Organize Commits

Guia para organizar mudanças pendentes em commits **atômicos** e bem estruturados, seguindo Conventional Commits.

## Regra de Ouro

> **"1 task = 1 commit. NUNCA use git add . ou git add -A"**

Commits atômicos permitem:
- Git bisect eficiente (encontrar bugs)
- Reverts cirúrgicos (desfazer apenas uma mudança)
- Code review focado (revisar por contexto)
- Histórico legível (entender evolução)

## Protocolo Atomic Commits

### Regras Hard-Coded

1. **NUNCA** usar `git add .` ou `git add -A`
2. **SEMPRE** stage arquivos individualmente por task
3. **MÁXIMO** 100 linhas por commit (não 500)
4. **FORMATO:** `{type}({milestone}-{task}): {descricao-em-pt-br}`
5. **RASTREAR** hashes em TODO.md seção "Commits do Milestone"

### Exceções Permitidas

- TDD: até 3 commits por task (test → feat → refactor)
- Docs: commits maiores se apenas markdown
- Config: arquivos de configuração podem agrupar

## Quando Usar

- Após completar uma task (commit imediato)
- Após trabalho extenso que precisa ser granularizado
- Quando não tem certeza de como organizar commits logicamente
- Antes de fazer push (validar histórico local)
- Como parte do checklist pré-commit

## Workflow de Organização

```bash
1. Analisar mudanças pendentes
   - git status (ver arquivos modificados)
   - git diff --stat (contar linhas)
   - Identificar tasks associadas (via TODO.md)

2. Mapear mudanças por TASK (não por arquivo):
   - Qual task do TODO.md cada arquivo pertence?
   - Marcar arquivos órfãos (sem task clara)

3. Para CADA task, criar UM commit:
   - Stage apenas arquivos daquela task
   - NUNCA usar git add . ou git add -A
   - Formato: {type}({milestone}-{task}): {descricao-em-pt-br}
   - Máximo 100 linhas (quebrar se maior)

4. Executar commit atômico:
   ```bash
   # Correto:
   git add src/module/file.py
   git add tests/unit/test_file.py
   git commit -m "feat(M1.2-01): implementa funcionalidade X"

   # ERRADO:
   git add .  # NUNCA!
   git add -A # NUNCA!
   ```

5. Rastrear hash em TODO.md:
   - Adicionar hash na seção "Commits do Milestone"
   - Formato: `1. **Task N: Nome** - \`abc123f\` (type)`

6. Validar resultado:
   - git log --oneline -5 (ver commits recentes)
   - Verificar se cada commit é atômico
   - Confirmar hashes rastreados
```

## Convenções de Commits (Conventional Commits)

### Formato Padrão

```
<type>(<scope>): <assunto-em-pt-br>

<corpo-opcional-em-pt-br>

<footer>
```

`type` e `scope` permanecem nos tokens padrão de Conventional Commits. `subject`, `body` e qualquer texto descritivo complementar devem ser sempre em português do Brasil.

### Types Disponíveis

| Type | Quando Usar | Exemplo |
|------|-------------|---------|
| `feat` | Nova funcionalidade | `feat(collector): implementa download de dados` |
| `fix` | Correção de bug | `fix(parser): corrige parsing de datas` |
| `docs` | Documentação apenas | `docs(core): atualiza Projeto.md` |
| `refactor` | Refatoração sem mudança de comportamento | `refactor(processor): simplifica lógica` |
| `test` | Adiciona ou modifica testes | `test(alerting): adiciona testes para motor` |
| `chore` | Tarefas de manutenção | `chore(deps): atualiza dependencies` |
| `perf` | Melhoria de performance | `perf(calculator): otimiza cálculo` |
| `style` | Formatação | `style(code): aplica formatador` |
| `ci` | CI/CD configuration | `ci: adiciona GitHub Actions` |
| `build` | Build system | `build: configura setuptools` |

### Scopes Recomendados

Definir scopes específicos do projeto em CLAUDE.md. Exemplos comuns:

| Scope | Componente | Exemplo |
|-------|------------|---------|
| `collector` | src/collectors/ | `feat(collector): implementa scraper` |
| `processor` | src/processors/ | `feat(processor): adiciona normalizer` |
| `storage` | src/storage/ | `feat(storage): implementa persistência` |
| `alerting` | src/alerting/ | `feat(alerting): adiciona motor de regras` |
| `config` | settings, .env | `chore(config): adiciona variáveis` |
| `docs` | documents/, README | `docs(core): atualiza Roadmap.md` |
| `rules` | .claude/rules/ | `docs(rules): adiciona testing-requirements` |
| `skills` | .claude/skills/ | `docs(skills): adiciona novo skill` |
| `milestone` | Trabalho de milestone | `chore(milestone): prepara M1.2` |
| `deps` | requirements.txt | `chore(deps): atualiza selenium` |

### Subject (Obrigatório)

**Regras:**
- Máximo 72 caracteres
- Lowercase (não capitalizar)
- Imperativo ("adiciona" não "adicionado")
- Sem ponto final
- Descrever O QUE (não "porquê")
- Sempre em português do Brasil (`pt-BR`)
- Mesmo quando nomes técnicos estiverem em inglês, a frase do commit continua em `pt-BR`

### Body (Opcional, recomendado)

**Quando incluir:**
- Features significativas (>50 linhas)
- Decisões técnicas (porquê esta abordagem?)
- Trade-offs considerados
- Contexto de negócio

**Formato:**
- Linhas de 72 caracteres máximo
- Bullet points com `-` ou `*`
- Separe do subject com linha em branco
- Escrever sempre em português do Brasil (`pt-BR`)

### Footer (Opcional)

**Quando incluir:**
- Breaking changes: `BREAKING CHANGE: descrição`
- Issues relacionados: `Closes #123`, `Ref #456`
- Milestones: `Ref: M1.2 - Coletor Básico`

**IMPORTANTE - Política de Atribuição:**
- ❌ NUNCA incluir co-autoria com IA
- ❌ NUNCA mencionar assistentes de IA
- ❌ NUNCA incluir "Generated with X"
- ✅ SEMPRE apresentar como trabalho do desenvolvedor

## Princípios de Granularidade

### Tamanho Máximo: 100 Linhas

| Tamanho | Linhas | Status | Quando Aceitar |
|---------|--------|--------|----------------|
| **Pequeno** | <50 | ✅ Ideal | Config, chore, pequenos fixes |
| **Médio** | 50-100 | ✅ Ideal | Features isoladas, refactorings |
| **Grande** | 100-150 | ⚠️ Justificar | Testes extensos, docs |
| **Muito grande** | >150 | ❌ Quebrar | Dividir em múltiplos commits |

**Por que 100 linhas?**
- Cabe em uma tela de code review
- Fácil de entender em git show
- Reverts cirúrgicos possíveis
- Git bisect mais preciso

### Como Quebrar Commits Grandes

**Estratégias:**

1. **Por Feature/Componente**
   - Commit 1: Implementa componente A
   - Commit 2: Implementa componente B
   - Commit 3: Integra A + B

2. **Por Camada**
   - Commit 1: Models e schemas
   - Commit 2: Business logic
   - Commit 3: API endpoints
   - Commit 4: Tests

3. **Por Tipo de Mudança**
   - Commit 1: Features (feat)
   - Commit 2: Testes (test)
   - Commit 3: Documentação (docs)
   - Commit 4: Config/deps (chore)

4. **Por Dependência**
   - Commit 1: Base/fundação
   - Commit 2: Depende de Commit 1
   - Commit 3: Depende de Commits 1+2

## Rastreamento de Commits no TODO.md

Após cada commit, adicionar hash na seção do milestone:

```markdown
### Commits do Milestone M1.2

| # | Task | Hash | Type | Linhas |
|---|------|------|------|--------|
| 1 | Login automatizado | `abc123f` | feat | 85 |
| 2 | Download de dados | `def456g` | feat | 92 |
| 3 | Testes de login | `ghi789h` | test | 78 |
| 4 | Docs do milestone | `jkl012i` | docs | 45 |

**Total:** 4 commits, 300 linhas
```

**Por que rastrear?**
- Auditoria de progresso
- Facilita reverts por task
- Histórico claro por milestone
- Métricas de produtividade

## Anti-Padrões (O Que NÃO Fazer)

❌ **git add . ou git add -A** (NUNCA!)
```bash
# ERRADO - stage tudo indiscriminadamente
git add .
git commit -m "feat: implementa várias coisas"

# CORRETO - stage por task
git add src/collectors/scraper.py
git commit -m "feat(M1.2-01): implementa login"
```

❌ **Commit monolítico** (>100 linhas, múltiplos contextos)
```
feat: implementa M1.2 completo
[500 linhas: scraper + parser + tests]
# Impossível fazer revert cirúrgico
```

❌ **Commit "WIP" ou "checkpoint"** (sem mensagem clara)
```
chore: WIP
chore: salvando progresso
fix: corrige bug [qual bug?]
```

❌ **Commit misto** (feat + fix + docs juntos)
```
feat: adiciona scraper, corrige bug no parser, atualiza README
[3 contextos diferentes, difícil de reverter]
```

❌ **Commit sem rastreamento** (hash não registrado)
```
# Commit feito mas não adicionado ao TODO.md
# Perde-se rastreabilidade task → commit
```

## Exemplo Completo

### Cenário: Task M1.2-01 Completada

```bash
# 1. Ver mudanças pendentes
$ git status
modified:   src/collectors/scraper.py
modified:   tests/unit/test_scraper.py
modified:   documents/core/TODO.md

$ git diff --stat
 src/collectors/scraper.py     | 85 +++++++++++++
 tests/unit/test_scraper.py    | 42 +++++++
 documents/core/TODO.md            |  3 +
 3 files changed, 130 insertions(+)

# 2. Mapear por task
# - scraper.py → Task M1.2-01 (Login)
# - test_scraper.py → Task M1.2-01 (Login)
# - TODO.md → Atualização de tracking

# 3. Commit 1: Feature (85 linhas ✅)
$ git add src/collectors/scraper.py
$ git commit -m "feat(M1.2-01): implementa login automatizado"

# 4. Commit 2: Testes (42 linhas ✅)
$ git add tests/unit/test_scraper.py
$ git commit -m "test(M1.2-01): adiciona testes de login"

# 5. Commit 3: Tracking (3 linhas ✅)
$ git add documents/core/TODO.md
$ git commit -m "docs(M1.2): atualiza tracking de commits"

# 6. Verificar resultado
$ git log --oneline -3
abc123f feat(M1.2-01): implementa login automatizado
def456g test(M1.2-01): adiciona testes de login
ghi789h docs(M1.2): atualiza tracking de commits

# 7. Atualizar TODO.md com hashes
# (adicionar na seção "Commits do Milestone M1.2")
```

## Ferramentas Complementares

```bash
# Ver últimos commits
git log --oneline -5

# Ver detalhes de um commit
git show <sha>

# Ver arquivos modificados por commit
git show --stat <sha>

# Ver histórico de um arquivo
git log --follow --oneline -- path/to/file.py

# Amend (corrigir último commit)
git add arquivo-esquecido.py
git commit --amend --no-edit

# Corrigir mensagem do último commit
git commit --amend -m "nova mensagem"
```

## Quando NÃO Usar

- ❌ Commits já feitos (requer git rebase -i manual)
- ❌ Commits já pushed (não reescrever histórico público)
- ❌ Organizar commits de outras branches

## Próximas Ações Após Organizar

```bash
# 1. Validar commits localmente
git log --oneline -N

# 2. Executar checklist pré-push
pre-commit-check

# 3. Push para remoto
git push origin main

# 4. Atualizar TODO.md
# Marcar tarefas como completas
```

## Referências

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- `CLAUDE.md` - Seção "Commit Strategy"
- `documents/core/Roadmap.md` - Milestones
- `documents/core/TODO.md` - Tracking de commits

## Skills Relacionadas

- `pre-commit-check` - Checklist pré-commit (validar antes de commitar)
- `validate-dod` - Validar DoD (inclui verificar commits)
- `fresh-context` - Gerar contexto para nova sessão

---

## Changelog

### v2.0.0

**Evolução para Atomic Commits:**
- Regra hard-coded: NUNCA git add . ou git add -A
- Limite reduzido: 100 linhas (era 500)
- Formato: `{type}({milestone}-{task}): {descricao-em-pt-br}`
- Rastreamento de hashes em TODO.md
- Exemplos atualizados com workflow atômico

### v1.0.0

**Criação Inicial:**
- Organização de commits por contexto lógico
- Conventional Commits format
- Limite de 500 linhas por commit
