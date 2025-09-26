import { useEffect, useState } from "react";

/**
 * Obtiene el conteo de rollos por código y ancho (turno actual, saldo)
 * @param {File[]} files
 * @returns {{ data: {columns: string[], rows: any[][]} | null, loading: boolean, error: string|null }}
 */
export function useCountItems(files) {
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
        const { getTurns, getQuickData } = await import("../DataUtils");
        const turnFilesNames = await getTurns(files);
        if (!turnFilesNames.length) {
          setData(null);
          setLoading(false);
          return;
        }
        const turnFiles = files.filter((f) => turnFilesNames.includes(f.name));
        if (!turnFiles.length) {
          setData(null);
          setLoading(false);
          return;
        }
        const countDf = await getQuickData(turnFiles[0]);
        if (!countDf || countDf.shape[0] === 0) {
          console.warn("[useCountItems] countItems vacío");
          setData(null);
          setLoading(false);
          return;
        }
        setData({ columns: countDf.columns, rows: countDf.values });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, [files]);

  return { data, loading, error };
}
