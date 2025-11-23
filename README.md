# QR Access Control

Aplicación para gestionar acceso a eventos mediante códigos QR firmados. Permite crear eventos, dar de alta invitados (manual o CSV), generar y escanear QR, registrar check-ins y exportar datos. Funciona en web (build Vite) y como app de escritorio con Electron; incluye un backend Express para envío opcional de QR por email.

---

## Estructura
- `qrac/`: Frontend React (Vite + Tailwind).
- `electron/`: App de escritorio (carga `qrac/dist/index.html`).
- `server.js`: Backend Express para envío de emails.
- `scripts/`: utilidades (limpieza, icono PNG→ICO).

---

## Requisitos
- Node.js 18+ (recomendado LTS).
- Windows si quieres generar el `.exe` con electron-builder.

---

## Instalación rápida
```ps1
# En la raíz
npm install
cd qrac; npm install; cd ..
```

---

## Desarrollo
- Backend API (puerto 3001): `npm start`
- Frontend Vite: `cd qrac && npm run dev` (http://localhost:5173, proxy a `/api` → http://localhost:3001)
- Electron en dev: desde la raíz `npm run dev:electron` (build del frontend y lanza Electron sobre `qrac/dist`).

---

## Builds y empaquetado
- Build web para Electron: `npm run build:web` (genera `qrac/dist`).
- Icono (si cambias PNG): `npm run icon:build`.
- Empaquetar Windows:
  - `npm run pack:win` (firma si tienes certificados configurados).
  - `npm run pack:win:nosign` (sin firma).
  El instalador queda en `dist/QR Access Control Setup <version>.exe` y la carpeta portable en `dist/win-unpacked`.

---

## Exportaciones y backups
- En la app: puedes exportar invitados y check-ins a CSV, y backup completo desde la barra lateral (JSON con eventos, registros y secreto).
- Las horas de check-ins se exportan ya en horario de Madrid (sin offset extra).

---

## Variables de entorno (`.env`)
Se usan solo para el backend Express (envío de emails):
```
PORT=3001
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USERNAME=usuario@example.com
SMTP_PASSWORD=contraseña
MAIL_FROM=usuario@example.com
MAIL_FROM_NAME=QR Access Control
# Opcional OAuth2 Azure
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```
Notas:
- `SMTP_PORT=465` usa TLS implícito; `587` usa STARTTLS (`requireTLS`).
- Si defines credenciales Azure, se usa OAuth2 en lugar de password.

---

## Ramas
- `main`: rama principal.
- `dev`: alineada con `main`.
Evita commitear `node_modules`, `dist`, `.vite`, binarios y `.env` (ya en `.gitignore`). Para aportar más info ver `CONTRIBUTING.md`.

