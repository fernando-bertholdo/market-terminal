---
name: sync-downstream
description: Forward-porting inteligente do template base para projetos em andamento. Detecta drift estrutural, compara changelogs via Sync-ID, mescla contextualmente respeitando o stack e jargão do projeto alvo e fecha o processo com organize-commits na origem e no destino.
---

# Sync Downstream

Empurra inovações dos repositórios template (upstream) para projetos derivados em andamento (downstream), lidando com saltos temporais grandes, drift estrutural, e preservando o contexto de negócio e stack tecnológico do projeto alvo.

## Regra de Ouro

> **"Nenhum projeto derivado deve adotar placeholders brancos. Se veio do template, traduza para o domínio alvo antes de aplicar."**

## Quando Usar

- Após atualizar skills/regras nos templates base
- Ao retomar projeto que ficou parado por semanas/meses
- Periodicamente, para manter projetos derivados atualizados
- Ao criar nova skill no template que beneficiaria projetos existentes

## Parâmetros

### Invocação por Commit Hash

```bash
# Sincronizar apenas alterações de commits específicos do template
sync-downstream /path/to/projeto a1b2c3d e4f5g6h

# Sincronizar commits específicos apenas de skills
sync-downstream /path/to/projeto a1b2c3d --scope skills
```

### Invocação por Changelog (modo automático)

```bash
# Sincronizar todas as entradas pendentes para um projeto
sync-downstream /path/to/projeto --all

# Sincronizar apenas regras pendentes
sync-downstream /path/to/projeto --all --scope rules
```

### Flags

- `--scope <skills|rules|workflows|prompts>`: Filtrar por subdiretório
- `--dry-run`: Apenas mostrar o que seria sincronizado, sem aplicar
- `--force`: Pular confirmações interativas (cuidado!)

## Procedimento

