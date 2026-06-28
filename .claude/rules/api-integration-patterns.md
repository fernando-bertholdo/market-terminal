---
paths:
  - "src/collectors/**/*"
  - "src/alerting/**/*"
  - "src/integrations/**/*"
description: Padrões para integração com APIs externas
---

# API Integration Patterns

Boas práticas para integração com APIs externas e serviços.

## Integrações Típicas

1. **APIs REST** - Requisições HTTP, autenticação
2. **Web Scraping** - Automação de portais web
3. **Email/SMTP** - Envio de alertas e notificações
4. **AI APIs** - OpenAI, Anthropic, etc.

## Regras Gerais

### 1. Credenciais e Secrets

**Regra de Ouro:** NUNCA hardcoded, SEMPRE via environment variables

```python
# ✅ CORRETO
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_KEY: str
    API_SECRET: str

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()

# ❌ ERRADO
API_KEY = "sk-123..."  # NUNCA!
```

### 2. Error Handling

**SEMPRE tratar erros de rede/API:**

```python
def call_external_api(endpoint: str, data: dict) -> Optional[dict]:
    """Chamada de API com tratamento de erros."""
    max_retries = 3

    for attempt in range(1, max_retries + 1):
        try:
            response = httpx.post(endpoint, json=data, timeout=30)
            response.raise_for_status()
            return response.json()

        except httpx.ConnectError as e:
            logger.warning(f"Tentativa {attempt}/{max_retries} falhou: {e}")
            if attempt == max_retries:
                logger.error("Chamada falhou após todas tentativas")
                return None
            time.sleep(2 ** attempt)  # Exponential backoff

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error("Credenciais inválidas")
                return None
            raise
```

### 3. Rate Limiting

```python
from time import sleep
from functools import wraps

def rate_limit(calls_per_minute: int):
    """Decorator para rate limiting."""
    min_interval = 60.0 / calls_per_minute

    def decorator(func):
        last_called = [0.0]

        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed

            if wait_time > 0:
                sleep(wait_time)

            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result

        return wrapper
    return decorator

@rate_limit(calls_per_minute=10)
def fetch_data(resource_id: str) -> bytes:
    """Busca dados com rate limiting."""
    pass
```

### 4. Timeouts e Cleanup

```python
import httpx
from contextlib import contextmanager

# SEMPRE definir timeouts
client = httpx.Client(timeout=30.0)

# SEMPRE fazer cleanup
@contextmanager
def api_session(credentials: dict):
    """Context manager com cleanup automático."""
    session = None
    try:
        session = authenticate(credentials)
        yield session
    finally:
        if session:
            session.close()
            logger.info("Sessão encerrada")
```

## Checklist de Validação

- [ ] Credenciais via .env (nenhuma hardcoded)
- [ ] Error handling robusto
- [ ] Logging completo (sem expor secrets)
- [ ] Rate limiting implementado
- [ ] Timeouts definidos
- [ ] Cleanup de recursos
- [ ] Tests unitários (mock de APIs)

---

**Versão:** 1.0.0
**Última atualização:** 2026-06-28
