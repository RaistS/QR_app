# QR Access Control (MVP — Fase 1)

Aplicación **offline** para gestionar el acceso a eventos mediante **códigos QR firmados**.  
Permite crear eventos, dar de alta invitados, generar QR individuales, escanearlos (check-in / check-out) y exportar registros.  

Funciona como **PWA en navegador** o como **aplicación de escritorio (.exe) con Electron**.

---

## 🚀 Funcionalidades

- Gestión de **eventos** (nombre, fecha, ubicación).
- Alta de **invitados** manual o por importación CSV.
- Generación de **QR firmados** (HMAC SHA-256).
- Escaneo desde cámara o imagen:
  - Marca **IN / OUT** de forma automática.
  - Registro local en **LocalStorage**.
- Exportación:
  - JSON de backup (eventos + invitados + logs).
  - CSV de invitados.
  - CSV de check-ins / movimientos.
- Impresión de credenciales QR en hoja A4.
- Todo **funciona offline**.

---

## 📦 Instalación y ejecución

### Opción A: en navegador (dev)
1. Instalar dependencias:
   ```bash
   cd qrac
   npm install

2. Levantar servidor de desarrollo:
   npm run dev

3. Abrir en navegador: http://localhost:5173

### Opción B: aplicación de escritorio (Electron)

Usar el instalador en dist/QRAccessControl-Setup-1.0.0.exe
