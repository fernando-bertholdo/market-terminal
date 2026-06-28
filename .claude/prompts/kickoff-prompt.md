<!-- @kickoff-exclude -->

# Prompt de Kick-off de Projeto

## Contexto

Você está configurando um novo projeto usando este template padrão.
Sua tarefa é preencher **todos** os templates com informações específicas do projeto, usando discovery dinâmico em vez de uma lista fixa de arquivos.

---

## Documentos de Entrada

Analise os arquivos em `documents/archive/`:
- TAP (Termo de Abertura do Projeto)
- Transcrições de reuniões
- Especificações técnicas
- Qualquer outro documento de contexto

### TAP Otimizado (Skill `generate-tap`)

Se o TAP foi gerado pela skill `generate-tap`, ele contém um **Apêndice B — Mapa de Extração** com tabela direta: `Placeholder -> Seção -> Valor`. Use esta tabela como guia prioritário para preencher placeholders — evita interpretar texto narrativo.

Se o TAP é de formato livre (não gerado pela skill), extraia informações normalmente das seções do documento.

---

## Tarefas

### 1. Extrair Informações-Chave

Dos documentos de kick-off, extraia:

**Informações Básicas:**
- Nome do projeto (formal e slug para paths)
- Descrição breve (1-2 frases)
- Contexto de negócio (problema a resolver)
- Organização responsável
- Responsável/owner do projeto

**Objetivos e Escopo:**
- Objetivo principal
- Objetivos específicos (3-5)
- O que está no escopo (MVP)
- O que está fora do escopo

**Aspectos Técnicos:**
- Stack tecnológica proposta
- Integrações necessárias
- Dependências externas
- Requisitos de infraestrutura
- Comandos do stack: test, lint, format, typecheck, coverage (para skills operacionais)

**Gestão:**
- Fases propostas
- Timeline estimada
- Riscos identificados
- Stakeholders

---

### 2. Descobrir e Preencher Placeholders

Em vez de seguir uma lista fixa de arquivos, use **discovery dinâmico**:

#### Passo 2a: Escanear o projeto

```bash
# Encontrar TODOS os arquivos com placeholders
grep -rl '{{' --include='*.md' --include='*.json' --include='*.toml' --include='*.sh' .
```

#### Passo 2b: Filtrar por anotações

Para cada arquivo encontrado:

1. **Se contém `<!-- @kickoff-exclude -->`:** Pular (é arquivo de referência/instrução)
2. **Se contém `<!-- @runtime-placeholders: VAR1, VAR2 -->`:** Preencher APENAS os placeholders que NÃO estão na lista de runtime
3. **Demais arquivos:** Preencher TODOS os `{{...}}` encontrados

#### Passo 2c: Preencher por prioridade

**CRITICAL — Identidade do projeto (preencher primeiro):**
Estes placeholders aparecem em múltiplos arquivos e devem ter valor consistente:
- `Market Terminal` — Nome formal do projeto
- `Fernando Bertholdo` — Responsável/owner
- `Fernando Bertholdo` — Autor dos documentos
- `Fernando Bertholdo` — Nome da organização
- `web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning` — Scopes para conventional commits (baseados na arquitetura)
- `2026-06-28` — Data atual (usar em todos os arquivos)

**HIGH — Comandos de stack (preencher ao definir stack):**
Estes placeholders configuram as skills operacionais do projeto:
- `npm run type-check` — Ex.: `pytest`, `npm test`, `go test ./...`, `cargo test`
- `npm run lint` — Ex.: `ruff check src/`, `eslint .`, `golangci-lint run`
- `npx prettier --check .` — Ex.: `ruff format src/`, `prettier --check .`, `gofmt -l .`
- `npm run type-check` — Ex.: `mypy src/`, `tsc --noEmit`, (vazio se não aplicável)
- `npm run type-check` — Ex.: `pytest --cov=src`, `npm run coverage`
- `npm update` — Ex.: `pip install --upgrade`, `npm update`

**MEDIUM — Conteúdo de documentação:**
Placeholders em `documents/core/` (Projeto.md, Roadmap.md, TODO.md) que descrevem o negócio, objetivos, fases, riscos, etc.

**LOW — Metadata:**
`2026-06-28`, `{{START_DATE}}`, `{{END_DATE}}`, e metadata de arquivos.

