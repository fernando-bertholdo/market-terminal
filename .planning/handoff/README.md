# Context Handoff Pattern

## Metadata

- **Versão:** 1.1.0
- **Status:** Ativo
- **Última atualização:** {{DATE}}

---

## O Que é Este Diretório

Este diretório contém o **template** e a documentação do padrão CONTEXT.md. Os arquivos CONTEXT.md propriamente ditos ficam nas initiatives (`.planning/<initiative>/handoff/`) ou no scratch (`.planning/scratch/`).

## Problema que Resolve

**Context Rot:** Em sessões longas (>150k tokens), o contexto acumula noise que degrada a qualidade das respostas. O padrão CONTEXT.md permite:

1. **Fresh Context** - Subagentes iniciam com contexto limpo e focado
2. **Handoff Eficiente** - Transições entre sessões sem perda de informação
3. **Decisões Locked** - Escolhas já feitas não precisam ser re-discutidas

## Três Papéis do CONTEXT.md

| Arquivo | Papel | Ciclo de Vida |
|---------|-------|---------------|
| `<initiative>/CONTEXT.md` | **Contexto vivo** — estado atual, decisões, próximo passo | Atualizado durante trabalho ativo |
| `<initiative>/handoff/<id>-CONTEXT.md` | **Snapshot frozen** — handoff para sessão limpa | Criado por `fresh-context`, frozen ao completar |
| `.planning/scratch/<slug>-CONTEXT.md` | **Dump sob demanda** — contexto avulso sem vínculo a initiative | Efêmero; migra para initiative quando se concretiza |

## Estrutura do CONTEXT.md

Cada arquivo CONTEXT.md usa **tags semânticas XML-style** para organizar informação:

```markdown
<domain>
  Escopo fixo do milestone (vem do Roadmap.md).
  Define o que ESTÁ e NÃO ESTÁ no scope.
  Esta seção é IMUTÁVEL durante o milestone.
</domain>

<decisions>
  ## Decisões Locked
  Escolhas já confirmadas que NÃO devem ser re-questionadas.
  Ex: "Usar framework X (não Y)"

  ## Claude's Discretion
  Áreas onde o agente pode tomar decisões sem perguntar.
  Ex: "Estrutura interna de classes"
</decisions>

<specifics>
  Referências específicas do usuário/stakeholder.
  Ex: "Formato de output deve seguir padrão Z"
  Pode estar vazio se não há referências específicas.
</specifics>

<deferred>
  Ideias e features para outras fases.
  Previne scope creep mantendo registro do que foi adiado.
  Ex: "Dashboard avançado → Fase 4"
</deferred>
```

## Nomenclatura de Arquivos

**Formato:** `M{X}.{Y}-CONTEXT.md`

**Exemplos:**
- `M1.2-CONTEXT.md` - Contexto do milestone M1.2
- `Fase0-CONTEXT.md` - Contexto da Fase 0 inteira
- `pre-fase-0-CONTEXT.md` - Contexto de pré-setup

## Onde Salvar (por tipo de trabalho)

| Tipo | Caminho |
|------|---------|
| **milestone** | `.planning/<initiative>/handoff/<milestone-id>-CONTEXT.md` |
| **detour** | `.planning/<detour-name>/handoff/<id>-CONTEXT.md` |
| **sem vínculo** | `.planning/scratch/<slug>-CONTEXT.md` |

Ver `.planning/README.md` para identificar a initiative de cada milestone.

## Quando Criar/Atualizar

### Criar CONTEXT.md

1. **Ao iniciar um milestone** - Skill `fresh-context` gera automaticamente
2. **Após sessão longa** (>150k tokens) - Capturar estado atual
3. **Antes de handoff para subagente** - Fornecer contexto focado

### Atualizar CONTEXT.md

1. **Após decisão técnica** - Mover para "Decisões Locked"
2. **Quando ideia é adiada** - Adicionar em `<deferred>`
3. **Quando referência específica surge** - Adicionar em `<specifics>`

## Integração com Outros Documentos

```
Roadmap.md (DoR/DoD)
    ↓ domain
CONTEXT.md (handoff)
    ↓ context
Subagente/Nova Sessão
    ↓ execução
TODO.md (tracking)
```

**Não duplicar:**
- DoR/DoD vem do Roadmap.md (referência, não cópia)
- Tarefas granulares vem do TODO.md
- Regras de negócio vem do Projeto.md
- Decisões/entregas consolidadas do milestone devem ser registradas em `documents/core/Projeto.md` e referenciadas no `documents/core/Roadmap.md` (o CONTEXT só aponta para essas fontes)

## Uso com /clear

Ao usar CONTEXT.md para nova sessão:

```markdown
/clear

[Colar conteúdo do CONTEXT.md aqui]

Vamos continuar a implementação do [MILESTONE-ID].
```

**Rationale para /clear:**
- Limpa contexto degradado
- CONTEXT.md fornece essencial em ~200-300 tokens
- Subagente inicia com foco máximo

## Referências

- **Template:** `template-CONTEXT.md` neste diretório
- **Hub de Iniciativas:** `.planning/README.md` (mapeamento milestone → initiative)
- **Skill:** `.claude/skills/fresh-context/SKILL.md`
- **Roadmap:** `documents/core/Roadmap.md`
- **TODO:** `documents/core/TODO.md`

---

**Última atualização:** {{DATE}}
