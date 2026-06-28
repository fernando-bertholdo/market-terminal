---
trigger: always_on
---

# Security Best Practice

## Metadata

- **Versão:** 1.0.0
- **Status:** Template (Path-targeted)
- **Última atualização:** Template
- **Responsável:** Fernando Bertholdo
- **Paths:** src/**/*, *.py, .env*

---

## Escopo

Esta regra contém exemplos em **Python** (ex.: `pydantic-settings`) porque é path-targeted para `*.py`.  
Os princípios de segurança (não commitar secrets, não logar dados sensíveis, etc.) se aplicam a **qualquer stack**.  
Se o projeto não for Python, adapte/crie uma versão equivalente desta regra para o stack escolhido e ajuste `Paths`.

---

## Regra de Ouro

**"NUNCA commitar dados sensíveis no repositório."**

Esta regra é **CRÍTICA** e **NÃO NEGOCIÁVEL**:
- **NUNCA** hardcodear credentials (senhas, tokens, API keys)
- **NUNCA** commitar arquivos .env
- **NUNCA** expor detalhes internos em mensagens de erro
- **NUNCA** logar informações sensíveis (senhas, PII)

---

## Referências

- [code-quality-standards.md](code-quality-standards.md) - pydantic-settings para secrets
- [Projeto.md](../../documents/core/Projeto.md) - Arquitetura e fluxos de dados
- [.gitignore](../../.gitignore) - Arquivos que NUNCA devem ser commitados

---

## 1. Secrets Management

### Correto: pydantic-settings + .env

```python
# settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Configurações via environment variables."""

    # Secrets via env vars
    API_USERNAME: str
    API_PASSWORD: str
    EMAIL_PASSWORD: str

    # Defaults para não-sensíveis
    API_URL: str = "https://api.exemplo.com"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()

# Uso
from settings import settings
print(f"Conectando ao {settings.API_URL}")  # OK - não sensível
# NUNCA: print(f"Senha: {settings.API_PASSWORD}")  # Expõe secret
```

### Incorreto: Hardcoded Credentials

```python
# NUNCA FAZER ISSO
API_USERNAME = "usuario_api"
API_PASSWORD = "senha123"  # Hardcoded!

# NUNCA FAZER ISSO
EMAIL_CONFIG = {
    "host": "smtp.gmail.com",
    "user": "app@exemplo.com",
    "password": "senha_email_aqui"  # Hardcoded!
}
```

### Arquivo .env (NUNCA COMMITAR!)

```bash
# .env - ESTE ARQUIVO DEVE ESTAR NO .gitignore

# API (SENSÍVEL)
API_USERNAME=usuario_real
API_PASSWORD=senha_real_secreta_aqui

# E-mail (SENSÍVEL)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=app@exemplo.com
EMAIL_PASSWORD=senha_email_real_aqui

# Paths (NÃO SENSÍVEL)
DATA_PATH=./data
LOGS_PATH=./logs

# Debug (NÃO SENSÍVEL)
DEBUG=false
```

### Arquivo .env.example (COMMITAR SEM VALORES REAIS)

```bash
# .env.example - Template SEM valores reais (pode commitar)

# API
API_USERNAME=seu_usuario
API_PASSWORD=sua_senha
API_URL=https://api.exemplo.com

# E-mail (SMTP)
EMAIL_HOST=smtp.exemplo.com
EMAIL_PORT=587
EMAIL_USER=seu_email@exemplo.com
EMAIL_PASSWORD=sua_senha_email

# Paths
DATA_PATH=./data
LOGS_PATH=./logs

# Debug
DEBUG=false
MAX_RETRIES=3
```

---

## 2. .gitignore - Arquivos Sensíveis

**OBRIGATÓRIO:** Incluir no `.gitignore`:

```gitignore
# Secrets (NUNCA COMMITAR)
.env
.env.local
.env.*.local
credentials.json
token.json
*.key
*.pem

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
ENV/

# Dados (potencialmente sensíveis)
data/
*.xlsx
*.xls
*.csv
*.pdf

# Logs (podem conter info sensível)
logs/
*.log

# Coverage e testes
.coverage
htmlcov/
.pytest_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo
.DS_Store
```

---

## 3. Validação de Inputs

**Regra:** Sempre validar e sanitizar inputs de usuários ou externos.

### Correto: Validação Rigorosa

