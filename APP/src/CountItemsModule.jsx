import React, { useMemo, useState } from "react";
import { useCountItems } from "./hooks/useCountItems";
import "./style.css";

export default function CountItemsModule({ files }) {
  const { data, loading, error } = useCountItems(files);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const ALLOWED_WIDTHS = useMemo(
    () => new Set(["1930", "2100", "2250", "2350", "2450"]),
    []
  );
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const { pIdx, wIdx, cIdx } = useMemo(() => {
    const pIdx = columns.indexOf("PAPER_CODE");
    const wIdx = columns.indexOf("WIDTH");
    const countCandidates = ["Cantidad", "COUNT", "count", "ROLL_ID_count"];
    let cIdx = -1;
    for (const k of countCandidates) {
      const i = columns.indexOf(k);
      if (i !== -1) {
        cIdx = i;
        break;
      }
    }
    return { pIdx, wIdx, cIdx };
  }, [columns]);
  const grouped = useMemo(() => {
    const map = new Map();
    if (!rows.length || pIdx === -1 || wIdx === -1 || cIdx === -1) return map;
    for (const row of rows) {
      const paper = String(row[pIdx] ?? "").trim();
      const widthRaw = row[wIdx];
      const width =
        widthRaw === null || widthRaw === undefined
          ? ""
          : String(widthRaw).trim();
      const count = Number(row[cIdx] ?? 0) || 0;
      if (!map.has(paper)) {
        map.set(paper, { total: 0, widths: new Map() });
      }
      const entry = map.get(paper);
      entry.total += count;
      entry.widths.set(width, (entry.widths.get(width) || 0) + count);
    }
    const normalized = new Map();
    for (const [paper, info] of map.entries()) {
      const widthsArr = Array.from(info.widths.entries()).map(([w, cnt]) => ({
        width: w,
        count: cnt,
      }));
      widthsArr.sort((a, b) => {
        const na = parseFloat(a.width);
        const nb = parseFloat(b.width);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.width).localeCompare(String(b.width));
      });
      normalized.set(paper, { total: info.total, widths: widthsArr });
    }
    return normalized;
  }, [rows, pIdx, wIdx, cIdx]);
  const filteredPapers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Array.from(grouped.entries());
    const filtered = q
      ? all.filter(([paper]) => paper.toLowerCase().includes(q))
      : all;
    return filtered.sort((a, b) => a[0].localeCompare(b[0]));
  }, [grouped, query]);
  const totalFiltered = useMemo(() => {
    return filteredPapers.reduce(
      (acc, [, info]) => acc + (info?.total || 0),
      0
    );
  }, [filteredPapers]);

  return (
    <section className="my-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Conteo de rollos por código y ancho (turno actual, saldo)
      </h2>
      {!files?.length ? null : loading ? (
        <div className="my-4 text-slate-700">Cargando conteo de rollos...</div>
      ) : error ? (
        <div className="my-4 text-red-600">Error countItems: {error}</div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Buscar por PAPER_CODE..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {filteredPapers.length} código(s) · Total: {totalFiltered}
            </span>
          </div>

          {/* TODO: lg:grid-cols-5 o lg:grid-cols-4 */}
          <div className="m-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {filteredPapers.map(([paper, info]) => (
              <article
                key={paper}
                className="rounded-md border border-slate-200 bg-white p-2 shadow-sm"
              >
                <header className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm leading-tight font-semibold text-slate-900">
                    {paper}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    Total: {info.total}
                  </span>
                </header>
                <div className="grid grid-cols-5 gap-1.5">
                  {(expanded.has(paper)
                    ? info.widths
                    : info.widths.filter((w) =>
                        ALLOWED_WIDTHS.has(String(w.width))
                      )
                  ).map((w) => (
                    <div
                      key={`${paper}-${w.width}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-1 text-sky-900 ring-1 ring-inset ring-sky-200"
                      title={`WIDTH ${w.width}`}
                    >
                      <span className="text-[11px] font-medium">{w.width}</span>
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">
                        {w.count}
                      </span>
                    </div>
                  ))}
                </div>
                {info.widths.some(
                  (w) => !ALLOWED_WIDTHS.has(String(w.width))
                ) && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(paper)) next.delete(paper);
                          else next.add(paper);
                          return next;
                        })
                      }
                      className="text-[11px] font-medium text-sky-700 hover:text-sky-900"
                    >
                      {expanded.has(paper)
                        ? "Ver menos"
                        : `Ver todos (+${
                            info.widths.filter(
                              (w) => !ALLOWED_WIDTHS.has(String(w.width))
                            ).length
                          })`}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
