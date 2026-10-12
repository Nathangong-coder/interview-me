"use client";

import { useEffect, useState } from "react";
import { useBank, useSettings } from "@/lib/storage";
import { Bank } from "./Bank";
import { Editor } from "./Editor";
import { Practice } from "./Practice";
import { SettingsPanel } from "./SettingsPanel";
import { ImportShared } from "./ImportShared";

export type Route =
  | { name: "bank" }
  | { name: "new" }
  | { name: "edit"; id: string }
  | { name: "practice"; id: string }
  | { name: "settings" }
  | { name: "import"; data: string };

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/");
  switch (parts[0]) {
    case "new":
      return { name: "new" };
    case "edit":
      return parts[1] ? { name: "edit", id: parts[1] } : { name: "bank" };
    case "practice":
      return parts[1] ? { name: "practice", id: parts[1] } : { name: "bank" };
    case "settings":
      return { name: "settings" };
    case "import":
      return { name: "import", data: parts.slice(1).join("/") };
    default:
      return { name: "bank" };
  }
}

export function go(path: string) {
  window.location.hash = path;
}

export function App() {
  const [route, setRoute] = useState<Route>({ name: "bank" });
  const { settings, setSettings, loaded: settingsLoaded } = useSettings();
  const { bank, setBank, loaded: bankLoaded } = useBank();

  useEffect(() => {
    const sync = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const loaded = settingsLoaded && bankLoaded;
  const nav = (label: string, path: string, active: boolean) => (
    <a
      href={`#/${path}`}
      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
        active ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </a>
  );

  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <a href="#/" className="font-semibold tracking-tight flex items-center gap-2">
            <span className="text-lg">🎧</span> Interview Me
          </a>
          <nav className="flex gap-1">
            {nav("Question bank", "", route.name !== "settings")}
            {nav("Settings", "settings", route.name === "settings")}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {!loaded ? null : route.name === "bank" ? (
          <Bank bank={bank} setBank={setBank} />
        ) : route.name === "new" ? (
          <Editor setBank={setBank} settings={settings} />
        ) : route.name === "edit" ? (
          bank.some((q) => q.id === route.id) ? (
            <Editor key={route.id} setBank={setBank} settings={settings} existing={bank.find((q) => q.id === route.id)} />
          ) : (
            <NotFound />
          )
        ) : route.name === "practice" ? (
          <PracticeRoute id={route.id} bank={bank} setBank={setBank} settings={settings} />
        ) : route.name === "settings" ? (
          <SettingsPanel settings={settings} setSettings={setSettings} />
        ) : (
          <ImportShared data={route.data} setBank={setBank} />
        )}
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="card p-8 text-center">
      <p className="text-muted mb-4">That question isn&apos;t in your bank.</p>
      <a className="btn" href="#/">Back to bank</a>
    </div>
  );
}

function PracticeRoute(props: {
  id: string;
  bank: ReturnType<typeof useBank>["bank"];
  setBank: ReturnType<typeof useBank>["setBank"];
  settings: ReturnType<typeof useSettings>["settings"];
}) {
  const q = props.bank.find((x) => x.id === props.id);
  if (!q) return <NotFound />;
  // key resets practice state when switching questions
  return <Practice key={q.id} question={q} setBank={props.setBank} settings={props.settings} />;
}