```python
from typing import Optional
from datetime import date, datetime
import re

def processar_item(
    item_id: str,
    data_referencia: date
) -> Optional[Dict[str, float]]:
    """
    Processa item com validação rigorosa.

    Args:
        item_id: ID do item (formato: ITEM_XXX)
        data_referencia: Data de referência

    Returns:
        Resultados calculados ou None se validação falhar

    Raises:
        ValueError: Se inputs inválidos
    """
    # Validar item_id (formato esperado)
    if not item_id or not isinstance(item_id, str):
        raise ValueError("item_id deve ser string não-vazia")

    if not re.match(r'^ITEM_\d{3}$', item_id):
        raise ValueError(
            f"item_id inválido: '{item_id}'. "
            f"Formato esperado: ITEM_XXX (ex: ITEM_001)"
        )

    # Validar data (não pode ser futura)
    if not isinstance(data_referencia, date):
        raise TypeError("data_referencia deve ser datetime.date")

    if data_referencia > date.today():
        raise ValueError(
            f"Data inválida: {data_referencia} está no futuro"
        )

    # Processar com inputs validados
    # ...
```

### Incorreto: Sem Validação

```python
def processar_item(item_id, data_referencia):
    # Sem validação - aceita qualquer input
    dados = buscar_dados(item_id, data_referencia)
    return calcular(dados)
```

---

## 4. Error Handling Seguro

**Regra:** Nunca expor detalhes internos em mensagens de erro para usuários.

### Correto: Mensagens Genéricas para Usuários

```python
import logging

logger = logging.getLogger(__name__)

def buscar_dados(item_id: str, data: date) -> Optional[Dict]:
    """Busca dados da API."""
    try:
        url = f"{settings.API_URL}/items/{item_id}/{data}"

        # Log detalhado INTERNO (não para usuário)
        logger.debug(
            f"Buscando dados: url={url}, timeout={settings.API_TIMEOUT_SECONDS}"
        )

        response = requests.get(
            url,
            auth=(settings.API_USERNAME, settings.API_PASSWORD),
            timeout=settings.API_TIMEOUT_SECONDS
        )
        response.raise_for_status()

        return response.json()

    except requests.exceptions.HTTPError as e:
        # Log detalhado INTERNO
        logger.error(
            f"Erro HTTP: status={e.response.status_code}, item={item_id}",
            exc_info=True
        )

        # Mensagem genérica para USUÁRIO (não expõe detalhes)
        if e.response.status_code == 401:
            raise ValueError("Credenciais inválidas") from e
        elif e.response.status_code == 404:
            raise ValueError(f"Item não encontrado: {item_id}") from e
        else:
            raise ValueError("Erro ao acessar API") from e

    except requests.exceptions.Timeout:
        logger.error(f"Timeout: item={item_id}")
        raise ValueError("API está demorando para responder")

    except requests.exceptions.ConnectionError:
        logger.error(f"Erro de conexão: item={item_id}")
        raise ValueError("Não foi possível conectar à API")
```

### Incorreto: Expondo Detalhes Internos

```python
def buscar_dados(item_id, data):
    try:
        response = requests.get(
            url,
            auth=("usuario", "senha123"),  # Hardcoded!
            timeout=30
        )
        return response.json()
    except Exception as e:
        # Expõe detalhes internos para usuário
        print(f"Erro: {e}")  # Pode incluir URL, credenciais, stack trace!
        raise
```

---

## 5. Logging Seguro

**Regra:** Nunca logar informações sensíveis (senhas, tokens, PII).

### Correto: Mascarar Dados Sensíveis

```python
import logging

logger = logging.getLogger(__name__)

def logar_configuracao():
    """Loga configuração do sistema (mascarando secrets)."""
    logger.info("Configuração do sistema:")
    logger.info(f"  API URL: {settings.API_URL}")
    logger.info(f"  API Username: {settings.API_USERNAME}")
    logger.info(f"  API Password: {'*' * 8}")  # Mascarado
    logger.info(f"  E-mail Host: {settings.EMAIL_HOST}")
    logger.info(f"  E-mail Password: {'*' * 8}")  # Mascarado


def processar_item(item: Dict[str, Any]):
    """Processa item (sem logar PII)."""
    # Log de metadados (não sensíveis)
    logger.info(f"Processando item: id={item['id']}")

    # NUNCA logar isso:
    # logger.info(f"Dados completos: {item}")  # Pode conter PII!


def logar_requisicao_http(url: str, headers: Dict[str, str]):
    """Loga requisição HTTP (mascarando autenticação)."""
    # Mascarar header Authorization
    headers_masked = headers.copy()
    if "Authorization" in headers_masked:
        headers_masked["Authorization"] = "Bearer ***"

    logger.debug(f"HTTP Request: url={url}, headers={headers_masked}")
```

