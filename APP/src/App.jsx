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
  const [totalItems, setTotalItems] = useState(0);
  const [actualTurn, setActualTurn] = useState(null);
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
    // Filtrar a CSV en un solo lugar para ambos flujos
    const csvOnly = fileArr.filter((f) =>
      f.name.toLowerCase().endsWith(".csv")
    );
    const names = await getAllData(csvOnly);
    const filtered = csvOnly.filter((f) => names.includes(f.name));
    setFiles(filtered);
  };

  const scanFromSavedDirectory = async () => {
    if (!isFsSupported()) return;
    try {
      const handle = await getSavedDirectoryHandle();
      if (!handle) return;
      const hasPerm = await verifyPermission(handle, false);
      if (!hasPerm) return;
      const allFiles = await readCsvFilesFromDirectory(handle, {
        max: n,
        sortBy: "lastModified",
        order: "desc",
      });
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
              Resumen de Inventario de bobinas.
            </h1>
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
                        dirHandle,
                        { max: n, sortBy: "lastModified", order: "desc" }
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
                      let fileArr = Array.from(e.target.files);
                      const rel = fileArr[0]?.webkitRelativePath || "";
                      if (rel) {
                        const root = rel.split("/")[0] || "";
                        setPath(root);
                      }
                      fileArr = fileArr
                        .sort((a, b) => {
                          const d =
                            (b.lastModified || 0) - (a.lastModified || 0);
                          return d !== 0 ? d : b.name.localeCompare(a.name);
                        })
                        .slice(0, n);
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
            <div className="flex flex-wrap items-stretch gap-3">
              {files.length > 0 && (
                <div className="w-full sm:w-80 flex-none h-full">
                  <CheckStatusModule
                    files={files}
                    setActualTurn={setActualTurn}
                  />
                </div>
              )}
              {totalItems > 0 && actualTurn && (
                <article className="w-full sm:w-80 flex-none h-full rounded-md border border-slate-200 bg-white p-2 shadow-sm flex flex-col">
                  <div className="mt-1 flex justify-end">
                    <span className="inline-flex items-center rounded-full text-[10px] font-medium px-1 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                      Total de Saldos
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Turno Actual: {actualTurn?.turno || "N/A"}
                  </h2>
                  <div className="text-sm text-slate-400">
                    {actualTurn?.date ? actualTurn.date.toLocaleString() : null}
                    {actualTurn?.name ? ` (${actualTurn.name})` : null}
                  </div>
                  <div className="items-center justify-center mt-1">
                    <div className="w-full rounded-md px-3 py-2 text-center bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200">
                      <div className="text-[11px] font-medium uppercase tracking-wide">
                        Total
                      </div>
                      <div className="mt-1 text-4xl font-extrabold tabular-nums">
                        {totalItems || 0}
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </div>

            {files.length > 0 && (
              <CountItemsModule files={files} setTotalItems={setTotalItems} />
            )}
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
