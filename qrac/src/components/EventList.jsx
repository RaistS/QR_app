import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { fmtDateTime } from "../utils";

export default function EventList({
  events,
  onSelect,
  selectedId,
  onCreate,
  onDelete,
  onExport,
  onImport,
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow p-4 sticky top-20">
      <h2 className="text-lg font-semibold mb-3">Eventos</h2>

      <ul className="space-y-1 mb-4 max-h-72 overflow-auto pr-1">
        {events.map((e) => (
          <li
            key={e.id}
            className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${
              selectedId === e.id ? "bg-gray-100 border-gray-400" : "bg-white"
            }`}
          >
            <button
              onClick={() => onSelect(e.id)}
              className="flex-1 text-left"
              title="Seleccionar"
            >
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-gray-500">
                {e.date ? fmtDateTime(e.date) : "Sin fecha"} —{" "}
                {e.location || "Sin ubicación"}
              </div>
            </button>
            <button
              className="text-xs text-red-600 hover:underline"
              onClick={() => {
                if (confirm("¿Eliminar evento y sus invitados?")) onDelete(e.id);
              }}
            >
              Eliminar
            </button>
          </li>
        ))}
        {!events.length && (
          <li className="text-sm text-gray-500">Aún no hay eventos.</li>
        )}
      </ul>

      <div className="border-t pt-3 space-y-2">
        <h3 className="text-sm font-medium">Crear evento</h3>
        <input
          className="w-full px-3 py-2 border rounded-xl"
          placeholder="Nombre del evento"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 border rounded-xl"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 border rounded-xl"
          placeholder="Ubicación"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          className="w-full py-2 rounded-xl bg-gray-900 text-white"
          onClick={() => {
            if (!name.trim()) return alert("El nombre es obligatorio");
            onCreate({
              id: uuidv4(),
              name: name.trim(),
              date,
              location,
              guests: [],
            });
            setName("");
            setDate("");
            setLocation("");
          }}
        >
          Crear
        </button>
      </div>

      <div className="border-t mt-4 pt-3 space-y-2">
        <h3 className="text-sm font-medium">Backup</h3>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-xl border" onClick={onExport}>
            Exportar JSON
          </button>
          <label className="flex-1 py-2 rounded-xl border text-center cursor-pointer">
            Importar JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const text = await f.text();
                onImport(text);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