### Incorreto: Logar Dados Sensíveis

```python
def logar_configuracao():
    # Expõe senha no log!
    logger.info(f"API Password: {settings.API_PASSWORD}")


def processar_item(item):
    # Log PII (Personal Identifiable Information)
    logger.info(f"Processando: {item}")  # Pode conter CPF, nomes, etc!
```

---

## 6. Dependências Reprodutíveis (Lockfile / Constraints)

**Regra:** installs em ambientes críticos devem ser **reprodutíveis e auditáveis**.

Diretrizes (stack-aware):
- Use lockfile/constraints do stack (ex.: `uv.lock`/constraints para Python, `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock` para JS, `go.sum` para Go, `Cargo.lock` para Rust binaries).
- Evite “floating deps” em produção (ex.: dependências sem versão e sem lockfile).
- Atualize dependências de forma incremental e sempre com testes.

### Atualização Segura de Dependências (exemplo)

```bash
# 1) Listar desatualizadas (ex.: Python)
pip list --outdated

# 2) Atualizar incrementalmente (substitua pelo comando do stack)
npm update

# 3) Rodar testes (stack)
npm run type-check

# 4) Commitar se testes passarem
git add (manifesto/lockfile)
git commit -m "chore(deps): atualiza dependências"
```

---

## 7. Checklist de Segurança (DoD)

**Antes de cada commit, validar:**

### Secrets
- [ ] **Nenhum secret hardcoded** no código
- [ ] **Todas credenciais via environment variables** (pydantic-settings)
- [ ] **.env no .gitignore** (verificar)
- [ ] **.env.example documentado** (sem valores reais)
- [ ] **Arquivos temporários sempre deletados** (credenciais temporárias)

### Error Handling
- [ ] **Error handling não expõe credenciais** (validar mensagens de erro)
- [ ] **Logs não contêm senhas ou tokens** (validar logs)
- [ ] **Stack traces não expostos para usuários** (apenas logs internos)

### Validação
- [ ] **Inputs validados** (tipo, formato, range)
- [ ] **Queries parametrizadas** (se usar SQL)
- [ ] **Sanitização de inputs** onde aplicável

### Dependências
- [ ] **Dependências reprodutíveis** (lockfile/constraints/manifesto conforme stack)
- [ ] **Nenhuma dependência com vulnerabilidades conhecidas** (usar tooling do stack; ex.: `pip-audit`, `npm audit`, `osv-scanner`)

### Auditoria
- [ ] **Pre-commit hook instalado** (validação automática)
- [ ] **Code review focado em segurança** (reviewer valida checklist)

---

## Ferramentas de Segurança

### safety - Verificar Vulnerabilidades em Dependências

```bash
# Instalar
pip install safety

# Verificar vulnerabilidades
safety check

# Verificar requirements.txt
safety check -r requirements.txt
```

### bandit - Análise Estática de Segurança

```bash
# Instalar
pip install bandit

# Analisar projeto
bandit -r src/
```

### Pre-commit Hook para Segurança

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ['-ll', '-i', '-r', 'src/']

  - repo: local
    hooks:
      - id: check-secrets
        name: Check for secrets
        entry: ./scripts/check_secrets.sh
        language: script
        pass_filenames: false
```

---

## Red Flags (Sinais de Alerta)

### Crítico - Ação Imediata

- **Secret commitado no git:** Rotacionar credencial IMEDIATAMENTE
- **Senha exposta em logs:** Limpar logs, rotacionar senha
- **API key vazada:** Revocar e gerar nova

**Ação de Resposta:**
1. Revogar/rotacionar credencial imediatamente
2. Limpar histórico do git se necessário (git-filter-repo)
3. Auditar onde a credencial foi usada
4. Notificar time de segurança
5. Implementar controle para evitar recorrência

### Alto Risco - Corrigir Urgentemente

- **Dependência com vulnerabilidade crítica:** Atualizar ASAP
- **Inputs não validados:** Implementar validação
- **Errors expondo detalhes internos:** Generalizar mensagens

---

## Quando Atualizar Esta Regra

Atualize esta regra quando:

- Nova vulnerabilidade é identificada (adicionar ao checklist)
- Novas ferramentas de segurança são adotadas (ex: Snyk, Dependabot)
- Padrões de segurança evoluem (ex: OWASP Top 10 atualizado)
- Incidente de segurança ocorre (documentar lição aprendida)

---

**Última atualização:** Template
**Versão:** 1.0.0
