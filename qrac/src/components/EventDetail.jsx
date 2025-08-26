import React, { useEffect, useRef, useState, useMemo } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import {
  fmtDateTime,
  downloadBlob,
  copyToClipboard,
  nowISO,
  makePayload,
  tokenFromPayload,
  verifyToken,
  slug,
  escapeHtml,
  beep,
} from "../utils";

const SCAN_INTERVAL_MS = 100;

export default function EventDetail({ event, events, setEvents, secret, logs, setLogs }) {
  const [tab, setTab] = useState("guests");
  const idx = events.findIndex((e) => e.id === event.id);

  const updateEvent = (patch) => {
    const next = [...events];
    next[idx] = { ...event, ...patch };
    setEvents(next);
  };

  const addGuest = (g) => updateEvent({ guests: [...event.guests, g] });
  const removeGuest = (gid) =>
    updateEvent({ guests: event.guests.filter((g) => g.id !== gid) });
  const updateGuest = (gid, patch) =>
    updateEvent({
      guests: event.guests.map((g) => (g.id === gid ? { ...g, ...patch } : g)),
    });

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">{event.name}</h2>
          <div className="text-sm text-gray-600">
            {event.date ? fmtDateTime(event.date) : "Sin fecha"} —{" "}
            {event.location || "Sin ubicación"}
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              tab === "guests" ? "bg-gray-900 text-white" : "bg-white"
            }`}
            onClick={() => setTab("guests")}
          >
            Gestión
          </button>
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              tab === "list" ? "bg-gray-900 text-white" : "bg-white"
            }`}
            onClick={() => setTab("list")}
          >
            Listado
          </button>
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              tab === "scan" ? "bg-gray-900 text-white" : "bg-white"
            }`}
            onClick={() => setTab("scan")}
          >
            Escanear
          </button>
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              tab === "export" ? "bg-gray-900 text-white" : "bg-white"
            }`}
            onClick={() => setTab("export")}
          >
            Exportar
          </button>
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              tab === "print" ? "bg-gray-900 text-white" : "bg-white"
            }`}
            onClick={() => setTab("print")}
          >
            Credenciales
          </button>
        </div>
      </div>

      {tab === "guests" && <GuestsTab addGuest={addGuest} />}
      {tab === "list" && (
        <GuestListTab
          event={event}
          removeGuest={removeGuest}
          updateGuest={updateGuest}
          secret={secret}
        />
      )}
      {tab === "scan" && (
        <ScanTab event={event} secret={secret} setLogs={setLogs} />
      )}
      {tab === "export" && <ExportTab event={event} logs={logs} />}
      {tab === "print" && <PrintTab event={event} secret={secret} />}
    </div>
  );
}

function GuestsTab({ addGuest }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-1">
      <div>
        <h3 className="font-medium mb-2">Alta manual</h3>
        <div className="space-y-2">
          <input
            className="w-full px-3 py-2 border rounded-xl"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 border rounded-xl"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="px-3 py-2 border rounded-xl"
              placeholder="Rol (VIP, Staff, etc.)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <input
              className="px-3 py-2 border rounded-xl"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              title="Caducidad del QR (opcional)"
            />
          </div>
          <textarea
            className="w-full px-3 py-2 border rounded-xl"
            placeholder="Nota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="w-full py-2 rounded-xl bg-gray-900 text-white"
            onClick={() => {
              if (!name.trim()) return alert("Nombre requerido");
              addGuest({
                id: uuidv4(),
                name: name.trim(),
                email: email.trim(),
                role: role.trim(),
                note: note.trim(),
                expiresAt,
              });
              setName("");
              setEmail("");
              setRole("");
              setNote("");
              setExpiresAt("");
            }}
          >
            Añadir invitado
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="font-medium">Importación CSV</h3>
          <p className="text-xs text-gray-600">
            Cabeceras soportadas: <code>name,email,role,note,expiresAt</code>.
            Formato de fecha: ISO o <code>YYYY-MM-DD HH:mm</code>.
          </p>
          <div className="flex items-center gap-2">
            <label className="px-3 py-2 rounded-xl border cursor-pointer">
              Subir CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (res) => {
                      const rows = res.data || [];
                      const added = [];
                      rows.forEach((r) => {
                        const g = {
                          id: uuidv4(),
                          name: (r.name || "").trim(),
                          email: (r.email || "").trim(),
                          role: (r.role || "").trim(),
                          note: (r.note || "").trim(),
                          expiresAt: (r.expiresAt || "").trim(),
                        };
                        if (g.name) {
                          added.push(g);
                        }
                      });
                      if (!added.length)
                        return alert("No se encontraron filas válidas");
                      added.forEach(addGuest);
                      alert(`Importados ${added.length} invitados`);
                    },
                  });
                  e.target.value = "";
                }}
              />
            </label>
            <button
              className="px-3 py-2 rounded-xl border"
              onClick={() => {
                const sample =
                  `name,email,role,note,expiresAt\n` +
                  `Ada Lovelace,ada@demo.com,VIP,,2025-12-31 23:59\n` +
                  `Luis Pérez,luis@demo.com,Invitado,,\n`;
                downloadBlob("invitados_ejemplo.csv", "text/csv", sample);
              }}
            >
              CSV ejemplo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestListTab({ event, removeGuest, updateGuest, secret }) {
  async function sendQrEmail(guest) {
    if (!guest.email) {
      alert("Invitado sin email");
      return;
    }
    try {
      const payload = makePayload({ eventId: event.id, guest });
      const token = await tokenFromPayload(payload, secret);
      const dataUrl = await QRCode.toDataURL(token, { margin: 1, scale: 8 });
      const subject = encodeURIComponent(`QR para ${guest.name}`);
      const body = encodeURIComponent(
        `Hola ${guest.name},\n\nAdjunto tu código QR:\n${dataUrl}\n`
      );
      window.location.href = `mailto:${guest.email}?subject=${subject}&body=${body}`;
    } catch {
      alert("Error generando QR");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Invitados ({event.guests.length})</h3>
        {event.guests.length > 0 && (
          <button
            className="px-3 py-1.5 rounded-xl border text-sm"
            onClick={() => event.guests.forEach((g) => sendQrEmail(g))}
          >
            Enviar todos
          </button>
        )}
      </div>
      <ul className="max-h-[28rem] overflow-auto pr-1 space-y-2">
        {event.guests.map((g) => (
          <li
            key={g.id}
            className="p-3 rounded-xl border bg-white flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {g.name}{" "}
                  {g.role && (
                    <span className="text-xs text-gray-500">— {g.role}</span>
                  )}
                </div>
                {g.email && (
                  <div className="text-xs text-gray-500">{g.email}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-xl border"
                  onClick={() => sendQrEmail(g)}
                >
                  Enviar QR
                </button>
                <QRButton eventId={event.id} guest={g} secret={secret} />
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => {
                    if (confirm("¿Eliminar invitado?")) removeGuest(g.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">
                Caduca:
                <input
                  className="flex-1 px-2 py-1 border rounded-lg"
                  type="datetime-local"
                  value={g.expiresAt || ""}
                  onChange={(e) =>
                    updateGuest(g.id, { expiresAt: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2">
                Rol:
                <input
                  className="flex-1 px-2 py-1 border rounded-lg"
                  value={g.role || ""}
                  onChange={(e) => updateGuest(g.id, { role: e.target.value })}
                />
              </label>
            </div>
            <textarea
              className="w-full px-2 py-1 border rounded-lg text-sm"
              placeholder="Nota"
              value={g.note || ""}
              onChange={(e) => updateGuest(g.id, { note: e.target.value })}
            />
          </li>
        ))}
        {!event.guests.length && (
          <li className="text-sm text-gray-500">Aún no hay invitados.</li>
        )}
      </ul>
    </div>
  );
}

function QRButton({ eventId, guest, secret }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="px-3 py-1.5 text-sm rounded-xl border"
        onClick={() => setOpen(true)}
      >
        Ver QR
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <QRCard eventId={eventId} guest={guest} secret={secret} />
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-4 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button className="text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QRCard({ eventId, guest, secret }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [token, setToken] = useState("Generando…");

  useEffect(() => {
    (async () => {
      const payload = makePayload({ eventId, guest });
      const t = await tokenFromPayload(payload, secret);
      setToken(t);
      const url = await QRCode.toDataURL(t, { margin: 1, scale: 8 });
      setDataUrl(url);
    })();
  }, [eventId, guest, secret]);

  return (
    <div className="grid gap-3 text-center">
      <div>
        <div className="text-xl font-semibold">{guest.name}</div>
        {guest.role && (
          <div className="text-sm text-gray-600">{guest.role}</div>
        )}
      </div>
      {dataUrl ? (
        <img src={dataUrl} alt="QR" className="mx-auto w-56 h-56" />
      ) : (
        <div className="w-56 h-56 mx-auto grid place-items-center border rounded-xl">
          Creando QR…
        </div>
      )}
      <div className="text-xs break-all bg-gray-50 border rounded-xl p-2">
        {token}
      </div>
      <div className="flex gap-2 justify-center">
        <button
          className="px-3 py-1.5 rounded-xl border"
          onClick={async () => {
            const ok = await copyToClipboard(token);
            alert(
              ok
                ? "Token copiado"
                : "No se pudo copiar automáticamente. Se mostró el texto para que lo copies manualmente."
            );
          }}
        >
          Copiar token
        </button>
        {dataUrl && (
          <button
            className="px-3 py-1.5 rounded-xl border"
            onClick={() => {
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `${guest.name}_QR.png`;
              a.click();
            }}
          >
            Descargar PNG
          </button>
        )}
      </div>
    </div>
  );
}

function ScanTab({ event, secret, setLogs }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [active, setActive] = useState(false);
  const [last, setLast] = useState(null);
  const [err, setErr] = useState("");
  const lastTickRef = useRef(0);

  useEffect(() => {
    let rafId;
    async function tick(ts) {
      try {
        if (ts - lastTickRef.current < SCAN_INTERVAL_MS) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        lastTickRef.current = ts;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        const w = video.videoWidth,
          h = video.videoHeight;
        if (!w || !h) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (code && code.data && (!last || last.raw !== code.data)) {
          console.log("[ScanTab] QR detectado:", code.data);
          await handleToken(code.data);
        }
      } catch (e) {
        console.error("[ScanTab] tick error", e);
      }
      rafId = requestAnimationFrame(tick);
    }
    if (active) rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, secret, last]);

  useEffect(() => {
    return () => stop();
  }, []);

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (e) {
      setErr("No se pudo acceder a la cámara: " + e.message);
    }
  }
  function stop() {
    const v = videoRef.current;
    const s = v?.srcObject;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setActive(false);
  }
  async function handleToken(token) {
    const res = await verifyToken(token, secret);
    let guest = null;
    if (res.ok) {
      if (res.payload.eid !== event.id) {
        persistLog({ ok: false, reason: "Evento distinto", payload: res.payload });
        beep(false);
        setLast({ raw: token, status: "error", reason: "Evento distinto" });
        return;
      }
      guest = event.guests.find((g) => g.id === res.payload.gid) || null;
      if (!guest) {
        persistLog({
          ok: false,
          reason: "Invitado no encontrado",
          payload: res.payload,
        });
        beep(false);
        setLast({
          raw: token,
          status: "error",
          reason: "Invitado no encontrado",
        });
        return;
      }
      const { jti } = res.payload || {};
      const usedKey = `used_${event.id}`;
      const used = new Set(
        JSON.parse(localStorage.getItem(usedKey) || "[]")
      );
      if (jti && used.has(jti)) {
        persistLog({ ok: false, reason: "QR ya usado", payload: res.payload });
        beep(false);
        setLast({ raw: token, status: "error", reason: "QR ya usado" });
        return;
      }
      persistLog({ ok: true, guest });
      if (jti) {
        used.add(jti);
        localStorage.setItem(usedKey, JSON.stringify([...used]));
      }
      beep(true);
      setLast({ raw: token, status: "ok", guest });
    } else {
      persistLog({ ok: false, reason: res.reason });
      beep(false);
      setLast({ raw: token, status: "error", reason: res.reason });
    }
  }
  function persistLog({ ok, guest = null, reason = null, payload = null }) {
    const item = {
      id: uuidv4(),
      eventId: event.id,
      guestId: guest?.id || payload?.gid || null,
      guestName: guest?.name || null,
      whenISO: nowISO(),
      device: navigator.userAgent,
      ok,
      reason,
    };
    setLogs((prev) => [...prev, item]);
  }
  return (
    <div className="mt-4 grid gap-6">
      <div className="flex items-center gap-2 flex-wrap">
        {!active ? (
          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white"
            onClick={start}
          >
            Iniciar cámara
          </button>
        ) : (
          <button className="px-4 py-2 rounded-xl border" onClick={stop}>
            Detener
          </button>
        )}
        <button
          className="px-4 py-2 rounded-xl border"
          onClick={() => {
            localStorage.removeItem(`used_${event.id}`);
            alert("Reseteado el registro de QR usados para este evento.");
          }}
        >
          Reset usados (evento)
        </button>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>
      <div className="grid gap-3">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex items-center gap-2">
        <label className="px-3 py-2 rounded-xl border cursor-pointer">
          Leer desde imagen
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const img = new Image();
              img.onload = async () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(im.data, canvas.width, canvas.height, {
                  inversionAttempts: "dontInvert",
                });
                if (code?.data) await handleToken(code.data);
                else alert("No se detectó un QR válido en la imagen.");
                e.target.value = "";
                URL.revokeObjectURL(img.src);
              };
              img.src = URL.createObjectURL(f);
            }}
          />
        </label>
        <input
          className="px-3 py-2 border rounded-xl flex-1"
          placeholder="Pegar token QRAC1.… y Enter"
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              const v = e.currentTarget.value.trim();
              if (v) {
                await handleToken(v);
                e.currentTarget.value = "";
              }
            }
          }}
        />
        <button
          className="px-3 py-2 rounded-xl border"
          onClick={async () => {
            const v = prompt("Pega el token QR:");
            if (v) await handleToken(v.trim());
          }}
        >
          Validar token
        </button>
      </div>
      {last && (
        <div
          className={`p-3 rounded-xl border ${
            last.status === "ok"
              ? "border-green-600 bg-green-50"
              : "border-red-600 bg-red-50"
          }`}
        >
          {last.status === "ok" ? (
            <div>
              <div className="font-medium">✔ Acceso permitido</div>
              <div className="text-sm">{last.guest?.name}</div>
            </div>
          ) : (
            <div>
              <div className="font-medium">✖ Acceso denegado</div>
              <div className="text-sm">{last.reason}</div>
            </div>
          )}
        </div>
      )}
      <div className="text-xs text-gray-600">
        Nota: Sin servidor no es posible bloquear re-uso del mismo QR entre
        dispositivos. Este MVP marca usos localmente.
      </div>
    </div>
  );
}

function ExportTab({ event, logs }) {
  const eventLogs = useMemo(
    () => logs.filter((l) => l.eventId === event.id),
    [logs, event.id]
  );
  return (
    <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="px-4 py-2 rounded-xl border"
          onClick={() => {
            const rows = eventLogs.map((l) => ({
              when: l.whenISO,
              guestId: l.guestId || "",
              guestName: l.guestName || "",
              ok: l.ok ? "1" : "0",
              reason: l.reason || "",
              device: l.device,
            }));
            const csv = Papa.unparse(rows);
            downloadBlob(`${slug(event.name)}_checkins.csv`, "text/csv", csv);
          }}
        >
          Exportar check-ins CSV
        </button>

        <button
          className="px-4 py-2 rounded-xl border"
          onClick={() => {
            const rows = event.guests.map((g) => ({
              id: g.id,
              name: g.name,
              email: g.email || "",
              role: g.role || "",
              note: g.note || "",
              expiresAt: g.expiresAt || "",
            }));
            const csv = Papa.unparse(rows);
            downloadBlob(`${slug(event.name)}_invitados.csv`, "text/csv", csv);
          }}
        >
          Exportar invitados CSV
        </button>

        <button
          className="px-4 py-2 rounded-xl border"
          onClick={() => {
            const json = JSON.stringify(event, null, 2);
            downloadBlob(`${slug(event.name)}.json`, "application/json", json);
          }}
        >
          Exportar evento JSON
        </button>
      </div>
      <div className="text-sm text-gray-600">Registros: {eventLogs.length}</div>
      <div className="max-h-80 overflow-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Invitado</th>
              <th className="p-2 text-left">OK</th>
              <th className="p-2 text-left">Motivo</th>
              <th className="p-2 text-left">Dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {eventLogs
              .slice()
              .reverse()
              .map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">
                    {fmtDateTime(l.whenISO)}
                  </td>
                  <td className="p-2">{l.guestName || l.guestId || "-"}</td>
                  <td className="p-2">{l.ok ? "✔" : "✖"}</td>
                  <td className="p-2">{l.reason || ""}</td>
                  <td className="p-2 truncate max-w-[16rem]" title={l.device}>
                    {l.device}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrintTab({ event, secret }) {
  const [htmlUrl, setHtmlUrl] = useState(null);
  useEffect(() => {
    (async () => {
      const cards = await Promise.all(
        event.guests.map(async (g) => {
          const payload = makePayload({ eventId: event.id, guest: g });
          const token = await tokenFromPayload(payload, secret);
          const dataUrl = await QRCode.toDataURL(token, { margin: 1, scale: 6 });
          return `<div class="card"><div class="event">${escapeHtml(
            event.name
          )}</div><img src="${dataUrl}"/><div class="name">${escapeHtml(
            g.name
          )}</div><div class="email">${escapeHtml(g.email || "")}</div><div class="role">${escapeHtml(
            g.role || ""
          )}</div></div>`;
        })
      );
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(
        event.name
      )} — Credenciales</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
        .card { border: 1px solid #ccc; border-radius: 10px; padding: 10mm; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 24mm); page-break-after: always; }
        .card:last-child { page-break-after: auto; }
        .card img { width: 220px; height: 220px; object-fit: contain; }
        .event { font-size: 16px; font-weight: 700; margin-bottom: 4mm; }
        .name { font-size: 18px; font-weight: 700; margin-top: 6mm; }
        .email { font-size: 14px; margin-top: 2mm; }
        .role { font-size: 12px; color: #555; margin-top: 2mm; }
      </style></head>
      <body>
        ${cards.join("\n")}
        <script>window.print()</script>
      </body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setHtmlUrl(url);
    })();
  }, [event, secret]);

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-gray-600">
        Genera una hoja imprimible con QR por invitado.
      </p>
      <div>
        <a
          href={htmlUrl || "#"}
          target="_blank"
          rel="noreferrer"
          className={`px-4 py-2 rounded-xl border ${
            htmlUrl ? "" : "pointer-events-none opacity-50"
          }`}
        >
          Abrir vista de impresión
        </a>
      </div>
    </div>
  );
}

