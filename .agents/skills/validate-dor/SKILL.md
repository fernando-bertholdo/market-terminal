---
name: validate-dor
description: Validar Definition of Ready de uma initiative (milestone ou detour) antes de iniciar trabalho. Use OBRIGATORIAMENTE antes de iniciar qualquer initiative, quando planejar trabalho, ou ao completar milestone anterior para validar próximo. Este é um gate bloqueador - nenhum trabalho deve começar sem DoR 100% completo.
---

# Validate Definition of Ready (DoR)

Valida que TODOS os pré-requisitos de uma initiative (milestone ou detour) estão completos ANTES de iniciar trabalho.

## Regra de Ouro

> **"Se DoR não está 100% completo, NÃO comece."**

Este é um **gate bloqueador** - nenhum trabalho deve ser iniciado sem DoR validado.

## Quando Usar

- ✅ **OBRIGATÓRIO** antes de iniciar qualquer milestone ou detour
- ✅ Quando planejar trabalho de uma initiative
- ✅ Ao completar milestone anterior (validar próximo antes de transição)

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

4. Ler fontes de DoR por tipo:
   - MILESTONE: Roadmap.md § DoR do milestone
   - DETOUR: Roadmap.md § Desvios — Nome + CONTEXT.md (Trigger + Milestones relacionados)

5. Extrair checklist de pré-requisitos por tipo:
   - COMUNS: diretório existe, CONTEXT.md tem escopo, decisões documentadas
   - MILESTONE: milestone anterior completo
   - DETOUR: trigger documentado, milestones afetados identificados

6. Validar cada item:
   a. Se arquivo/config: Verificar existência
   b. Se decisão: Verificar se está documentada
   c. Se milestone anterior: Verificar se DoD foi validado
   d. Se conhecimento: Alerta (responsabilidade do dev)

7. Gerar relatório usando template `templates/dor-report.md`:
   - ✅ Itens completos
   - ❌ Itens pendentes (BLOQUEADORES)
   - ⚠️  Itens que precisam validação manual
   - Salvar em:
     Milestone: .planning/milestones/MX.X-nome/verification/MX.X-dor-report.md
     Detour: .planning/detours/<nome>/verification/<nome>-dor-report.md

8. Resultado: PASS (100%) ou FAIL (<100%)

9. Se FAIL: Listar ações necessárias
```

## Tipos de Pré-requisitos

### 1. Milestone Anterior Completo

**Validação:**
- Verificar TODO.md (milestone marcado como completo)
- Verificar DoD foi validado (data de validação)

**Exemplo:**
```
✅ M1.1 completo (DoD 100%)
   - Validado: M1.1 marcado como completo em TODO.md
   - DoD M1.1 validado em 20/Jan/2026
```

### 2. Arquivos/Configurações Existem

**Validação:**
- Verificar filesystem (arquivo existe?)
- Verificar conteúdo (se aplicável)

**Exemplo:**
```
✅ Credenciais BTG validadas
   - Validado: .env existe com BTG_USERNAME, BTG_PASSWORD
   - Teste de conectividade: Acesso ao portal OK

❌ Dicionário de DC não existe
   - BLOQUEADOR: data/dicionario_dc.json não encontrado
   - Ação: Criar dicionário baseado em nomenclaturas BTG
```

### 3. Decisões Técnicas Documentadas

**Validação:**
- Buscar em Projeto.md (changelog, seções específicas)
- Verificar análise comparativa documentada

**Exemplo:**
```
✅ Decisão sobre fonte de dados tomada
   - Validado: Projeto.md v1.1.0 - Decisão: XML ISO20022
   - Changelog: "Descoberta de XML ISO20022"
   - Análise comparativa documentada
```

### 4. Conhecimento/Entendimento Adquirido

**Validação:**
- ⚠️  Requer validação manual honesta
- Não verificável automaticamente

**Exemplo:**
```
⚠️  Entendimento do fluxo de navegação no portal
   - ATENÇÃO: Validação manual necessária
   - Você entende o fluxo de login → navegação → download?
   - Documentado em: Projeto.md seção "Fluxo de Coleta"
