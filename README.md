# Asesor y Tracker de Plantas

Aplicación web personal para llevar el control visual del crecimiento de cada planta, con un asesor de IA que analiza fotos y da recomendaciones de cuidado. Ver el documento de diseño original para el detalle completo de arquitectura y alcance.

**Stack:** Next.js (App Router, frontend + API routes en un solo proyecto) · Vercel (hosting) · Turso/libSQL (base de datos, vía Drizzle ORM) · Vercel Blob (fotos) · Anthropic API (análisis de imágenes).

## Desarrollo local

```bash
npm install
npm run dev
```

Esto levanta frontend y backend juntos en [http://localhost:3000](http://localhost:3000) (comportamiento nativo de Next.js — no hay servidor separado que levantar). La conexión a Turso se toma de `.env.local`.

### Variables de entorno

Copia `.env.local` (no versionado) con estas variables. En Vercel ya están configuradas para Production/Preview/Development vía `vercel env add`.

| Variable | Qué es | De dónde sale |
|---|---|---|
| `TURSO_DATABASE_URL` | URL de conexión a la base de datos libSQL | `turso db show gardener --url` |
| `TURSO_AUTH_TOKEN` | Token de autenticación de la base de datos | `turso db tokens create gardener` |
| `BLOB_READ_WRITE_TOKEN` | Token para subir/leer archivos en Vercel Blob | Generado automáticamente al correr `vercel blob create-store` y enlazado al proyecto |
| `ANTHROPIC_API_KEY` | Clave de la API de Anthropic para el análisis de fotos | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `VERCEL_OIDC_TOKEN` | Token interno que gestiona el propio CLI de Vercel | Generado automáticamente, no tocar |

### Base de datos (migraciones versionadas)

El esquema vive en [`db/schema.ts`](db/schema.ts) usando Drizzle ORM. Las migraciones generadas están en `drizzle/`.

```bash
npm run db:generate   # genera un nuevo archivo de migración a partir de cambios en db/schema.ts
npm run db:migrate    # aplica las migraciones pendientes contra Turso (mismo comando en local y producción)
```

### Pruebas

```bash
npm test
```

Corre con Vitest: pruebas puras de la lógica de semáforo (`tests/semaforo.test.ts`) y pruebas de integración de las API routes contra la base de Turso real (`tests/api-*.test.ts`, prefijo `__test_*__`, se limpian solas al terminar). La clave de Anthropic no se usa en las pruebas automatizadas — el endpoint de análisis de IA se verifica manualmente (ver Tarea 7.3).

## Deploy

El proyecto está conectado a Vercel (`monserrat-reyes-projects/gardener`) y a GitHub (`moon-stroker/gardener`) — cada push a `main` dispara un deploy automático.

**URL pública:** https://gardener-monserrat-reyes-projects.vercel.app

> Por defecto Vercel activa "Deployment Protection" (pide login de Vercel antes de mostrar la app), lo cual contradice que esta app deba ser pública sin autenticación (ver sección "Acceso" del documento de diseño). Debe estar **Disabled** en Project Settings → Deployment Protection.
