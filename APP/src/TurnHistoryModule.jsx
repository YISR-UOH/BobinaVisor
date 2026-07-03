import { Fragment, useMemo, useState } from "react";
import { useTurnHistory } from "./hooks/useTurnHistory";

function formatDisplayDate(dayKey) {
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
}

function formatValue(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES").format(value);
}

export default function TurnHistoryModule({ files }) {
  const { data, loading, error } = useTurnHistory(files);
  const [searchDate, setSearchDate] = useState("");

  const groupedRows = useMemo(() => {
    const filtered = searchDate
      ? data.filter((row) => row.dayKey === searchDate)
      : data;

    const grouped = new Map();
    for (const row of filtered) {
      if (!grouped.has(row.dayKey)) {
        grouped.set(row.dayKey, []);
      }
      grouped.get(row.dayKey).push(row);
    }

    return Array.from(grouped.entries())
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([dayKey, rows]) => ({
        dayKey,
        rows: rows.sort((a, b) => a.timestamp - b.timestamp),
      }));
  }, [data, searchDate]);

  const totalRows = groupedRows.reduce((acc, group) => acc + group.rows.length, 0);

  if (loading) {
    return <div className="my-4 text-slate-700">Cargando histórico...</div>;
  }

  if (error) {
    return <div className="my-4 text-red-600">Error histórico: {error}</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="my-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
        No hay datos históricos para mostrar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Histórico por turno
          </h3>
          <p className="text-sm text-slate-500">
            Agrupado por día y turno, comparando cada snapshot con el anterior.
          </p>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-700">
          <span>Buscar por fecha</span>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Turno</th>
              <th className="px-4 py-3 text-right font-semibold">Generacion</th>
              <th className="px-4 py-3 text-right font-semibold">Consumo</th>
              <th className="px-4 py-3 text-right font-semibold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((group) => (
              <Fragment key={group.dayKey}>
                <tr key={`${group.dayKey}-header`}>
                  <td
                    colSpan={4}
                    className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {formatDisplayDate(group.dayKey)}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${row.dayKey}-${row.turn}-${row.fileName}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                          {row.turn}
                        </span>
                        <span className="text-xs text-slate-400">{row.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-700">
                      {formatValue(row.generacion)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-rose-700">
                      {formatValue(row.consumo)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatValue(row.total)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {totalRows === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No hay resultados para la fecha seleccionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}