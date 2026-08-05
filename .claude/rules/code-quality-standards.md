---
paths:
  - "src/**/*"
  - "**/*.py"
---

# Code Quality Standards (Template)

## Metadata

- **Versão:** 1.1.0
- **Status:** ✅ Template (Path-targeted)
- **Última atualização:** 01/Fevereiro/2026
- **Responsável:** Fernando Bertholdo
- **Paths:** src/**/*, *.py
- **Config preferida de ferramentas:** `pyproject.toml` (ou `setup.cfg`/`mypy.ini` se necessário)

---

## Escopo

Esta regra é focada em **Python** (porque é path-targeted para `*.py`).  
Se o projeto não for Python, substitua por uma regra equivalente do stack escolhido.

Para ativar o stack Python (tooling), use: `.codex/stacks/python/README.md`.

---

## Quando Aplicar Esta Regra

**SEMPRE**, em qualquer mudança em `src/**/*` e/ou `*.py`:
- Todo novo código escrito
- Refatorações
- Correções de bugs
- Code reviews
- Antes de commits (idealmente via `pre-commit`)

---

## Referências

- [Projeto.md](../../documents/core/Projeto.md) - Contexto e arquitetura
- [testing-requirements.md](testing-requirements.md) - Requisitos de testes
- [security-best-practices.md](security-best-practices.md) - Segurança
- [.claude/CLAUDE.md](../CLAUDE.md) - Regras always-on do projeto

---

## Padrões Obrigatórios

### 1) Formatação (PEP 8) e Imports

**Regra de ouro:** código formatado e imports organizados (sem discussões no review).

**Ferramentas (Python):**
```bash
ruff format src/ tests/
ruff check src/ tests/ --fix
```

**Padrão recomendado:**
- Linha máxima: **100 caracteres**
- Centralizar config em `pyproject.toml` (Ruff formata e ordena imports)

---

### 2) Type Hints (Tipagem Estática)

**Regra de ouro:** toda função/classe pública deve ter type hints. Tipar funções internas não-triviais.

**Validação (Python, recomendado):**
```bash
mypy src/
```

---

### 3) Docstrings e Comentários (Google Style)

**Regra de ouro:** tudo que for público deve ter docstring. Código interno complexo também.

**Docstrings devem:**
- Explicar intenção e contexto (o **porquê**)
- Documentar invariantes e edge cases
- Descrever `Args`, `Returns`, `Raises` quando aplicável

**Comentários devem:**
- Explicar decisões e trade-offs
- Evitar comentar o óbvio

---

### 3.1) Naming Conventions

- `snake_case` para variáveis e funções
- `PascalCase` para classes
- `UPPER_SNAKE_CASE` para constants
- Evitar abreviações obscuras

**Exemplo:**
```python
MAX_RETRIES = 3

class DataProcessor:
    def process_item(self, item_id: str) -> None:
        ...
```

---

### 3.2) Organização de Imports

**Ordem padrão:**
1) Standard library  
2) Third-party  
3) Local/project

```python
import json
from datetime import date

import requests

from src.config import Settings
```

---

### 4) Constants Nomeadas (Sem Magic Numbers)

**Regra de ouro:** valores literais relevantes devem ser constants nomeadas.

**Exceções aceitáveis (quando óbvias):**
- `0`, `1`, `-1` (índices/flags)
- `100` em conversões percentuais explícitas

---

### 5) Error Handling (Falhas Esperadas vs Inesperadas)

**Regra de ouro:** valide inputs e trate falhas esperadas explicitamente.

**Diretrizes:**
- Prefira exceptions específicas (`ValueError`, `TypeError`, etc.)
- Evite `except Exception` genérico (salvo em boundaries de processo)
- **Logue quando capturar e decidir seguir** (para não silenciar erros sem rastreabilidade)

---

### 6) Logging e Observabilidade (OBRIGATÓRIO)

**Regra de ouro:** logging é obrigatório desde o início. Debugging e operação dependem disso.

**Regras práticas:**
- Não use `print` (exceção: CLIs que imprimem output do comando).
- Todo módulo deve ter `logger = logging.getLogger(__name__)`.
- Configure logging **uma única vez** no entrypoint (CLI/scheduler).
- Use níveis (`DEBUG/INFO/WARNING/ERROR/CRITICAL`) para controlar volume.
- Preferir logs com contexto (`extra={...}`).

