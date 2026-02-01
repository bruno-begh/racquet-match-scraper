# 🎾 Racquet Match Scraper Service

Microserviço de web scraping para buscar raquetes nas lojas **ProSpin** e **Casa do Tenista** em tempo real.

## 📋 Visão Geral

Este microserviço foi desenvolvido para:
- Buscar raquetes específicas nas lojas brasileiras ProSpin e Casa do Tenista
- Extrair URLs de produtos, preços e disponibilidade
- Fornecer API REST para integração com aplicações frontend (Next.js + Supabase)
- Rodar em cloud (Railway) com Playwright para automação de browser

## 🏗️ Arquitetura

```
scraper-service/
├── src/
│   ├── index.ts                    # Express API server
│   ├── scrapers/
│   │   ├── prospin.ts              # ProSpin scraper
│   │   └── casadotenista.ts        # Casa do Tenista scraper
│   └── test-client.ts              # Cliente de teste
├── Dockerfile                      # Docker config para Railway
├── railway.json                    # Railway deploy config
├── package.json                    # Dependências
└── tsconfig.json                   # TypeScript config
```

## 🚀 Como Usar Localmente

### 1. Instalar Dependências

```bash
cd scraper-service
npm install
```

### 2. Configurar Ambiente

```bash
cp .env.example .env
```

Edite `.env` se necessário (padrão: `PORT=3001`).

### 3. Rodar em Desenvolvimento

```bash
npm run dev
```

O serviço estará disponível em `http://localhost:3001`.

### 4. Testar os Endpoints

Em outro terminal:

```bash
npm run test
```

Ou compile e teste manualmente:

```bash
npm run build
npm run test
```

## 📡 Endpoints da API

### `GET /health`

Health check do serviço.

**Response:**
```json
{
  "status": "ok",
  "service": "racquet-match-scraper",
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

### `POST /scrape/prospin`

Busca uma raquete na ProSpin.

**Request Body:**
```json
{
  "racquetName": "Wilson Ultra 100 V5"
}
```

**Response:**
```json
{
  "store": "ProSpin",
  "query": "Wilson Ultra 100 V5",
  "result": {
    "found": true,
    "storeName": "ProSpin",
    "url": "https://www.prospin.com.br/produto/wilson-ultra-100-v5",
    "price": "R$ 1.799,91",
    "available": true
  },
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

### `POST /scrape/casadotenista`

Busca uma raquete na Casa do Tenista.

**Request Body:**
```json
{
  "racquetName": "Wilson Ultra 100 V5"
}
```

**Response:** (mesmo formato do ProSpin)

### `POST /scrape/both`

Busca em ambas as lojas simultaneamente.

**Request Body:**
```json
{
  "racquetName": "Wilson Ultra 100 V5"
}
```

**Response:**
```json
{
  "query": "Wilson Ultra 100 V5",
  "stores": {
    "prospin": {
      "found": true,
      "storeName": "ProSpin",
      "url": "https://www.prospin.com.br/produto/...",
      "price": "R$ 1.799,91",
      "available": true
    },
    "casadotenista": {
      "found": true,
      "storeName": "Casa do Tenista",
      "url": "https://www.casadotenista.com.br/produto/...",
      "price": "R$ 1.439,91",
      "available": true
    }
  },
  "foundIn": ["ProSpin", "Casa do Tenista"],
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

### `POST /scrape/batch`

Busca múltiplas raquetes sequencialmente (com rate limiting de 1s entre cada).

**Request Body:**
```json
{
  "racquets": [
    "Wilson Ultra 100 V5",
    "Babolat Pure Drive",
    "Head Radical Pro"
  ]
}
```

**Response:**
```json
{
  "totalSearched": 3,
  "results": [
    {
      "racquet": "Wilson Ultra 100 V5",
      "prospin": { "found": true, "url": "...", "price": "..." },
      "casadotenista": { "found": true, "url": "...", "price": "..." }
    },
    ...
  ],
  "timestamp": "2025-01-31T12:00:00.000Z"
}
```

## ☁️ Deploy no Railway

### 1. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte seu repositório

### 2. Configurar Variáveis de Ambiente

No painel do Railway, adicione:

```
NODE_ENV=production
```

O `PORT` será definido automaticamente pelo Railway.

### 3. Deploy Automático

O Railway detectará automaticamente o `Dockerfile` e fará o build e deploy.

### 4. Obter URL do Serviço

Após o deploy, o Railway fornecerá uma URL pública:

```
https://racquet-match-scraper-production.up.railway.app
```

Use essa URL nas chamadas da API do seu frontend Next.js.

## 🔧 Integração com Next.js + Supabase

No seu projeto Next.js, crie um arquivo de ambiente:

```env
NEXT_PUBLIC_SCRAPER_API_URL=https://seu-servico.railway.app
```

Exemplo de uso no frontend:

```typescript
// app/api/search-racquet/route.ts
export async function POST(request: Request) {
  const { racquetName } = await request.json();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SCRAPER_API_URL}/scrape/both`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ racquetName })
    }
  );

  const data = await response.json();
  return Response.json(data);
}
```

## 🛠️ Stack Tecnológico

- **Node.js** + **TypeScript** - Runtime e linguagem
- **Express** - Framework web
- **Playwright** - Automação de browser para web scraping
- **Docker** - Containerização para deploy
- **Railway** - Platform-as-a-Service para hosting

## 📊 Performance

- **Busca única**: ~5-10 segundos por loja
- **Busca dupla (both)**: ~10-15 segundos (paralelo)
- **Busca em lote**: ~10 segundos por raquete (sequencial com rate limiting)

## ⚠️ Considerações

- **Rate Limiting**: O serviço respeita rate limits básicos (1s de delay entre requisições em batch)
- **Timeout**: Cada busca tem timeout de 30s
- **Headless Mode**: Playwright roda em modo headless (sem interface gráfica)
- **Seletores**: Os seletores CSS podem precisar de ajustes se as lojas mudarem a estrutura

## 🐛 Troubleshooting

### Erro: "No products found in search results"

**Causa**: A raquete pode não estar disponível ou o nome não matcheia exatamente.

**Solução**: Verifique o nome exato da raquete nas lojas ou ajuste os seletores.

### Erro: "Timeout"

**Causa**: Loja demorou muito para responder ou está offline.

**Solução**: Aumente o timeout ou tente novamente.

### Erro no Railway: "Failed to build"

**Causa**: Problema com Playwright no Docker.

**Solução**: Certifique-se de que o Dockerfile usa a imagem oficial do Playwright (`mcr.microsoft.com/playwright`).

## 📝 Scripts Disponíveis

```bash
npm run dev       # Desenvolvimento com hot-reload
npm run build     # Compilar TypeScript
npm start         # Rodar versão compilada
npm run test      # Testar endpoints localmente
```

## 📄 Licença

MIT - Bruno H. L. Cunha

---

**Status**: ✅ Pronto para deploy no Railway