```bash
1. Receber path do projeto alvo e argumentos (hashes ou --all)

2. Persistência mínima da origem antes da descoberta:
   - Se o template upstream ainda tiver mudanças relevantes sem commit em
     `.claude/`, `.codex/` ou `.agents/`, invocar `organize-commits` antes de prosseguir
   - Rodar `pre-commit-check` antes de cada commit produzido nessa etapa
   - No modo `--all`, garantir que as entradas pendentes do changelog local do
     template apontem para hashes reais e estáveis

3. Validação do projeto alvo:
   - Verificar que path é repositório git válido
   - Verificar que projeto tem pelo menos .claude/ ou .agents/
   - Identificar o stack tecnológico do projeto:
     a. Ler package.json, requirements.txt, Cargo.toml, etc.
     b. Ler documents/core/Projeto.md se existir
     c. Inferir jargão e terminologia do domínio

4. Detecção de Drift Estrutural:

   4a. Comparar versões:
       - Ler versão em .agents/skills/README.md do template
       - Ler versão em .agents/skills/README.md do projeto alvo
       - Se gap > 1 versão major → avisar: "Drift significativo detectado"

   4b. Comparar estrutura de diretórios:
       - Listar pastas em template: .agents/{skills,rules,workflows,prompts,stacks}
       - Listar pastas no projeto alvo
       - Identificar: pastas inteiras que existem no template mas NÃO no projeto
       - Identificar: skills/regras individuais faltantes

   4c. Comparar changelogs:
       - Ler Changelog Local de cada subdiretório no template
       - Ler Changelog Local correspondente no projeto alvo
       - Cruzar por Sync-ID: entradas do template sem correspondência
         no projeto = pendentes de sincronização

5. Descoberta de modificações:

   5a. Se hashes fornecidos:
       - Para cada hash: executar `git show <hash> --stat` no repo do template
       - Filtrar apenas arquivos em .claude/, .codex/, .agents/
       - Extrair diff completo com `git show <hash> -- <arquivo>`

   5b. Se --all:
       - Usar resultado de 4c (entradas sem correspondência de Sync-ID)
       - Para cada entrada pendente, usar commit hash para extrair diff

6. Classificação de cada alteração:

   6a. NOVA (skill/regra/workflow que não existe no projeto alvo):
       → Copiar integralmente do template
       → Aplicar Tradução Descendente (step 7)
       → Criar diretório se necessário

   6b. ATUALIZAÇÃO (skill/regra já existe no projeto alvo):
       → Ler versão atual do projeto alvo
       → Identificar blocos alterados no template vs. projeto alvo
       → Merge inteligente: manter customizações locais + aplicar melhorias
       → Perguntar ao usuário em caso de conflito

   6c. ESTRUTURAL (diretório inteiro novo):
       → Copiar estrutura completa
       → Aplicar Tradução Descendente em cada arquivo

7. Tradução Descendente (CRÍTICO):
   Para CADA arquivo que será aplicado no projeto alvo:

   7a. Identificar placeholders do template:
       {{PROJECT_NAME}}, {{TECH_STACK}}, {{API_URL}}, etc.

   7b. Resolver usando contexto do projeto alvo:
       - Ler Projeto.md → nome do projeto, stack, domínio
       - Ler package.json/requirements.txt → dependências
       - Ler CLAUDE.md/AGENTS.md → scopes de commit, regras existentes

   7c. Substituir placeholders por valores reais:
       - {{PROJECT_NAME}} → "MonoScribe"
       - {{TECH_STACK}} → "TypeScript, React, Vite"
       - Referências genéricas → termos do domínio do projeto

   7d. REGRA FUNDAMENTAL: Jamais deixar {{PLACEHOLDER}} no resultado.
       Se não conseguir resolver → perguntar ao usuário.

8. Aplicação no projeto alvo:
   - Escrever arquivos traduzidos nos diretórios correspondentes
   - REPLICAÇÃO ENTRE CAMADAS (obrigatório):
     a. Aplicar o arquivo em .claude/ (fonte canônica)
     b. Copiar o mesmo conteúdo para .codex/ e .agents/ (mesmo path relativo)
     c. Se a camada destino não tem o subdiretório → criá-lo
     d. Exemplo: `.claude/skills/foo/SKILL.md` →
        `.codex/skills/foo/SKILL.md` e `.agents/skills/foo/SKILL.md`
     NUNCA aplicar em apenas uma camada — as 3 devem ser atualizadas em conjunto

9. Atualização de índices no projeto alvo:
   - Se nova skill → adicionar à tabela em skills/README.md de CADA camada (.claude/, .codex/, .agents/)
   - Se nova regra → adicionar à tabela em rules/README.md de CADA camada (.claude/, .codex/, .agents/)
   - Manter formato e estilo do README de cada camada (podem diferir entre si)

10. Registro de Sync-ID (RASTREABILIDADE):
   - Usar o mesmo Sync-ID da entrada de origem no template
   - Se a entrada no template já tem Sync-ID → usar esse mesmo ID
   - Se não tem (sync avulso) → gerar novo SYNC-YYYYMMDD-NNN
   - REGISTRAR no Changelog Local do subdiretório do projeto alvo
   - Garantir que o mesmo Sync-ID existe nos dois repos

11. Finalização Git obrigatória:
    - Invocar `organize-commits` no projeto alvo com apenas os arquivos tocados
      pela sincronização
    - Rodar `pre-commit-check` no projeto alvo e efetivar o commit do sync
    - Se a origem/template foi alterada por Sync-ID, changelog ou ajustes de merge,
      invocar `organize-commits` nela também
    - Rodar `pre-commit-check` na origem e efetivar o commit correspondente
    - Só encerrar quando origem e destino estiverem com worktree limpo

12. Relatório de Sincronização:
    Gerar relatório resumido com:
    - Drift detectado (versão, estrutura)
    - Arquivos sincronizados (template → projeto)
    - Traduções aplicadas (placeholders → valores)
    - Conflitos encontrados e como foram resolvidos
    - Sync-IDs registrados
    - Commits efetivamente criados na origem e no destino
    - Confirmação de que nenhum repo tocado ficou dirty
```

## Exemplo de Fluxo: Projeto Parado 6 Meses

