---
name: generate-tap
description: Gerar Termo de Abertura do Projeto (TAP) a partir de materiais em documents/archive/. Escaneia automaticamente PDFs, transcrições e specs, extrai informações com rastreabilidade radical, e gera documento dual-layer (executivo + estruturado) otimizado para alimentar o kickoff do template. Use antes do kickoff para transformar materiais brutos em fonte estruturada de placeholders.
---

# Skill: generate-tap

Gerar TAP (Termo de Abertura do Projeto) a partir de materiais brutos, otimizado para alimentar o kickoff.

## Pipeline

```
Materiais brutos (transcrições, PDFs, specs)
    |
    v
generate-tap (extração + consolidação)
    |
    v
TAP dual-layer (executivo + Mapa de Extração)
    |
    v
kickoff (preenchimento automático dos templates)
```

## Quando Usar

- **Antes do kickoff** — para transformar materiais brutos em documento estruturado
- **Quando há múltiplos materiais** — transcrições, PDFs, specs em `documents/archive/`
- **Para garantir rastreabilidade** — toda informação ligada a evidência

## Quando NÃO Usar

- Se o TAP já existe e está pronto — vá direto ao kickoff
- Se há apenas informações orais — peça ao usuário descrever no chat e use diretamente no kickoff
- Se o projeto é trivial — preencha o kickoff diretamente

## Input Esperado

```
generate-tap
```
Escaneia `documents/archive/` automaticamente.

```
generate-tap --materiais "arquivo1.pdf, arquivo2.txt"
```
Especifica materiais manualmente.

## Output

- **Arquivo:** `documents/archive/TAP_{PROJECT_SLUG}.md` (ou `TAP_projeto.md` se slug não determinado)
- **Relatório:** Seções completas, gaps identificados, perguntas pendentes

## Workflow

### 1. Escanear `documents/archive/`

```
Para cada arquivo em documents/archive/ (excluindo README.md):
  Classificar por tipo:
    - PDF → Ler e extrair conteúdo
    - TXT / MD → Ler como texto (transcrições, specs)
    - Imagens (PNG/JPG) → Analisar visualmente (diagramas, screenshots)
    - DOCX → Ler conteúdo textual

  Reportar ao usuário:
    "Encontrei N materiais: [lista com tipo de cada um]"
```

Se `documents/archive/` estiver vazio ou não existir, perguntar ao usuário onde estão os materiais.

### 2. Extrair Notas (por material)

Para **cada** material:

```
a) Ler conteúdo COMPLETO com atenção minuciosa
b) Gerar 5-15 bullets de extração
c) Taguear cada bullet:
   - [FATO] — informação explícita no material
   - [DECISÃO] — decisão registrada
   - [DÚVIDA] — pergunta feita mas não respondida
   - [PENDÊNCIA] — ação necessária não concluída
   - [RISCO] — risco identificado
   - [PREMISSA] — suposição feita por falta de info

d) Incluir referência:
   - PDFs: (Arquivo X — pág Y)
   - Transcrições: (Transcrição X — trecho "...")
   - Outros: (Arquivo X — seção Y)

e) Detectar conflitos entre fontes
```

**Regra:** NÃO omitir detalhes relevantes. NÃO inventar informações.

### 3. Consolidar Informações

```
a) Agrupar bullets por seção do TAP template
   (usar .agents/prompts/tap-template.md como referência)

b) Para cada seção do TAP:
   - Se info suficiente → Marcar como COMPLETA
   - Se info parcial → Preencher o que tem, marcar gaps como [NÃO DEFINIDO]
   - Se sem info → Marcar seção inteira como [NÃO DEFINIDO]

c) Resolver conflitos:
   - Se fontes concordam → Usar informação diretamente
   - Se fontes conflitam → Registrar conflito e propor resolução
   - Marcar: "Conflito: Fonte A diz X, Fonte B diz Y. Precisa confirmação."

d) Listar perguntas pendentes para stakeholders
```

### 4. Gerar TAP

