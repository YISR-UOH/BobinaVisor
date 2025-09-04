import { useEffect, useState } from "react";
import { getTurns, readDataFrame, addTurn, countItems } from "../DataUtils";
import * as dfd from "danfojs";

/**
 * Custom hook para obtener el conteo de rollos por código y ancho (turno actual, saldo)
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
        let df = await readDataFrame(turnFiles);
        if (!df || df.shape[0] === 0) {
          console.warn("[useCountItems] DataFrame vacío tras readDataFrame");
          setData(null);
          setLoading(false);
          return;
        }
        df = addTurn(df);
        const countDf = countItems(df);
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
