import React, { useEffect, useMemo, useState } from "react";
import {
  STORAGE_KEYS,
  useLocalStorage,
  generateSecret,
  runSelfTests,
  downloadBlob,
} from "./utils";
import EventList from "./components/EventList";
import EventDetail from "./components/EventDetail";
import SecretManager from "./components/SecretManager";
import EmptyState from "./components/EmptyState";

export default function App() {
  const [events, setEvents] = useLocalStorage(STORAGE_KEYS.events, []);
  const [logs, setLogs] = useLocalStorage(STORAGE_KEYS.logs, []);
  const [secret, setSecret] = useLocalStorage(
    STORAGE_KEYS.secret,
    generateSecret()
  );
  const [selectedEventId, setSelectedEventId] = useState(null);
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    const swCode = `self.addEventListener('install', e=>{self.skipWaiting()});self.addEventListener('activate', e=>{self.clients.claim()});self.addEventListener('fetch', e=>{e.respondWith((async()=>{try{return await fetch(e.request)}catch(_){return caches.match('shell')||new Response('<!doctype html><title>Offline</title><h1>Estás offline</h1>',{headers:{'Content-Type':'text/html'}})}})())});`;
    const shell = document.documentElement.outerHTML;
    (async () => {
      try {
        const swBlob = new Blob([swCode], { type: "text/javascript" });
        const swUrl = URL.createObjectURL(swBlob);
        await navigator.serviceWorker.register(swUrl);
        const c = await caches.open("qrac-shell");
        await c.put(
          "shell",
          new Response(shell, { headers: { "Content-Type": "text/html" } })
        );
        setTimeout(() => URL.revokeObjectURL(swUrl), 5000);
      } catch (e) {
        console.warn("[SW error]", e);
      }
    })();
  }, []);

  useEffect(() => {
    runSelfTests();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            QR Access Control — MVP
          </h1>
          <SecretManager secret={secret} setSecret={setSecret} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <div className="lg:w-64">
          <EventList
            events={events}
            onSelect={setSelectedEventId}
            selectedId={selectedEventId}
            onCreate={(e) => setEvents([...events, e])}
            onDelete={(id) => setEvents(events.filter((e) => e.id !== id))}
            onExport={() => {
              const json = JSON.stringify({ events, logs, secret }, null, 2);
              downloadBlob("backup.json", "application/json", json);
            }}
            onImport={(text) => {
              try {
                const data = JSON.parse(text);
                if (data.events) setEvents(data.events);
                if (data.logs) setLogs(data.logs);
                if (data.secret) setSecret(data.secret);
              } catch (e) {
                alert("JSON inválido");
              }
            }}
          />
        </div>
        <div className="flex-1">
          {selectedEvent ? (
            <EventDetail
              event={selectedEvent}
              setEvents={setEvents}
              secret={secret}
              logs={logs}
              setLogs={setLogs}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-500">
        © 2024 QRAC
      </footer>
    </div>
  );
}