#### Passo 2d: Garantir consistência

O mesmo placeholder deve ter o mesmo valor em TODOS os arquivos onde aparece. Exemplos:
- `Market Terminal` deve ser idêntico em README.md, CLAUDE.md, Projeto.md, settings.json, etc.
- `web, sim, market, news, macro, auth, infra, scheduler, deploy, fetchers, docs, planning` deve ser idêntico em CLAUDE.md, AGENTS.md, README.md
- `npm run type-check` deve ser idêntico em pre-commit-check, validate-testing, security-best-practices

---

### 3. Definir Scopes de Commit

Baseado na arquitetura do projeto, defina scopes apropriados:

**Exemplos por tipo de projeto:**

| Tipo | Scopes Sugeridos |
|------|------------------|
| API REST | api, auth, db, models, routes, middleware, docs |
| Automacao | collector, processor, storage, alerting, config |
| CLI Tool | cli, commands, config, utils, docs |
| Web App | frontend, backend, api, auth, components, pages |

---

### 4. Criar Estrutura de Diretórios

Se necessário, crie diretórios de código fonte e testes conforme o stack:

```bash
# Adapte para o stack do projeto. Exemplos:
# Python:  mkdir -p src/{domain,services,integrations,utils} tests/{unit,integration,fixtures}
# Node.js: mkdir -p src/{routes,controllers,services,models} tests/{unit,integration}
# Go:      mkdir -p cmd/ pkg/{handlers,services,models} internal/
# Rust:    mkdir -p src/{handlers,services,models} tests/
```

---

### 5. Configurar Ambiente

- Ajustar `.env.example` com variáveis relevantes para o projeto
- Remover variáveis não aplicáveis do `.env.example`
- Configurar `.claude/settings.json` com nome e descrição do projeto
- Configurar `.codex/config.toml` (mirror) se aplicável

---

### 6. Remover Comentários de Instrução

Após preencher todos os placeholders, remover blocos de instrução do template:

```bash
# Buscar comentários de instrução que devem ser removidos
grep -rn 'INSTRUÇÃO\|PREENCHER\|Preencher\|Substitua' --include='*.md' . | grep '<!--'
```

Remover blocos como:
- `<!-- INSTRUÇÕES DE PREENCHIMENTO: ... -->`
- `<!-- Preencher com: ... -->`
- `<!-- Substituir pelo diagrama real... -->`
- `<!-- PROJECT_TYPE pode ser: ... -->`

**Nota:** NÃO remover anotações `<!-- @runtime-placeholders: ... -->` e `<!-- @kickoff-exclude -->`. Estas são operacionais, não instrucionais.

---

### 7. Validar

Após preencher, execute a skill de validação:

```
validate-kickoff
```

Esta skill irá:
- Escanear todos os arquivos dinamicamente
- Respeitar `@kickoff-exclude` e `@runtime-placeholders`
- Reportar placeholders não preenchidos com severidade
- Detectar inconsistências entre arquivos
- Listar comentários de instrução restantes

Complementar com:
```
validate-docs-links check
```

---

## Output Esperado

Arquivos preenchidos e prontos para desenvolvimento, mantendo:

- **Arquitetura Single Source of Truth** — CLAUDE.md → Projeto.md → rules/*.md
- **Padrões de qualidade do template** — Code quality, testing, security
- **Skills operacionais configuradas** — Comandos de stack preenchidos para que pre-commit-check, validate-testing, etc. funcionem
- **Classificação distribuída intacta** — Anotações `@runtime-placeholders` preservadas para operação futura

---

## Notas Importantes

1. **Não invente informações** — Se algo não está nos documentos de kick-off, use placeholder ou pergunte
2. **Mantenha consistência** — Mesmo placeholder, mesmo valor em todos os arquivos
3. **Seja específico** — Evite descrições genéricas como "sistema de gestão"
4. **Documente decisões** — Se tomar decisões durante o preenchimento, documente em Projeto.md
5. **Preserve anotações operacionais** — `@runtime-placeholders` e `@kickoff-exclude` são parte do sistema, não do template
6. **Stack commands são obrigatórios** — Skills como pre-commit-check dependem de `npm run type-check` etc. estar preenchido

---

**Versão:** 2.0.0
**Template:** v1.1.0
