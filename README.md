# QR Access Control (MVP)

Aplicación para gestionar el acceso a eventos mediante códigos QR. Permite crear eventos, dar de alta invitados, generar QR, escanearlos (check-in / check-out) y exportar registros.

Funciona como frontend React (Vite) y como aplicación de escritorio con Electron. Incluye un backend Express para envío de QR por email.

---

## Funcionalidades

- Gestión de eventos e invitados (alta manual o CSV).
- Generación de QR firmados.
- Escaneo desde cámara o imagen con IN/OUT automático y registro local.
- Exportación de JSON/CSV de invitados y movimientos.
- App de escritorio empaquetable para Windows.

---

## Estructura

- `qrac/`: Frontend React (Vite + Tailwind).
- `electron/`: App de escritorio (carga `qrac/dist/index.html`).
- `server.js`: Backend Express para envío de emails con QR.
- `scripts/`: utilidades (`clean`, icono PNG→ICO).

---

## Requisitos

- Node.js 18+ (recomendado LTS)
- Windows para empaquetar `.exe` (electron-builder)

---

## Instalación

1) Dependencias raíz (Electron + servidor):
- `npm install`

2) Dependencias frontend:
- `cd qrac && npm install`

---

## Desarrollo

- Backend API (puerto 3001):
  - `npm start`

- Frontend (Vite dev):
  - `cd qrac && npm run dev`
  - Abre `http://localhost:5173`
  - El proxy `/api` apunta a `http://localhost:3001`

- Electron en dev (usa build de `qrac`):
  - Desde la raíz: `npm run dev:electron`
  - Este comando hace `npm run build:web` y luego lanza Electron sobre `qrac/dist`

---

## Empaquetado Windows

- `npm run pack:win` (firma si hay certificados configurados)
- `npm run pack:win:nosign` (sin firma)

El ejecutable y artefactos se generan en la carpeta de salida de electron-builder.

---

## Variables de entorno (`.env`)

Servidor Express (`server.js`) para envío de emails:

```
# Puerto API
PORT=3001

# SMTP básico
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USERNAME=usuario@example.com
SMTP_PASSWORD=contraseña

# Remitente
MAIL_FROM=usuario@example.com
MAIL_FROM_NAME=QR Access Control

# (Opcional) OAuth2 Azure en lugar de password
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

Notas:
- Si `SMTP_PORT=465` se usará TLS implícito (`secure: true`).
- Para `587` se usa STARTTLS (`requireTLS`).
- Si defines credenciales de Azure, el servidor enviará con OAuth2 (sin password).

---

## Flujo Git

- Rama principal: `main`
- Rama de desarrollo: `dev` (sincronizada con `main`)
- No commitear artefactos: `node_modules`, `dist`, `.vite`, binarios, `.env` (configurado en `.gitignore`).

Para contribuir, ver `CONTRIBUTING.md`.

