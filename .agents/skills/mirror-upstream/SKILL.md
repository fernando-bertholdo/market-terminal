---
name: mirror-upstream
description: Backport inteligente de configurações de agentes (.claude/, .codex/, .agents/) para repositórios template upstream. Escaneia changelogs locais ou commits específicos, neutraliza contexto de negócio, aplica nos templates com rastreabilidade via Sync-ID e fecha o processo com organize-commits na origem e nos destinos.
---

# Mirror Upstream

Espelha modificações locais feitas nos diretórios de agentes (`.claude/`, `.codex/`, `.agents/`) de um projeto derivado de volta para os repositórios template da organização (backport), aplicando filtros de agnosticidade específicos para cada template destino.

## Regra de Ouro

> **"Nenhuma melhoria descoberta na trincheira deve ficar presa no projeto. Se funciona aqui, suba para os templates."**

## Quando Usar

- Após melhorar uma skill, regra ou workflow durante desenvolvimento ativo
- Ao criar uma nova skill que seria útil em outros projetos
- Periodicamente, para sincronizar melhorias acumuladas
- Antes de completar uma fase/initiative, para consolidar aprendizados

## Parâmetros

### Invocação por Commit Hash (recomendado)

```bash
# Espelhar apenas alterações de commits específicos
mirror-upstream a1b2c3d e4f5g6h

# Espelhar commits específicos para um template específico
mirror-upstream a1b2c3d --target lass
mirror-upstream a1b2c3d --target tech
```

### Invocação por Changelog (modo automático)

```bash
# Espelhar todas as entradas pendentes (Sync-ID = —)
mirror-upstream --all

# Espelhar entradas pendentes de um subdiretório específico
mirror-upstream --all --scope skills
mirror-upstream --all --scope rules
```

### Flags

- `--target <lass|tech|all>`: Template destino (default: all)
- `--scope <skills|rules|workflows|prompts>`: Filtrar por subdiretório
- `--dry-run`: Apenas mostrar o que seria espelhado, sem aplicar

## Procedimento

```bash
1. Receber argumentos (hashes ou --all)

2. Persistência mínima da origem antes da descoberta:
   - Se houver mudanças relevantes em `.claude/`, `.codex/` ou `.agents/` ainda sem commit,
     invocar `organize-commits` no repo origem antes de prosseguir
   - Rodar `pre-commit-check` antes de cada commit produzido nessa etapa
   - No modo `--all`, garantir que cada entrada pendente no changelog local
     aponte para um hash já existente e estável

3. Resolução de caminhos dos templates upstream:
   - Verificar se variáveis de ambiente existem:
     LASS_TEMPLATE_PATH → (ex: /path/to/lass-project-template)
     TECH_TEMPLATE_PATH → (ex: /path/to/tech-product-template)
   - Se não existirem, perguntar ao usuário os paths absolutos
   - Validar que os paths são repositórios git válidos

4. Descoberta de modificações:

   4a. Se hashes fornecidos:
       - Para cada hash: executar `git show <hash> --stat`
       - Filtrar apenas arquivos em .claude/, .codex/, .agents/
       - Extrair o diff completo de cada arquivo com `git show <hash> -- <arquivo>`

   4b. Se --all:
       - Ler README.md de cada subdiretório em .claude/, .codex/, .agents/
       - Buscar seção "## Changelog Local"
       - Filtrar entradas com Sync-ID = "—" (pendentes)
       - Para cada entrada pendente, usar o commit hash para
         `git show <hash> -- <arquivo>`

5. Priorização de fonte:
   - Usar .claude/ como fonte primária (onde alterações geralmente são feitas primeiro)
   - Se arquivo existe em .claude/ E .agents/ com mesma alteração,
     usar versão de .claude/ como referência canônica
   - Evitar duplicação: não espelhar a mesma alteração duas vezes

6. Transformação Inteligente por template destino:

   6a. Para lass-project-template (AGNÓSTICO TOTAL):
       - REMOVER: nomes de empresas, IPs, URLs de produção, tokens, secrets
       - REMOVER: regras de negócio ultra-específicas do projeto atual
       - SUBSTITUIR por placeholders: {{PROJECT_NAME}}, {{API_URL}}, etc.
       - MANTER: estrutura, lógica procedimental, boas práticas genéricas
       - MANTER: todos os placeholders {{VAR}} já existentes no template
       - Tom: neutro, documentação genérica de template

   6b. Para tech-product-template (VIÉS TECH):
       - REMOVER: dados ultra-específicos do projeto (IPs, tokens, nomes)
       - MANTER: jargão de engenharia de software moderna (SaaS, CI/CD, APIs)
       - MANTER: referências a frameworks, linguagens, ferramentas comuns
       - ADAPTAR: terminologia para startups/produtos de tecnologia
       - Tom: moderno, orientado a produto tech

7. Aplicação nos templates destino:
   - Escrever arquivos transformados nos diretórios correspondentes
   - Se nova skill/regra → criar o diretório e arquivo
   - Se skill/regra existente → aplicar merge inteligente:
     a. Ler versão atual do template
     b. Identificar blocos alterados vs. blocos originais
     c. Aplicar apenas os blocos novos/modificados
   - REPLICAÇÃO ENTRE CAMADAS (obrigatório):
     Para CADA repositório tocado (origem E templates destino):
     a. Identificar em qual camada (.claude/, .codex/, .agents/) o arquivo foi escrito
     b. Replicar o conteúdo final para as OUTRAS DUAS camadas, no mesmo path relativo
     c. Se a camada destino não tem o subdiretório → criá-lo
     d. Exemplo: `.claude/skills/foo/SKILL.md` →
        `.codex/skills/foo/SKILL.md` e `.agents/skills/foo/SKILL.md`
     NUNCA aplicar em apenas uma camada — as 3 devem ser atualizadas em conjunto

8. Atualização de índices:
   - Se nova skill → adicionar à tabela em skills/README.md de CADA camada (.claude/, .codex/, .agents/)
   - Se nova regra → adicionar à tabela em rules/README.md de CADA camada (.claude/, .codex/, .agents/)
   - Manter formato e estilo do README de cada camada (podem diferir entre si)

9. Registro de Sync-ID (RASTREABILIDADE):
   - Gerar Sync-ID no formato SYNC-YYYYMMDD-NNN
   - REGISTRAR no Changelog Local do subdiretório DESTINO (template)
   - ATUALIZAR o Changelog Local do subdiretório ORIGEM (projeto atual)
     preenchendo o Sync-ID da entrada que antes era "—"
   - O mesmo Sync-ID aparece nos dois repos = vínculo bidirecional

10. Finalização Git obrigatória:
   - Invocar `organize-commits` em cada template destino tocado pelo espelhamento
   - Rodar `pre-commit-check` nos templates destino e efetivar os commits
   - Invocar `organize-commits` novamente no repo origem para persistir
     atualizações de changelog/Sync-ID feitas durante o espelhamento
   - Rodar `pre-commit-check` na origem e efetivar o commit final de rastreabilidade
   - Só encerrar quando todos os repositórios tocados estiverem com worktree limpo

11. Relatório de Espelhamento:
   Gerar relatório resumido com:
   - Arquivos espelhados (origem → destino)
   - Transformações aplicadas (o que foi neutralizado)
   - Sync-IDs gerados
   - Commits efetivamente criados na origem e nos destinos
   - Confirmação de que nenhum repo tocado ficou dirty
```

