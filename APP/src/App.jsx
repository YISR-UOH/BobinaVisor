import { useEffect, useRef, useState } from "react";
import CountItemsModule from "./CountItemsModule";
import CheckStatusModule from "./CheckStatusModule";
import SummaryTableModule from "./SummaryTableModule";
import "./style.css";

import { getAllData } from "./DataUtils";
import {
  isFsSupported,
  saveDirectoryHandle,
  getSavedDirectoryHandle,
  verifyPermission,
  readCsvFilesFromDirectory,
} from "./fsAccess";

function App() {
  const [files, setFiles] = useState([]);
  const [n, setN] = useState(240);
  const [path, setPath] = useState("");
  const fileInputRef = useRef(null);
  const state = { files: null, n: null, path: null };
  try {
    const saved_files = localStorage.getItem("bobinavisor:filesMeta");
    if (saved_files) {
      const parsed = JSON.parse(saved_files);
      if (Array.isArray(parsed)) {
        state.files = parsed;
      }
    }
  } catch {}
  try {
    const saved_n = localStorage.getItem("bobinavisor:n");
    if (saved_n) {
      const parsed = JSON.parse(saved_n);
      if (parsed && typeof parsed === "number") {
        state.n = parsed;
      }
    }
  } catch {}
  try {
    const saved_path = localStorage.getItem("bobinavisor:path");
    if (saved_path) {
      const parsed = JSON.parse(saved_path);
      if (parsed && typeof parsed === "string") {
        state.path = parsed;
      }
    }
  } catch {}

  useEffect(() => {
    if (n) {
      try {
        localStorage.setItem("bobinavisor:n", JSON.stringify(n));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
    if (files) {
      try {
        const meta = files.map((f) => ({
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
        }));
        localStorage.setItem("bobinavisor:filesMeta", JSON.stringify(meta));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
    if (path) {
      try {
        localStorage.setItem("bobinavisor:path", JSON.stringify(path));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
  }, [n, files, path]);
  useEffect(() => {
    if (state.n && state.n !== n) {
      if (typeof state.n === "number") setN(state.n);
    }
    if (typeof state.path === "string" && state.path && state.path !== path) {
      setPath(state.path);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage && navigator.storage.persist) {
          await navigator.storage.persist();
        }
      } catch {}
    })();
  }, []);

  const handleFiles = async (fileArr) => {
    const sorted = fileArr
      .filter((f) => f.name.toLowerCase().endsWith(".csv"))
      .sort((a, b) => b.name.localeCompare(a.name));
    const limited = sorted.slice(0, n);
    const names = await getAllData(limited);
    const filtered = limited.filter((f) => names.includes(f.name));
    setFiles(filtered);
  };

  const scanFromSavedDirectory = async () => {
    if (!isFsSupported()) return;
    try {
      const handle = await getSavedDirectoryHandle();
      if (!handle) return;
      const hasPerm = await verifyPermission(handle, false);
      if (!hasPerm) return;
      const allFiles = await readCsvFilesFromDirectory(handle);
      if (allFiles.length > 0) {
        const any = allFiles[0];
        setPath(handle.name || "");
        await handleFiles(allFiles);
      }
    } catch (e) {
      console.warn("No se pudo escanear el directorio guardado", e);
    }
  };

  useEffect(() => {
    let intervalId;
    (async () => {
      if (isFsSupported()) {
        await scanFromSavedDirectory();
        intervalId = window.setInterval(() => {
          scanFromSavedDirectory();
        }, 60 * 60 * 1000);
      }
    })();
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <h1 className="text-xl font-semibold text-slate-900">
              Resumen de Inventario
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Procesa tus CSVs y obtiene un panorama por códigos, anchos y
              estados.
            </p>
          </div>
        </header>
        <div className=" max-w-full px-2 py-2">
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span className="whitespace-nowrap">N archivos a cargar:</span>
              <input
                type="number"
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                min={1}
              />
              <span className="text-xs text-slate-500">
                aprox. {Math.min(100, Math.max(1, Math.floor(n / 24)))} días
              </span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              {isFsSupported() ? (
                <button
                  className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  onClick={async () => {
                    try {
                      const dirHandle = await window.showDirectoryPicker();
                      const ok = await verifyPermission(dirHandle, false);
                      if (!ok) return;
                      await saveDirectoryHandle(dirHandle);
                      setPath(dirHandle.name || "");
                      const allFiles = await readCsvFilesFromDirectory(
                        dirHandle
                      );
                      await handleFiles(allFiles);
                    } catch (e) {
                      console.warn(
                        "Selección de directorio cancelada o fallida",
                        e
                      );
                    }
                  }}
                >
                  Elegir carpeta
                </button>
              ) : (
                <>
                  <label
                    htmlFor="fileUpload"
                    className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Elegir carpeta
                  </label>
                  <input
                    ref={fileInputRef}
                    directory=""
                    webkitdirectory=""
                    type="file"
                    multiple
                    onChange={async (e) => {
                      const fileArr = Array.from(e.target.files);
                      const rel = fileArr[0]?.webkitRelativePath || "";
                      if (rel) {
                        const root = rel.split("/")[0] || "";
                        setPath(root);
                      }
                      await handleFiles(fileArr);
                    }}
                    id="fileUpload"
                    className="hidden"
                  />
                </>
              )}
              <button
                className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
                onClick={async () => {
                  if (isFsSupported()) {
                    await scanFromSavedDirectory();
                  } else {
                    // Reabrir el selector como "refresh" manual
                    if (fileInputRef.current) fileInputRef.current.click();
                  }
                }}
              >
                Actualizar ahora
              </button>
            </div>
          </div>
          {!isFsSupported() && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              Nota: tu navegador no puede recordar la carpeta automáticamente.
              Usa el botón para volver a seleccionar y actualizar.
            </div>
          )}
          <div className="mt-4">
            {files.length > 0 && <CheckStatusModule files={files} />}
            {files.length > 0 && <CountItemsModule files={files} />}
            {files.length > 0 && (
              <SummaryTableModule
                files={files}
                n={Math.min(100, Math.max(1, Math.floor(n / 24)))}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