```

## Exemplo de Validação

### Cenário: DoR Completo (✅ PASS)

```
✅ Definition of Ready - M1.2: Coletor Básico
================================================

**Milestone:** M1.2 - Coletor Básico (Fase 1 - PoV)
**Status:** ✅ READY TO START

---

## Checklist de Pré-requisitos

✅ M1.1 completo (DoD 100%)
   - Validado: M1.1 marcado como completo em TODO.md
   - DoD M1.1 validado em 20/Jan/2026

✅ Credenciais BTG validadas
   - Validado: .env existe com BTG_USERNAME, BTG_PASSWORD
   - Teste de conectividade: Portal BTG acessível

✅ Dicionário de fundos definido (1-2 piloto)
   - Validado: documents/core/Projeto.md seção "Fundos Piloto"
   - 2 fundos identificados: Fundo A, Fundo B

✅ Decisão sobre fonte de dados tomada
   - Validado: Projeto.md v1.1.0 - XML ISO20022 escolhido
   - Análise comparativa documentada (XML vs PDF vs Excel)

✅ Entendimento do fluxo de navegação no portal
   - Validado: Documentado em Projeto.md seção "Fluxo de Coleta"

✅ Projeto.md atualizado com decisão
   - Validado: Projeto.md v1.1.0 (changelog confirma)

---

## Resultado: ✅ READY TO START

**Todos os 6 pré-requisitos completos (100%)**

Próximas Ações:
1. Atualizar TODO.md: Marcar M1.2 como "em progresso"
2. Iniciar implementação seguindo DoD como checklist
3. Consultar pre-commit-check e validate-testing durante desenvolvimento
4. Validar DoD ao completar: validate-dod M1.2
```

### Cenário: DoR Incompleto (❌ FAIL)

```
❌ Definition of Ready - M1.3: Normalização
==============================================

**Milestone:** M1.3 - Normalização e Classificação
**Status:** ❌ NOT READY (4/6 = 67%)

---

## Checklist de Pré-requisitos

✅ M1.2 completo (DoD 100%)
   - Validado: M1.2 marcado como completo

❌ Dicionário de DC (direitos creditórios) criado
   - BLOQUEADOR: data/dicionario_dc.json não encontrado
   - Ação: Criar dicionário baseado em nomenclaturas BTG

✅ Dados brutos de 1-2 fundos disponíveis
   - Validado: data/raw/fundo_A.xml, fundo_B.xml existem

❌ Nomenclaturas BTG mapeadas
   - BLOQUEADOR: Mapeamento não documentado
   - Ação: Documentar em Projeto.md seção "Dicionário de Ativos"

✅ Regras de classificação definidas
   - Validado: Projeto.md seção "Regras de Negócio Críticas"

⚠️  Casos de borda identificados (fundos pendentes/encerrados)
   - ATENÇÃO: Nenhuma decisão documentada
   - Ação recomendada: Documentar estratégia no Projeto.md

---

## Resultado: ❌ NOT READY

**2/6 pré-requisitos pendentes (BLOQUEADORES)**
**1/6 pré-requisito com warning (não-bloqueante)**

NÃO inicie trabalho no M1.3 até resolver bloqueadores!

---

## Ações Necessárias (Priorizadas)

### CRÍTICO (Bloqueadores)

1. **Criar dicionário de DC**
   ```bash
   # Criar data/dicionario_dc.json
   # Formato:
   {
     "acao_judicial": "DC",
     "direitos_creditorios": "DC",
     "caixa": "Non-DC",
     "titulo_publico": "Non-DC"
   }
   ```
   Referência: TAP seção 4.3 "Classificação de Ativos"

2. **Documentar mapeamento de nomenclaturas**
   - Atualizar Projeto.md seção "Dicionário de Ativos"
   - Incluir: nomenclaturas BTG, classificação, ambiguidades
   - Atualizar changelog (v1.2.0)

### RECOMENDADO (Não-bloqueante)

3. **Documentar estratégia para casos de borda**
   - Fundos pendentes: Fora do monitoramento até ativos
   - Fundos encerrados: Fora do monitoramento recorrente
   - Adicionar seção "Tratamento de Fundos Especiais"

