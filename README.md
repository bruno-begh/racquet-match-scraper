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

## 📡 Endpoints da API

### `GET /health`

Health check do serviço.

### `POST /scrape/prospin`

Busca uma raquete na ProSpin.

### `POST /scrape/casadotenista`

Busca uma raquete na Casa do Tenista.

### `POST /scrape/both`

Busca em ambas as lojas simultaneamente.

### `POST /scrape/batch`

Busca múltiplas raquetes sequencialmente.

## ☁️ Deploy no Railway

1. Conecte este repositório no Railway
2. O Railway detectará automaticamente o `Dockerfile`
3. Deploy acontece automaticamente
4. Use a URL pública fornecida

## 🛠️ Stack Tecnológico

- **Node.js** + **TypeScript** - Runtime e linguagem
- **Express** - Framework web
- **Playwright** - Automação de browser para web scraping
- **Docker** - Containerização para deploy
- **Railway** - Platform-as-a-Service para hosting

## 📄 Licença

MIT - Bruno H. L. Cunha

---

**Status**: ✅ Pronto para deploy no Railway
