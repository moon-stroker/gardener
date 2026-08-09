@AGENTS.md

# Asesor y Tracker de Plantas

Aplicación web personal para llevar el control visual del crecimiento de cada planta (perfil, fotos, línea de tiempo, bitácora de cuidados) con un asesor de IA que analiza fotos y da recomendaciones de cuidado. Dashboard diario tipo semáforo (rojo/amarillo/verde) que indica qué planta necesita atención hoy.

## Stack

- **Next.js (App Router)** — frontend y backend (API routes) en un solo proyecto, un solo deploy en Vercel.
- **Turso/libSQL** vía **Drizzle ORM** — base de datos. Schema en `db/schema.ts`, migraciones versionadas en `drizzle/` (`npm run db:generate` / `npm run db:migrate`).
- **Vercel Blob** — almacenamiento de fotos (store público `gardener-photos`).
- **Anthropic API** — análisis de imágenes (identificación de especie + diagnóstico de cuidado). Se llama solo desde API routes, nunca desde el cliente.

## Convenciones

- Sin autenticación: la app es pública, cualquiera con la URL puede ver y modificar datos (decisión consciente por simplicidad).
- Soft-delete en `plantas` vía columna `activo` (1 = visible, 0 = oculta) — nunca borrar filas relacionadas.
- El campo `especie_sugerida_ia` nunca sobreescribe `especie` automáticamente si el usuario ya la definió manualmente.
- El estado de semáforo (`rojo`/`amarillo`/`verde`) se calcula en la API route de `GET /api/plantas`, no se almacena.
- Nombres de tabla/columna en español, snake_case, para que coincidan con el dominio del producto.

## Referencia

El desglose completo de épicas y tareas del proyecto se trackea en el task list de la sesión de Claude Code (no en un archivo del repo).