---

## Próximas Ações (Após Resolver)

```bash
# 1. Criar arquivos necessários
# [Criação manual]

# 2. Documentar decisões
# [Atualizar Projeto.md]

# 3. Re-validar DoR
validate-dor M1.3

# 4. Se PASS, iniciar trabalho
# [Implementar M1.3]
```
```

## Validações Automáticas vs Manuais

### Automáticas (✅ ou ❌)

- **Arquivos existem:** Verifica filesystem
- **Milestone anterior completo:** Checa TODO.md e Roadmap.md
- **Decisões documentadas:** Busca em Projeto.md
- **Configurações presentes:** Verifica .env, settings

### Manuais (⚠️  Atenção)

- **Conhecimento adquirido:** Não verificável automaticamente
- **Qualidade de decisão:** Decisão documentada, mas é boa?
- **Credenciais válidas:** .env existe, mas funciona?

**Responsabilidade do Desenvolvedor:**
- Itens ⚠️  requerem validação manual honesta
- Não "pular" itens difíceis de validar

## Checklist Genérico de DoR

### Dependências
- [ ] Milestone(s) anterior(es) completo(s) (DoD 100%)
- [ ] Bloqueadores externos resolvidos

### Conhecimento
- [ ] Requisitos claros e completos
- [ ] Entendimento técnico adequado
- [ ] Conhecimento de domínio necessário

### Recursos
- [ ] Ferramentas disponíveis
- [ ] Credenciais/acessos configurados
- [ ] Ambiente preparado

### Decisões
- [ ] Decisões técnicas tomadas e documentadas
- [ ] Trade-offs analisados
- [ ] Abordagem definida

### Dados
- [ ] Dados de entrada disponíveis
- [ ] Dicionários/mapeamentos definidos
- [ ] Casos de borda identificados

## Parâmetros

### Initiative ID (obrigatório)

```bash
# Validar DoR de milestone
validate-dor M1.2
validate-dor M2.4

# Validar DoR de detour (ambas formas aceitas)
validate-dor fee-intelligence
validate-dor D-fee-intelligence
```

## Detecção de Tipo

```
Input: initiative-id

Se formato MX.X ou MX.X.X → MILESTONE
  Path: .planning/milestones/MX.X-*/

Se outro formato → DETOUR (strip D- se presente)
  Path: .planning/detours/<nome>/
```

## Pré-requisitos por Tipo

| Pré-requisito | Milestone | Detour |
|---------------|-----------|--------|
| Diretório existe | Sim | Sim |
| CONTEXT.md com escopo | Sim | Sim |
| Decisões documentadas | Sim | Sim |
| Milestone anterior completo | **Sim** | Não |
| Trigger documentado | Não | **Sim** |
| Milestones afetados identificados | Não | **Sim** |

## Referências

- `validate-dod` - Skill complementar para validar DoD
- `init-milestone` - Criar infraestrutura de milestone (se ausente)
- `init-detour` - Criar infraestrutura de detour (se ausente)
- `documents/core/Roadmap.md` - DoR por milestone + seção Desvios para detours
- `documents/core/TODO.md` - Tracking de progresso
- `documents/core/Projeto.md` - Decisões e requisitos
- `.planning/milestones/MX.X-nome/` - Diretório do milestone
- `.planning/detours/<nome>/` - Diretório do detour
- `.planning/*/verification/` - DoR/DoD reports co-localizados

## Comandos Relacionados

- `validate-dod [initiative-id]` - Validar DoD (após completar)
- `pre-commit-check` - Checklist pré-commit

## Uso Típico

**Antes de iniciar milestone:**
```bash
validate-dor M1.2
# Se PASS: Iniciar trabalho
# Se FAIL: Resolver bloqueadores primeiro
```

**Antes de iniciar detour:**
```bash
validate-dor fee-intelligence
# Se PASS: Iniciar trabalho
# Se FAIL: Resolver bloqueadores primeiro
```

**Transição entre milestones:**
```bash
validate-dod M1.2  # Validar conclusão
validate-dor M1.3  # Validar próximo ready
```
