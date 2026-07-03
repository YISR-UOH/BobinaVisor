import * as dfd from "danfojs";
import { useEffect, useState } from "react";

function formatDayKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTurnLabel(dateObj) {
  const hour = dateObj.getHours();
  if (hour >= 21 || hour < 6) return "Noche";
  if (hour >= 6 && hour < 13) return "Mañana";
  return "Tarde";
}

function getTurnOrder(turn) {
  if (turn === "Noche") return 0;
  if (turn === "Mañana") return 1;
  if (turn === "Tarde") return 2;
  return 3;
}

function parseFileMeta(file) {
  const rawDate = file.lastModifiedDate || file.lastModified;
  if (!rawDate) return null;

  const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(dateObj.getTime())) return null;

  const turn = getTurnLabel(dateObj);

  return {
    file,
    dayKey: formatDayKey(dateObj),
    turn,
    turnOrder: getTurnOrder(turn),
    timestamp: dateObj.getTime(),
    dateObj,
  };
}

function buildKey(meta) {
  return `${meta.dayKey}|${meta.turn}`;
}

function attachTurn(df, turnValue) {
  const fixed = new dfd.DataFrame(df.values, { columns: df.columns });
  const reset = fixed.resetIndex({ inplace: false });
  reset.addColumn("Turno", Array(reset.shape[0]).fill(turnValue), {
    inplace: true,
  });
  return reset;
}

async function loadSnapshot(file) {
  const { readDataFrame } = await import("../DataUtils");
  return readDataFrame([file]);
}

/**
 * Calcula el histórico de turnos como comparaciones secuenciales entre snapshots.
 * @param {File[]} files
 */
export function useTurnHistory(files) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!files || files.length === 0) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const metas = files
          .map(parseFileMeta)
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (metas.length === 0) {
          if (!cancelled) setData([]);
          if (!cancelled) setLoading(false);
          return;
        }

        const latestByDayAndTurn = new Map();
        for (const meta of metas) {
          latestByDayAndTurn.set(buildKey(meta), meta);
        }

        const ordered = Array.from(latestByDayAndTurn.values()).sort((a, b) => {
          if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
          return a.turnOrder - b.turnOrder;
        });

        const snapshotCache = new Map();
        const getSnapshot = async (file) => {
          const cacheKey = file.name;
          if (!snapshotCache.has(cacheKey)) {
            snapshotCache.set(cacheKey, loadSnapshot(file));
          }
          return snapshotCache.get(cacheKey);
        };

        const rows = [];
        for (let index = 0; index < ordered.length; index += 1) {
          const current = ordered[index];
          const previous = ordered[index - 1] || null;

          let generacion = null;
          let consumo = null;
          let total = null;

          if (previous) {
            const [previousDf, currentDf] = await Promise.all([
              getSnapshot(previous.file),
              getSnapshot(current.file),
            ]);

            if (previousDf?.shape?.[0] > 0 && currentDf?.shape?.[0] > 0) {
              const previousTurn = attachTurn(previousDf, 0);
              const currentTurn = attachTurn(currentDf, 1);
              const { checkChangeStatus } = await import("../DataUtils");
              const result = checkChangeStatus(
                dfd.concat({ dfList: [previousTurn, currentTurn], axis: 0 })
              );
              generacion = Number(result?.[0] ?? 0);
              consumo = Number(result?.[1] ?? 0);
              total = generacion + consumo;
            }
          }

          rows.push({
            dayKey: current.dayKey,
            turn: current.turn,
            timestamp: current.timestamp,
            fileName: current.file.name,
            generacion,
            consumo,
            total,
          });
        }

        if (!cancelled) setData(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  return { data, loading, error };
}