```
a) Usar template de .agents/prompts/tap-template.md como estrutura
b) Preencher TODAS as seções com informações extraídas
c) Para info ausente: usar [NÃO DEFINIDO — (motivo)]
d) Para suposições: usar [PREMISSA — (justificativa)]
e) Gerar diagramas Mermaid para arquitetura (se info suficiente)
f) Gerar Mapa de Extração (Apêndice B) automaticamente:
   - Para cada placeholder no template, extrair valor das seções
   - Se valor não disponível: marcar como [NÃO DEFINIDO]
```

### 5. Salvar e Reportar

```
a) Determinar PROJECT_SLUG a partir dos materiais
   (se não encontrado, usar "projeto" como fallback)

b) Salvar em: documents/archive/TAP_{PROJECT_SLUG}.md

c) Reportar ao usuário:
   ## Relatório de Geração do TAP

   **Seções completas:** [lista]
   **Seções com gaps:** [lista + o que falta]
   **Perguntas pendentes:** [lista para stakeholders]
   **Conflitos detectados:** [lista, se houver]

   ### Próximos Passos Sugeridos
   1. Responder perguntas pendentes (se houver)
   2. Revisar seções com [PREMISSA]
   3. Executar kickoff: usar .agents/prompts/kickoff-prompt.md
   4. Após kickoff: validate-kickoff
```

## Regras de Qualidade

### Rastreabilidade Radical

Toda conclusão deve estar ligada a uma evidência:
- Timestamp, página, trecho ou referência do anexo
- Se a conclusão é uma inferência, marcar como `[INFERÊNCIA]` com a evidência base

### Separação Clara

Nunca misturar categorias:
- `[FATO]` — está no material, ponto
- `[PREMISSA]` — assumido por falta de contexto, explicitamente marcado
- `[INFERÊNCIA]` — deduzido a partir de fatos, raciocínio explícito
- `[RECOMENDAÇÃO]` — sugestão do agente, com justificativa

### Não Inventar

- Se algo não está nos materiais: `[NÃO DEFINIDO]`
- Se falta contexto: assumir e marcar como `[PREMISSA]`
- Nunca inventar dados, métricas, nomes ou decisões

### Estilo

- Português executivo, direto, sem fluff
- Separar claramente fatos de opiniões
- Tabelas para dados estruturados
- Bullets para listas
- Diagramas Mermaid para fluxos (paleta: laranja em acento, neutros claros em preenchimentos)

## Integração com Outras Skills

| Skill | Relação |
|-------|---------|
| `kickoff-prompt` (prompt) | TAP alimenta o kickoff; Mapa de Extração guia preenchimento direto |
| `validate-kickoff` | Após kickoff, valida que placeholders do Mapa foram preenchidos |
| `pre-commit-check` | TAP define `TEST_COMMAND` etc. no Apêndice A |
| `agent-team` | TAP define `SRC_DIR`, `TEST_DIR` usados nos spawn prompts |
| `fresh-context` | TAP pode servir como input para CONTEXT.md inicial |

## Exemplo de Uso

```
User: generate-tap

Claude:
Encontrei 3 materiais em documents/archive/:
1. transcricao_discovery.txt (TXT, 45KB)
2. spec_tecnica_v2.pdf (PDF, 12 páginas)
3. diagrama_arquitetura.png (Imagem)

Extraindo notas de cada material...

[... processo de extração ...]

## Relatório de Geração do TAP

**Arquivo gerado:** documents/archive/TAP_monitor-fundos.md

**Seções completas:** 0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 17, Apêndice A
**Seções com gaps:**
- 10. Plano de Fases → Timeline não definido nos materiais
- 11. Governança → Estratégia de logging não discutida
- 14. Requisitos → Apenas RFs parciais

**Perguntas pendentes:**
1. Qual a frequência de execução do coletor? (Seção 7)
2. Threshold de alerta é por fundo ou por classe? (Seção 6)
3. Timeline estimado para PoV? (Seção 10)

**Conflitos detectados:**
- Transcrição menciona "relatório diário", spec diz "relatório semanal"
  → Precisa confirmação do stakeholder

### Próximos Passos
1. Responder 3 perguntas pendentes
2. Revisar 2 premissas na seção 8
3. Executar kickoff com o TAP gerado
```

---

**Versão:** 1.0.0
**Última atualização:** Template
