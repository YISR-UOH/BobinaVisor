import { useCheckStatus } from "./hooks/useCheckStatus";
import { useEffect, useMemo, useState } from "react";
import "./style.css";

export default function CheckStatusModule({ files }) {
  const { data, loading, error } = useCheckStatus(files);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (data && data.rows) {
      const sum = data.rows.reduce(
        (acc, row) => acc + Number(row?.[0] * row?.[1] || 0),
        0
      );
      setTotal(sum);
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

  if (!files?.length) return null;
  if (loading)
    return (
      <div className="my-4 text-slate-700">Cargando conteo de rollos...</div>
    );
  if (error)
    return <div className="my-4 text-red-600">Error CheckStatus: {error}</div>;
  if (!data) return null;

  const hasRows = data?.rows?.length > 0;

  return (
    <section className="my-6">
      <h2 className="text-lg font-semibold text-slate-900">Saldo generado</h2>

      {!hasRows ? (
        <div className="mt-3 text-slate-600">
          No hay datos de cambios disponibles.
        </div>
      ) : (
        <article className="mt-2 w-full max-w-xs rounded-md border border-slate-200 bg-white p-2 shadow-sm flex flex-col">
          <div className="mt-2 flex justify-end">
            <span
              className={`inline-flex items-center rounded-full text-[10px] font-medium ${badgeClasses}`}
            >
              Saldo
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-sky-50 px-2 py-1 text-sky-900 ring-1 ring-inset ring-sky-200">
              <span className="block text-[11px] font-medium">Generacion</span>
              <span className="text-base font-semibold">
                {Number(data.rows?.[0]?.[0] * data.rows?.[0]?.[1] || 0)}
              </span>
            </div>
            <div className="rounded-md bg-sky-50 px-2 py-1 text-sky-900 ring-1 ring-inset ring-sky-200">
              <span className="block text-[11px] font-medium">Consumo</span>
              <span className="text-base font-semibold">
                {Number(data.rows?.[1]?.[0] * data.rows?.[1]?.[1] || 0)}
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