## Exemplo de Fluxo Completo

```
Usuário: mirror-upstream a1b2c3d

1. Agente executa: git show a1b2c3d --stat
   → .claude/skills/organize-commits/SKILL.md (modified)

2. Agente extrai diff: git show a1b2c3d -- .claude/skills/organize-commits/SKILL.md

3. Transformação para lass-project-template:
   - "MonoScribe" → "{{PROJECT_NAME}}"
   - "TypeScript/React/Vite" → "{{TECH_STACK}}"
   - Lógica do workflow → mantida integralmente

4. Transformação para tech-product-template:
   - "MonoScribe" → removido
   - "TypeScript/React/Vite" → mantido (é jargão tech válido)
   - Lógica do workflow → mantida integralmente

5. Escrita em ambos templates

6. Sync-ID gerado: SYNC-20260305-001
   → Registrado nos changelogs de ambos templates
   → Atualizado no changelog do projeto atual

7. Finalização Git:
   → `organize-commits` + `pre-commit-check` nos templates destino
   → `organize-commits` + `pre-commit-check` na origem para o commit de Sync-ID
   → Encerramento apenas com todos os repos limpos
```

## Regras de Segurança

**NUNCA espelhar:**
- Arquivos `.env` ou qualquer arquivo com secrets
- Conteúdo de `documents/` (regras de negócio do projeto)
- Configurações de CI/CD com tokens reais
- Paths absolutos do sistema local do usuário

**SEMPRE verificar:**
- Que nenhum dado sensível passou pelo filtro
- Que placeholders foram corretamente aplicados
- Que o arquivo resultante é válido (não quebrado pelo parse)
- Que origem e destinos receberam commits reais antes do encerramento

## Quando NÃO Usar

- Para copiar documentos de negócio → use export manual
- Para sincronizar código-fonte → use git subtree/submodule
- Para atualizar projeto derivado a partir do template → use `sync-downstream`
- Para arquivamento de initiative → use `archive-initiative`

## Skills Relacionadas

- `sync-downstream` — Operação inversa: empurrar do template para projetos derivados
- `organize-commits` — Obrigatória antes e depois do espelhamento para origem e destinos
- `pre-commit-check` — Validação obrigatória antes de cada commit do espelhamento

---

## Changelog

### v1.2.0

**Replicação entre Camadas (intra-repositório):**
- Step 7: Exige replicação obrigatória para as 3 camadas (.claude/, .codex/, .agents/) ao escrever em qualquer repositório
- Step 8: Índices (README.md) devem ser atualizados em todas as 3 camadas
- Garante que nenhuma camada fique dessincronizada após operação de espelhamento

### v1.1.0

**Fechamento transacional com Git:**
- Passa a exigir `organize-commits` e `pre-commit-check` na origem antes da descoberta, quando necessário
- Passa a finalizar o espelhamento com commits reais nos templates destino
- Passa a commitar também a origem após atualizar changelog local e Sync-ID
- Encerramento condicionado a worktrees limpos em todos os repositórios tocados

### v1.0.0

**Criação Inicial:**
- Invocação por commit hash ou por changelog (--all)
- Transformação inteligente por template (agnóstico vs tech)
- Rastreabilidade via Sync-ID bidirecional
- Scanning de .claude/, .codex/ e .agents/ com priorização de .claude/
- Regras de segurança contra vazamento de dados sensíveis
- Relatório de espelhamento com comandos git sugeridos

**Contexto:** Arquitetura de sincronização bidirecional de agentes
