# TEMU-List — Listas de deseos familiares

Aplicación web de listas de deseos de Temu con espacios independientes para cada familia. Actualmente está publicada en [Vercel](https://amigo-secreto-temu-familia.vercel.app).

> **Estado:** snapshot recuperado del despliegue de producción del 4 de noviembre de 2026. El frontend conservado en `public/assets` es un **bundle compilado** de React/Vite. Es ejecutable, pero todavía se debe restaurar/refactorizar su estructura original de componentes para facilitar cambios.

## Qué hace

- Crear una familia con 2–20 participantes y obtener una contraseña maestra.
- Entrar a cada familia por su contraseña; las listas son independientes entre grupos.
- Mostrar y editar los deseos de cada participante, con 3 espacios iniciales y hasta 20 opciones.
- Guardar enlaces seguros de Temu, títulos y notas.
- Renombrar la familia y cambiar su contraseña maestra; la contraseña anterior deja de funcionar.
- Compartir invitaciones por WhatsApp.

No incluye sorteos ni selección de quién compra cada regalo.

## Estructura

```text
index.html                                    # Página de entrada (snapshot Vercel)
api/list.js                                   # Proxy serverless de Vercel
public/assets/temu-wishlists-v3.js            # Frontend compilado React/Vite
public/assets/temu-wishlists-v3.css           # Estilos de la aplicación
public/assets/password-manager-v1.js          # Cambio de contraseña maestra
public/assets/password-manager-v1.css         # Estilos del diálogo
supabase/functions/temu-family-wishlist-v1/  # Backend real de la aplicación
supabase/migrations/                          # Esquema de tablas, sin datos privados
docs/                                         # Arquitectura y notas de revisión
```

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

La aplicación publicada usa la función `temu-family-wishlist-v1` de Supabase mediante `/api/list`. En desarrollo local, **Vite solo no emula** la función de Vercel: para acceso real a listas ejecuta también `vercel dev` o configura un proxy equivalente. Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalles.

## Importante: seguridad y datos

El repositorio es **público**. No subas códigos maestros reales, nombres/listas exportadas, tokens, claves privadas, `.env`, respaldos ni datos de producción. El endpoint público de la función no es una credencial; la clave de servicio de Supabase se mantiene exclusivamente en el entorno del servidor.

Consulta [docs/REVIEW_NOTES.md](docs/REVIEW_NOTES.md) antes de conectar despliegues automáticos de GitHub a producción.

## Despliegue

El sitio de producción se sirve actualmente desde un proyecto de Vercel. **Este commit no modifica la web publicada** ni conecta el repositorio a despliegues automáticos. Para futuras actualizaciones, reconstruir primero un frontend editable, probar en preview y después conectar producción.
