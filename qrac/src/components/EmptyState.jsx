import React from "react";

export default function EmptyState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-medium">
          Crea un evento o selecciona uno existente
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Gestiona invitados, genera credenciales con QR firmados, escanea y
          registra check-ins. Funciona offline.
        </p>
      </div>
    </div>
  );
}
