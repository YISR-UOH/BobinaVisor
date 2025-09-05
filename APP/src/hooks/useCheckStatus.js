import { useEffect, useState } from "react";
import {
  getTurns,
  readDataFrame,
  addTurn,
  checkChangeStatus,
} from "../DataUtils";

/**
 * Obtiene el conteo de rollos por código y ancho (turno actual, saldo)
 * @param {File[]} files
 * @returns {{ data: {columns: string[], rows: any[][]} | null, loading: boolean, error: string|null }}
 */
export function useCheckStatus(files) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnInfo, setTurnInfo] = useState("");

  const updateTurnInfo = async (nameFile) => {
    const nameParts = nameFile.name.split(".")[0].split("-");
    if (nameParts.length === 2) {
      const datePart = nameParts[0];
      const timePart = nameParts[1];
      if (datePart.length === 8 && timePart.length === 6) {
        const year = datePart.slice(0, 4);
        const month = datePart.slice(4, 6);
        const day = datePart.slice(6, 8);
        const hour = parseInt(timePart.slice(0, 2), 10);
        const minute = timePart.slice(2, 4);
        const second = timePart.slice(4, 6);
        let turno = "";
        if (hour >= 21 || hour < 6) {
          turno = "Mañana";
        } else if (hour >= 6 && hour < 13) {
          turno = "Tarde";
        } else if (hour >= 13 && hour < 21) {
          turno = "Noche";
        }

        const date = new Date(
          `${year}-${month}-${day}T${String(hour).padStart(
            2,
            "0"
          )}:${minute}:${second}`
        );
        return { turno, date };
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

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
        // guardar la info de ambos archivos de turno
        const turnInfo1 = await updateTurnInfo(turnFiles[0]);
        const turnInfo2 =
          turnFiles.length > 1 ? await updateTurnInfo(turnFiles[1]) : null;
        setTurnInfo({
          turno: turnInfo1 ? turnInfo1.turno : "",
          date: turnInfo1 ? turnInfo1.date : null,
          name: turnFiles[0].name,
          previousTurno: turnInfo2 ? turnInfo2.turno : "",
          previousDate: turnInfo2 ? turnInfo2.date : null,
          previousName: turnFiles.length > 1 ? turnFiles[1].name : "",
        });
        let df = await readDataFrame(turnFiles);

        if (!df || df.shape[0] === 0) {
          console.warn("[useCountItems] DataFrame vacío tras readDataFrame");
          setData(null);
          setLoading(false);
          return;
        }
        df = addTurn(df);
        const countDf = checkChangeStatus(df);
        if (!countDf || countDf.shape[0] === 0) {
          console.warn("[useCountItems] countItems vacío");
          setData(null);
          setLoading(false);
          return;
        }
        setData({ columns: countDf.columns, rows: countDf.values });
        setLoading(false);
      } catch (err) {
        setError(err.message + " " + err.stack);
        setLoading(false);
      }
    })();
  }, [files]);

  return { data, loading, error, turnInfo };
}
