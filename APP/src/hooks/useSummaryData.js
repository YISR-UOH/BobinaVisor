import { useEffect, useState } from "react";
import { getLastNDays, countItemsbyDate } from "../DataUtils";

/**
 * Custom hook para obtener el resumen de conteo por fecha y estado 'COMPLETA'.
 * @param {File[]} files
 * @param {number} n - Número de días a considerar (opcional, default 20)
 * @returns {{ data: {columns: string[], rows: any[][]} | null, loading: boolean, error: string|null }}
 */
export function useSummaryData(files, n = 20) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!files || files.length === 0) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const df = await getLastNDays(files, n);
        if (!df || df.shape[0] === 0) {
          setData(null);
          setLoading(false);
          return;
        }
        const summaryDf = countItemsbyDate(df);
        if (!summaryDf || summaryDf.shape[0] === 0) {
          setData(null);
          setLoading(false);
          return;
        }
        setData({ columns: summaryDf.columns, rows: summaryDf.values });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, [files, n]);

  return { data, loading, error };
}
