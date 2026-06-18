Sua tarefa é colocar no ar o pipeline de
notícias-ML e deixar o re-treino contínuo rodando — **somente deploy + config**.

## ⛔ REGRAS CRÍTICAS — LEIA, OBEDEÇA, NÃO IMPROVISE
1. **NUNCA rode `git` dentro de `C:\Users\User\Desktop\Terminal` nem em qualquer
   subpasta dele.** Esse repositório NÃO é versionado e deve continuar assim.
   Proibido: `git init`, `git add`, `git commit`, `git remote add`, `git push` ali.
2. **O ÚNICO lugar onde você usa `git` é a pasta temporária do Space**
   (`$env:TEMP\hf-news-nlp`), criada por `git clone` na Fase 2. Antes de QUALQUER
   comando `git`, rode `pwd` e confirme que está EXATAMENTE em `...\hf-news-nlp`.
   Se não estiver, PARE.
3. **Trabalhe um passo de cada vez.** Antes de cada AÇÃO EXTERNA (criar conta/Space,
   `git push`, `vercel env`, `vercel --prod`, `wrangler deploy`, gravar secrets),
   **PARE, me mostre o comando exato que vai rodar e a pasta atual, e espere eu
   responder "ok".** Não encadeie ações externas.
4. **Não crie projetos/serviços novos.** Vincule sempre aos EXISTENTES (o projeto da
   Vercel já existe; o worker `atlas-terminal-tick` já existe). Se algo sugerir
   criar novo, PARE e me pergunte.
5. **Não toque em `src/`** nem em nenhum código de modelo/contrato. Só infra, env e,
   no máximo, `deploy/cloudflare-worker/wrangler.toml`.
6. **Nunca suba segredos.** Nada de `DATABASE_URL`, tokens ou `.env` em arquivo
   commitado. Eles vão só como variáveis/secrets nos painéis.
7. **Pare e me chame** em qualquer login, 2FA, cobrança, erro, ou se a realidade
   divergir destas instruções. Na dúvida, PARE — não tente "consertar" sozinho.

## Contexto (leia antes de agir, não execute nada ainda)
- `C:\Users\User\Desktop\Terminal\docs\news-ml-deploy-brief.md`
- `C:\Users\User\Desktop\Terminal\docs\news-sentiment-ml-plan.md`
Confirme pra mim que leu e entendeu as 7 regras acima ANTES de começar a Fase 0.

---

## Fase 0 — baseline (sem ações externas, pode rodar)
```powershell
cd C:\Users\User\Desktop\Terminal
npm run type-check
npm run lint
```
Reporte o resultado. Não prossiga se não passarem limpos.

## Fase 1 — segredos (local, sem push)
1. Gere o token e me mostre o valor (guarde como `NEWS_NLP_TOKEN`):
   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
2. Pegue o `DATABASE_URL`: no dashboard da Vercel, projeto → Settings → Environment
   Variables → copie o valor de `DATABASE_URL`. NÃO escreva esse valor em arquivo
   nenhum. Apenas guarde para colar nos painéis.
3. **CHECKPOINT:** me diga que tem `NEWS_NLP_TOKEN` e `DATABASE_URL` em mãos e
   espere meu "ok" para a Fase 2.

## Fase 2 — serviço Python no Hugging Face Spaces
> Esta fase tem 3 ações externas. PARE e peça "ok" antes de CADA uma.

**Ação 2a (criar o Space):** em huggingface.co (logado), New Space → SDK **Docker**
→ hardware **CPU basic (free)** → **Public** → nome `news-nlp`. Me dê o `<user>` e a
URL pública (`https://<user>-news-nlp.hf.space`). **Não dê push ainda.**

**Preparar arquivos (local, SEM git, SEM push):**
```powershell
# clona o repo DO SPACE numa pasta temporária (este é o único repo git que você toca)
git clone https://huggingface.co/spaces/<user>/news-nlp $env:TEMP\hf-news-nlp
Copy-Item C:\Users\User\Desktop\Terminal\services\news-nlp\* $env:TEMP\hf-news-nlp\ -Recurse -Force
```
Crie `$env:TEMP\hf-news-nlp\README.md` com:
```
---
title: news-nlp
sdk: docker
app_port: 7860
pinned: false
---
News sentiment microservice (FinBERT + zero-shot NLI + ABSA + MT PT->EN).
```
**Confira antes de qualquer push:**
```powershell
cd $env:TEMP\hf-news-nlp
pwd                      # DEVE terminar em \hf-news-nlp. Se não, PARE.
Get-ChildItem            # confira: Dockerfile, app.py, pipeline.py, mapping.py, retrain.py, requirements.txt, README.md
Select-String -Path .\* -Pattern "postgres://|postgresql://|hf_[A-Za-z0-9]" -ErrorAction SilentlyContinue
# ^ se isso achar QUALQUER segredo, PARE e me avise. Não pode ter segredo aqui.
```
**CHECKPOINT 2b:** me mostre a saída de `pwd` e `Get-ChildItem` e o resultado do
Select-String. Só depois do meu "ok":