**O que logar (mínimo):**
- Início/fim de operações importantes (com duração)
- Contagens (ex.: itens processados)
- Resultado/estado (sucesso/falha)
- Chamadas externas: status code, timeout, tentativas, latência (sem payload sensível)

**O que NUNCA logar:**
- Tokens, senhas, cookies, headers sensíveis
- Payloads brutos que possam conter dados sensíveis (salvo modo explícito e sanitizado)

---

### 7) Secrets e Configuração (pydantic-settings)

**Regra de ouro:** secrets nunca devem estar no código nem em logs.

**Diretrizes:**
- Use `pydantic-settings` (`BaseSettings`) e `.env` (gitignored) para config local
- Mantenha `.env.example` sempre sanitizado (sem valores reais)
- Para debugging, logue apenas “presença” (`auth_configured=True/False`), nunca valores

---

## Estrutura de Arquivos (Sugestão)

Estrutura base (ajuste conforme o domínio, mantendo separação de responsabilidades):

```
src/
  cli.py                # entrypoint / composition root (se existir)
  config.py             # settings (.env)
  integrations/         # integrações / IO (APIs, scrapers, etc.)
  domain/               # regras de negócio / modelos
  services/             # orquestração de casos de uso
tests/
  unit/
  integration/
  fixtures/
```

---

## Ferramentas de Qualidade (Recomendado)

**Sugestão de setup (Python):**
```bash
cp .codex/stacks/python/pyproject.toml ./pyproject.toml
cp .codex/stacks/python/requirements-dev.txt ./requirements-dev.txt
cp .codex/stacks/python/.pre-commit-config.yaml ./.pre-commit-config.yaml
pip install -r requirements.txt -r requirements-dev.txt
pre-commit install
```

**Rodar localmente:**
```bash
pre-commit run -a
pytest -q
mypy src/
ruff check src/ tests/ --fix
ruff format src/ tests/
```

**Nota:** este template não instala tooling por padrão. Para Python, copie os arquivos de:
- `.codex/stacks/python/pyproject.toml`
- `.codex/stacks/python/requirements-dev.txt`
- `.codex/stacks/python/.pre-commit-config.yaml`

---

## Checklist de Code Review

- [ ] Código formatado (`ruff format`)
- [ ] Type hints em tudo que é público
- [ ] Docstrings (público) + comentários de “porquê” em pontos críticos
- [ ] Logging presente (pelo menos em boundaries e fluxos principais)
- [ ] Nenhum secret hardcoded ou em logs
- [ ] Testes cobrindo casos principais e edge cases

---

## Apêndice — Exemplos Agnósticos (✅/❌)

**Docstring mínima**
```python
# ✅
def validar_input(valor: str) -> bool:
    """Valida se o valor atende ao formato esperado."""
    return bool(valor)
```

```python
# ❌
def validar_input(valor):
    return bool(valor)
```

**Logging em boundary**
```python
# ✅
logger.info("Processamento iniciado.", extra={"items": len(items)})
```

```python
# ❌
print("Processamento iniciado")  # não usar print
```

**Tratamento de erro**
```python
# ✅
try:
    resultado = executar()
except TimeoutError:
    logger.error("Timeout na execução.", exc_info=True)
    raise
```

```python
# ❌
try:
    resultado = executar()
except Exception:
    pass
```

**Magic numbers**
```python
# ✅
MAX_RETRIES = 3
for _ in range(MAX_RETRIES):
    ...
```

```python
# ❌
for _ in range(3):
    ...
```

---

## Quando Atualizar Esta Regra

Atualize esta regra quando:
- Ferramentas de qualidade mudarem (ex.: adoção de ruff/bandit)
- Padrões internos evoluírem (ex.: política de logging/observabilidade)
- Versão do Python mudar e afetar toolchain
- Code review identificar gaps recorrentes

---

## Changelog

### v1.1.0 (01/Fevereiro/2026)

- Enfatiza logging como requisito obrigatório desde o início
- Reduz exemplos para evitar viés de domínio
- Adiciona seções de Changelog e comandos aplicáveis

### v1.0.0 (Template)

- Criação inicial do template.

---

## 🔧 Comandos Aplicáveis

**Antes de commit:**
- `pre-commit run -a`
- `pytest -q`

**Durante desenvolvimento:**
- `ruff format src/ tests/`
- `ruff check src/ tests/ --fix`
- `mypy src/`