```
Usuário: sync-downstream /path/to/MonoScribe --all

1. Agente detecta drift:
   - Template skills v2.0.0 vs MonoScribe v1.0.0
   - 3 skills novas no template que não existem no MonoScribe
   - 2 skills atualizadas no template

2. Para skill nova "reconcile-initiative":
   - Copia SKILL.md do template
   - Substitui {{PROJECT_NAME}} → "MonoScribe"
   - Referências a `documents/core/Projeto.md` → mantidas (existem no MonoScribe)
   - Resultado: skill pronta para uso

3. Para skill atualizada "validate-dod" (v3.0.0 no template, v2.0.0 no MonoScribe):
   - Lê versão local do MonoScribe
   - Identifica blocos novos (reconciliation gate)
   - Merge: mantém customizações locais + adiciona blocos novos
   - Pergunta se quer sobrescrever blocos conflitantes

4. Sync-IDs registrados:
   - SYNC-20260305-001 → reconcile-initiative (novo)
   - SYNC-20260305-002 → validate-dod (atualizado)

5. Finalização Git:
   - `organize-commits` + `pre-commit-check` no projeto alvo
   - `organize-commits` + `pre-commit-check` no template se houve changelog novo
   - Encerramento apenas com ambos os repos limpos
```

## Regras de Segurança

**Antes de aplicar qualquer alteração:**
- Verificar que nenhum placeholder ficou sem resolver
- Verificar que dados do template não sobrescrevem dados sensíveis do projeto
- Confirmar com o usuário antes de sobrescrever arquivos existentes
- Planejar a persistência em Git da origem e do destino antes de encerrar

**NUNCA:**
- Sobrescrever silenciosamente customizações locais
- Aplicar placeholders {{}} no projeto alvo sem traduzir
- Modificar documentos de negócio do projeto (documents/)

## Quando NÃO Usar

- Para sincronizar código-fonte → use git subtree/submodule
- Para levar inovações do projeto para o template → use `mirror-upstream`
- Para atualizar documentação de negócio → use `update-docs`
- Para validar estado do projeto → use `validate-dod`

## Skills Relacionadas

- `mirror-upstream` — Operação inversa: subir do projeto para templates
- `organize-commits` — Obrigatória para fechar a sincronização na origem e no destino
- `pre-commit-check` — Validação obrigatória antes de cada commit da sincronização
- `validate-dod` — Validar estado do projeto após sincronização
- `fresh-context` — Gerar contexto após sincronização grande

---

## Changelog

### v1.3.0

**Subrotina de Marketplace Externo:**
- UI skills agora vivem no marketplace `4-successful-ai-life` (repo `fernando-bertholdo/4-successful-AI-life`)
- Ao sincronizar downstream um projeto que tem UI skills, chamar `scripts/release/sync-ui-from-marketplace.sh` no projeto alvo em vez de copiar skills UI diretamente
- O script lê `plugin.json` do marketplace e replica em formato flat para `.codex/skills/ui-*/` e `.agents/skills/ui-*/`
- A camada `.claude/` consome via plugin instalado (`extraKnownMarketplaces` em `settings.json`), não via flat copy
- Validar paridade pós-sync com `scripts/validate/validate-ui-parity.sh`
- Fluxo: (1) sync settings.json para o projeto alvo, (2) rodar `sync-ui-from-marketplace.sh` no projeto alvo, (3) rodar `validate-ui-parity.sh`, (4) commit no projeto alvo

### v1.2.0

**Replicação entre Camadas (intra-repositório):**
- Step 8: Substitui lógica parcial por replicação obrigatória para as 3 camadas (.claude/, .codex/, .agents/)
- Step 9: Índices (README.md) devem ser atualizados em todas as 3 camadas
- Garante que nenhuma camada fique dessincronizada após operação de sincronização

### v1.1.0

**Fechamento transacional com Git:**
- Passa a exigir `organize-commits` e `pre-commit-check` na origem antes da descoberta, quando necessário
- Passa a finalizar a sincronização com commit real no projeto alvo
- Passa a commitar também a origem quando Sync-ID/changelog forem atualizados
- Encerramento condicionado a worktrees limpos na origem e no destino

### v1.0.0

**Criação Inicial:**
- Invocação por commit hash ou por changelog (--all)
- Detecção de drift estrutural (versão, diretórios, changelogs)
- Tradução descendente com resolução automática de placeholders
- Merge inteligente para skills/regras existentes
- Rastreabilidade via Sync-ID bidirecional
- Classificação automática: NOVA / ATUALIZAÇÃO / ESTRUTURAL
- Relatório de sincronização com comandos git sugeridos

**Contexto:** Arquitetura de sincronização bidirecional de agentes
