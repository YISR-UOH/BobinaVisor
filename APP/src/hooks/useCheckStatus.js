import { useEffect, useState } from "react";

/**
 * Obtiene el conteo de rollos por código y ancho (turno actual, saldo)
 * @param {File[]} files
 * @returns []
 */
export function useCheckStatus(files) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnInfo, setTurnInfo] = useState("");

  const updateTurnInfo = async (file) => {
    const lastModified = file.lastModifiedDate || file.lastModified;
    if (!lastModified) return null;
    const dateObj = new Date(lastModified);
    if (isNaN(dateObj.getTime())) return null;
    const hour = dateObj.getHours();
    let turno = "";
    if (hour >= 21 || hour < 6) {
      turno = "Noche";
    } else if (hour >= 6 && hour < 13) {
      turno = "Mañana";
    } else if (hour >= 13 && hour < 21) {
      turno = "Tarde";
    }
    const date = `${String(dateObj.getDate()).padStart(2, "0")}/${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}/${dateObj.getFullYear()} ${String(
      dateObj.getHours()
    ).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
    return { turno, date };
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
        const { getTurns, readDataFrame, addTurn, checkChangeStatus } =
          await import("../DataUtils");
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

        setData(countDf);
        setLoading(false);
      } catch (err) {
        setError(err.message + " " + err.stack);
        setLoading(false);
      }
    })();
  }, [files]);

  return { data, loading, error, turnInfo };
}
