# MetalClean

Plataforma de rede social e mercado de emprego para o setor da metalomecânica (soldadores, caldeireiros, tubistas).

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: Fastify + TypeScript + Prisma + PostgreSQL
- **Web**: Next.js 14 (App Router) + Tailwind CSS
- **Mobile**: Expo (React Native) — Fase 2
- **Real-time**: Socket.IO + Redis — Fase 2
- **Storage**: Cloudflare R2

## Arrancar em desenvolvimento

### Pré-requisitos
- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

### Setup

```bash
# Instalar dependências
pnpm install

# Iniciar serviços locais (PostgreSQL, Redis, Meilisearch)
docker-compose up -d

# Configurar variáveis de ambiente da API
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env com as tuas configurações

# Configurar variáveis de ambiente do web
cp apps/web/.env.example apps/web/.env.local

# Gerar cliente Prisma e executar migrações
pnpm --filter @metalclean/api run db:generate
pnpm --filter @metalclean/api run db:migrate

# Iniciar todos os serviços em modo dev
pnpm dev
```

## Estrutura

```
metalclean/
├── apps/
│   ├── api/          # Fastify REST API (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── types/        # TypeScript types partilhados
│   └── validators/   # Zod schemas partilhados
├── tooling/
│   ├── eslint/       # ESLint config partilhada
│   └── typescript/   # TypeScript configs partilhadas
└── docker-compose.yml
```

## Roadmap

- **Fase 0** (atual): Monorepo, autenticação, schema DB completo
- **Fase 1**: Perfis, ofertas de emprego, matches, avaliações
- **Fase 2**: Chat real-time, notificações push, portfólio visual
- **Fase 3**: Meilisearch, verificação de identidade, Stripe premium
- **Fase 4**: Expansão Espanha, multi-língua

## API Docs

Com o servidor em execução: http://localhost:3001/docs
