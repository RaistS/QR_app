import { useEffect, useState } from "react";

export const STORAGE_KEYS = {
  events: "qrac_events_v1",
  logs: "qrac_logs_v1",
  secret: "qrac_secret_v1",
};

export const base64url = {
  encode: (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, ""),
  decode: (str) => {
    const pad = str.length % 4 === 0 ? 0 : 4 - (str.length % 4);
    const s = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  },
};

export async function hmacImportKey(secret) {
  let raw;
  try {
    if (/^[A-Za-z0-9_-]{43,}$/.test(secret)) raw = base64url.decode(secret);
  } catch (_) {}
  if (!raw) raw = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"]
  );
}

export async function hmacSign(secret, data) {
  const key = await hmacImportKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return new Uint8Array(sig);
}

export async function hmacVerify(secret, data, signature) {
  const key = await hmacImportKey(secret);
  return await crypto.subtle.verify("HMAC", key, signature, data);
}

export function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function nowISO() {
  return new Date().toISOString();
}

export function fmtDateTime(d) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("[useLocalStorage] error saving", e);
    }
  }, [key, state]);
  return [state, setState];
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch (_) {}
  try {
    window.prompt("Copia el contenido y pulsa Aceptar", text);
  } catch (_) {}
  return false;
}

export function makePayload({ eventId, guest, version = 1 }) {
  const payload = {
    v: version,
    eid: eventId,
    gid: guest.id,
    jti: crypto.randomUUID(),
    iat: new Date().toISOString(),
  };
  if (guest.expiresAt) payload.exp = new Date(guest.expiresAt).toISOString();
  return payload;
}

export async function tokenFromPayload(payload, secret) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await hmacSign(secret, json);
  const t = base64url.encode(json) + "." + base64url.encode(sig);
  return "QRAC1." + t;
}

export async function verifyToken(token, secret) {
  if (!token.startsWith("QRAC1."))
    return { ok: false, reason: "Formato inválido" };
  const body = token.slice("QRAC1.".length);
  const [payloadB64, sigB64] = body.split(".");
  if (!payloadB64 || !sigB64)
    return { ok: false, reason: "Token incompleto" };
  const jsonBuf = base64url.decode(payloadB64);
  const sigBuf = base64url.decode(sigB64);
  const ok = await hmacVerify(secret, jsonBuf, sigBuf);
  if (!ok) return { ok: false, reason: "Firma no válida" };
  const payload = JSON.parse(new TextDecoder().decode(jsonBuf));
  if (payload.exp && new Date(payload.exp) < new Date()) {
    return { ok: false, reason: "QR caducado", payload };
  }
  return { ok: true, payload };
}

export function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function escapeHtml(s) {
  return s.replace(/[&<>\"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

export function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url.encode(bytes);
}

export function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = ok ? "sine" : "square";
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.05;
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, ok ? 150 : 300);
  } catch (_) {}
}

export function runSelfTests() {
  try {
    console.group("[SelfTests]");
    const sample = new TextEncoder().encode("hello");
    const enc = base64url.encode(sample);
    const dec = new Uint8Array(base64url.decode(enc));
    console.assert(
      new TextDecoder().decode(dec) === "hello",
      "base64url roundtrip"
    );
    (async () => {
      const secret = generateSecret();
      const payload = {
        v: 1,
        eid: "evt",
        gid: "guest",
        jti: crypto.randomUUID(),
        iat: new Date().toISOString(),
      };
      const tok = await tokenFromPayload(payload, secret);
      const ok = await verifyToken(tok, secret);
      console.assert(ok.ok && ok.payload.gid === "guest", "verify valid token");
      const bad = await verifyToken(tok, generateSecret());
      console.assert(!bad.ok, "reject token with different secret");
      console.groupEnd();
    })();
  } catch (e) {
    console.error("[SelfTests] failed", e);
  }
}

