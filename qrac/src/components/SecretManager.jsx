import React, { useState } from "react";
import { copyToClipboard, generateSecret } from "../utils";

export default function SecretManager({ secret, setSecret }) {
  const [visible, setVisible] = useState(false);
  const weak = typeof secret === "string" && secret.length < 32;
  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-sm shadow"
        onClick={() => setSecret(generateSecret())}
        title="Generar un nuevo secreto aleatorio (rotación)"
      >
        Rotar secreto
      </button>
      <button
        className="px-3 py-1.5 rounded-xl bg-gray-100 text-sm border"
        onClick={async () => {
          const ok = await copyToClipboard(secret);
          alert(
            ok
              ? "Secreto copiado"
              : "No se pudo copiar automáticamente. Se mostró el texto para que lo copies manualmente."
          );
        }}
      >
        Copiar secreto
      </button>
      <button
        className="px-2 py-1 rounded-lg text-sm border"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Ocultar" : "Ver"}
      </button>
      <input
        className={`ml-2 w-64 px-2 py-1 text-sm border rounded-lg bg-white ${
          weak ? "border-red-400" : ""
        }`}
        value={visible ? secret : "•".repeat(12)}
        onChange={(e) => setSecret(e.target.value)}
        title="Secreto de firma HMAC (compártelo para validar en otros dispositivos)"
      />
    </div>
  );
}
