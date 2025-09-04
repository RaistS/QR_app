# Guía de Contribución

Gracias por contribuir a QR Access Control.

## Ramas
- `main`: estable. Lo que está listo para release.
- `dev`: sincronizada con `main` para trabajo diario. Feature branches deben salir de `dev`.

## Flujo recomendado
1. Crear rama desde `dev`: `git checkout -b feat/mi-cambio`
2. Cambios pequeños y commits claros (convencionales si es posible).
3. Asegura que no subes artefactos: nada de `node_modules`, `dist`, `.vite`, binarios, `.env`.
4. Ejecuta linters/tests locales según aplique.
5. Abre PR contra `dev`. Usa descripción concisa y pruebas de funcionamiento.

## Commits
- Usa mensajes descriptivos. Ejemplos: `feat:`, `fix:`, `chore:`, `docs:`.
- Un commit por tema si es posible.

## Builds y empaquetado
- Frontend: `cd qrac && npm run build`.
- Electron dev: `npm run dev:electron` (pre-build automático del frontend).
- Empaquetado Windows: `npm run pack:win` o `npm run pack:win:nosign`.

## Reporte de issues
- Incluye pasos para reproducir, logs relevantes y entorno.