**Ação 2b (push do Space, só na pasta temp):**
```powershell
# autentique no HF (peça-me o token Write se precisar): 
huggingface-cli login
# confirme de novo a pasta:
pwd                      # tem que ser ...\hf-news-nlp
git add -A
git commit -m "deploy news-nlp"
git push
```

**Ação 2c (secrets do Space):** no Space → Settings → Variables and secrets, adicione
como **Secrets**: `DATABASE_URL`, `NEWS_NLP_TOKEN`, `NLI_THRESHOLD=0.65`,
(opcional) `WARMUP=true`. Me avise quando o build terminar.

**Verificar (sem push):**
```powershell
curl https://<user>-news-nlp.hf.space/health
curl -s https://<user>-news-nlp.hf.space/classify -H "content-type: application/json" `
  -H "authorization: Bearer <NEWS_NLP_TOKEN>" `
  -d '{\"items\":[{\"id\":\"a\",\"title\":\"Fed signals higher for longer\"}]}'
```
Espere `results[]`. Reporte e espere meu "ok" para a Fase 3.

## Fase 3 — Vercel (env vars + deploy do código atual)
> NÃO use `git` aqui. O deploy é via CLI da Vercel, que sobe a pasta local direto.
```powershell
npm i -g vercel
cd C:\Users\User\Desktop\Terminal
vercel login
vercel link     # VINCULE ao projeto EXISTENTE do terminal. NÃO crie projeto novo. Em dúvida, PARE.
```
**CHECKPOINT 3a:** me confirme qual projeto foi vinculado antes de seguir.

Adicione cada variável (ambiente **Production**), uma por vez:
```
NEWS_ML_ENABLED=true   NEWS_NLP_URL=https://<user>-news-nlp.hf.space
NEWS_NLP_TOKEN=<o gerado>   NEWS_NLP_TIMEOUT_MS=8000
NEWS_GRAPH_CALIBRATED=true   NEWS_HEAD_ENABLED=true   NEWS_FORWARD_ENABLED=true
```
```powershell
vercel env add NEWS_ML_ENABLED production   # repita para cada variável acima
```
**CHECKPOINT 3b (deploy):** me peça "ok" e então:
```powershell
vercel --prod
```

## Fase 4 — worker Cloudflare
```powershell
cd C:\Users\User\Desktop\Terminal\deploy\cloudflare-worker
```
1. Edite SÓ `wrangler.toml`, adicionando dentro de `[vars]`:
   ```
   NEWS_NLP_URL = "https://<user>-news-nlp.hf.space"
   RETRAIN_HOUR_UTC = "6"
   ```
   Não toque em `TERMINAL_URL`, `name`, nem em mais nada. (Isto NÃO é git — é só
   editar o arquivo local; o deploy é via wrangler.)
2. **CHECKPOINT 4 (deploy):** me mostre o `wrangler.toml` editado, peça "ok", então:
   ```powershell
   npm install
   npx wrangler login
   npx wrangler secret put NEWS_NLP_TOKEN    # cole o token
   npm run deploy                            # deve atualizar o worker EXISTENTE atlas-terminal-tick
   ```

## Fase 5 — verificação e relatório
```powershell
cd C:\Users\User\Desktop\Terminal
npm run type-check
npm run lint
```
Abra a URL de produção no navegador, faça login, e confira News/Quant com sinais.
(Opcional) `curl -X POST https://<user>-news-nlp.hf.space/retrain -H "authorization: Bearer <NEWS_NLP_TOKEN>"`
— no começo retorna `{"ok": false, "...too few labeled rows..."}`, o que é CORRETO.

**Relatório final:** me mande URL do Space, saída de `/health` e `/classify`,
projeto Vercel vinculado, confirmação de `vercel --prod` e `npm run deploy` do
worker, e qualquer divergência.

## Se algo der errado / você ficar em dúvida
PARE imediatamente, não tente reverter nem improvisar, e me descreva: o comando que
rodou, a pasta (`pwd`), e a saída/erro. Especialmente: se em qualquer momento você
se viu prestes a rodar `git` em `C:\Users\User\Desktop\Terminal`, ou a criar um
projeto/Space/worker novo, ou a commitar um segredo — PARE e me chame.
