# Guia de Deploy - ObraPhoto AI

## Deploy no Render.com

### Passo 1: Conectar ao GitHub
1. Faça push do código para um repositório no GitHub
2. Acesse [render.com](https://render.com) e crie uma conta
3. Clique em "New" → "Static Site"
4. Conecte seu repositório GitHub

### Passo 2: Configurações do Build
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

### Passo 3: Variáveis de Ambiente
Configure as seguintes variáveis de ambiente no Render:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon key) do Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |

### Passo 4: Deploy
Clique em "Create Static Site" e aguarde o deploy completar.

---

## Deploy Manual (Qualquer Hosting)

### Build
```bash
npm install
npm run build
```

Os arquivos estáticos serão gerados na pasta `dist/`.

### Hosting
Faça upload da pasta `dist/` para qualquer serviço de hosting estático:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Firebase Hosting
- GitHub Pages

---

## Supabase Edge Functions

As Edge Functions são gerenciadas pelo Lovable Cloud e não precisam de deploy manual.

### Funções Disponíveis:
- `analyze-image` - Análise de imagens com IA

---

## Variáveis de Ambiente Obrigatórias

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key
VITE_SUPABASE_PROJECT_ID=seu-project-id
```

⚠️ **Importante:** Nunca exponha chaves secretas no código ou em repositórios públicos!
