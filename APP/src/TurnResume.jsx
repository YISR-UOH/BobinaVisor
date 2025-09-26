/**
 * Se busca mostrar el comportamiento del turno turnName, dado el nombre del turno y los archivos cargados.
 *
 *
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./style.css";

export default function TurnResume({ turnName, files, flag }) {
  const [data, setData] = useState(null);
  const [total, setTotal] = useState(0);
  // obtener info del turno actual y anterior
  const getTurnData = (turnName) => {
    if (turnName === "") {
      return null;
    } else if (turnName === "Mañana") {
      return { start: 6, end: 13 };
    } else if (turnName === "Tarde") {
      return { start: 13, end: 21 };
    } else if (turnName === "Noche") {
      return { start: 21, end: 6 };
    }
    return null;
  };
  useEffect(() => {
    if (data) {
      setTotal(data[0] + data[1]);
    } else {
      setTotal(0);
    }
  }, [data]);
  const badgeClasses = useMemo(() => {
    if (total > 0)
      return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200";
    if (total < 0)
      return "bg-green-100 text-green-800 ring-1 ring-inset ring-green-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }, [total]);

  const heroBoxClasses = useMemo(() => {
    if (total > 0)
      return "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200";
    if (total < 0)
      return "bg-green-50 text-green-800 ring-1 ring-inset ring-green-200";
    return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200";
  }, [total]);
  const turnData = useCallback(
    (files) => {
      if (!files || files.length === 0) {
        return null;
      }
      // ordenar los archivos por fecha de modificacion descendiente
      const sortedFiles = files.slice().sort((a, b) => {
        const dateA = a.lastModifiedDate || a.lastModified;
        const dateB = b.lastModifiedDate || b.lastModified;
        return dateB - dateA;
      });
      // buscar el primer y ultimo archivo del turno, del ultimo dia
      const turnInfo = getTurnData(turnName);
      if (!turnInfo) return null;
      const { start, end } = turnInfo;
      const turnFiles = [];
      for (const file of sortedFiles) {
        const lastModified = file.lastModifiedDate || file.lastModified;
        if (!lastModified) continue;
        const dateObj = new Date(lastModified);
        if (isNaN(dateObj.getTime())) continue;
        const hour = dateObj.getHours();
        if (start < end) {
          // turno diurno
          if (hour >= start && hour < end) {
            turnFiles.push(file);
          }
        } else {
          // turno nocturno
          if (hour >= start || hour < end) {
            turnFiles.push(file);
          }
        }
      }
      // solo retornar los archivos del ultimo dia del turno
      if (turnFiles.length === 0) return null;
      const lastDay = new Date(
        turnFiles[0].lastModifiedDate || turnFiles[0].lastModified
      ).getDate();
      const filteredTurnFiles = turnFiles.filter((file) => {
        const dateObj = new Date(file.lastModifiedDate || file.lastModified);
        return dateObj.getDate() === lastDay;
      });
      if (filteredTurnFiles.length > 0) {
        return filteredTurnFiles;
      }
      return turnFiles;
    },
    [turnName]
  );
  // Memoize turn files so reference is stable across renders for useEffect deps
  const turnFiles = useMemo(() => turnData(files), [files, turnData]);

  // Run async diff only when the relevant files for the current turn change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (turnFiles && turnFiles.length >= 2) {
        const { getTurnResume } = await import("./DataUtils");
        const result = await getTurnResume(turnFiles);
        if (!cancelled) setData(result);
      } else {
        if (!cancelled) setData(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [turnFiles]);
  const hasRows = data && data.length > 0;
  if (!data) return null;
  return (
    <section className="w-full h-full flex">
      {!hasRows ? (
        <div className="mt-3 text-slate-600">
          No hay datos de cambios disponibles.
        </div>
      ) : (
        <article className="w-full h-full rounded-md border border-slate-200 bg-white p-2 shadow-sm flex flex-col">
          <div className="mt-1 flex justify-end">
            <span
              className={`inline-flex items-center rounded-full text-[10px] font-medium px-1 ${badgeClasses}`}
            >
              Diferencia de Saldo
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {flag
              ? "Resumen Turno Actual: " + (turnName || "N/A")
              : "Resumen Turno Anterior: " + (turnName || "N/A")}
          </h2>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-sky-50 px-2 py-1 text-sky-900 ring-1 ring-inset ring-sky-200">
              <span className="block text-[11px] font-medium">Generacion</span>
              <span className="text-base font-semibold">
                {Number(data[0] || 0)}
              </span>
            </div>
            <div className="rounded-md bg-sky-50 px-2 py-1 text-sky-900 ring-1 ring-inset ring-sky-200">
              <span className="block text-[11px] font-medium">Consumo</span>
              <span className="text-base font-semibold">
                {Number(data[1] || 0)}
              </span>
            </div>
          </div>
          <div className="items-center justify-center mt-1">
            <div
              className={`w-full rounded-md px-3 py-2 text-center ${heroBoxClasses}`}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide">
                Total
              </div>
              <div className="mt-1 text-4xl font-extrabold tabular-nums">
                {total}
              </div>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
