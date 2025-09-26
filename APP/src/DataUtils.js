import * as dfd from "danfojs";
import Papa from "papaparse";

/**
 * Cuenta la cantidad de rollos por fecha y estado 'COMPLETA'.
 * Agrupa por fecha (solo día) y 'COMPLETA'.
 * @param {dfd.DataFrame} df
 * @returns {dfd.DataFrame}
 */
export function countItemsbyDate(df) {
  // Asegurar que 'Date created' es tipo Date y 'COMPLETA' es string
  let dateVals = df["Date created"].values.map((d) => {
    const dt = d instanceof Date ? d : new Date(d);
    // Solo la parte de la fecha (YYYY-MM-DD)
    return formatLocalDay(dt);
  });
  let completaVals = df["COMPLETA"].values.map((v) => String(v));
  // Crear DataFrame auxiliar para agrupar
  const aux = new dfd.DataFrame({
    "Date created": dateVals,
    COMPLETA: completaVals,
  });
  const grouped = aux.groupby(["Date created", "COMPLETA"]);
  const counted = grouped.col(["COMPLETA"]).count();
  return counted.rename({ COMPLETA_count: "Cantidad" });
}
/**
 * Marca los cambios de estado 'COMPLETA' entre turnos, similar a checkChangeStatus de Python.
 * @param {dfd.DataFrame} df
 * @returns {number[]} [generados, consumidos]
 */
export function checkChangeStatus(df) {
  if (!df || df.shape[0] === 0) {
    return new dfd.DataFrame({ "Cambio Completa": [1, -1], Cantidad: [0, 0] });
  }
  // Validación de columnas requeridas
  const required = ["ROLL_ID", "Turno", "COMPLETA"];
  for (const col of required) {
    if (!df.columns.includes(col)) {
      console.warn(`[checkChangeStatus] Falta columna '${col}'`);
      return new dfd.DataFrame({
        "Cambio Completa": [1, -1],
        Cantidad: [0, 0],
      });
    }
  }

  // Mapas por turno para acceso rápido sin setIndex (evita errores cuando hay DF vacío)
  const completaByTurn1 = new Map(); // ROLL_ID -> COMPLETA
  const completaByTurn0 = new Map(); // ROLL_ID -> COMPLETA
  const idxMap = {}; // `${ROLL_ID}_${Turno}` -> índice original
  for (let i = 0; i < df.shape[0]; i++) {
    const rid = df.at(i, "ROLL_ID");
    const turno = Number(df.at(i, "Turno"));
    const completa = df.at(i, "COMPLETA");
    idxMap[`${rid}_${turno}`] = i;
    if (turno === 1) {
      completaByTurn1.set(rid, completa);
    } else if (turno === 0) {
      completaByTurn0.set(rid, completa);
    }
  }

  const rollIds_1 = Array.from(completaByTurn1.keys());
  const rollIds_0 = Array.from(completaByTurn0.keys());
  let g = 0;
  let c = 0;
  // Para cada roll_id en turno 1
  for (let i = 0; i < rollIds_1.length; i++) {
    const roll_id = rollIds_1[i];
    const completa_1 = completaByTurn1.get(roll_id);
    if (!completaByTurn0.has(roll_id)) {
      if (completa_1 === "Saldo") {
        g = g + 1;
      }
    } else {
      const completa_0 = completaByTurn0.get(roll_id);
      if (completa_1 === "Saldo" && completa_0 === "Completa") {
        g = g + 1;
      }
    }
  }

  // Para cada roll_id en turno 0
  for (let i = 0; i < rollIds_0.length; i++) {
    const roll_id = rollIds_0[i];
    if (!completaByTurn1.has(roll_id)) {
      const completa_0 = completaByTurn0.get(roll_id);
      if (completa_0 === "Saldo") {
        c = c - 1;
      }
    }
  }

  return [g, c];
}

/**
 * Devuelve un DataFrame con los turnos etiquetados usando los archivos seleccionados (turno actual y anterior).
 * Equivalente a get_inventory_current_and_previous_turn de Python.
 * @param {File[]} files
 * @returns {Promise<dfd.DataFrame>} DataFrame con columna 'Turno'
 */
export async function getInventoryCurrentAndPreviousTurn(files) {
  // files: lista de File (input type="file")
  const turnFilesNames = await getTurns(files);
  if (!turnFilesNames.length) return new dfd.DataFrame([]);
  const turnFiles = files.filter((f) => turnFilesNames.includes(f.name));
  if (!turnFiles.length) return new dfd.DataFrame([]);
  let df = await readDataFrame(turnFiles);
  if (!df || df.shape[0] === 0) return df;
  df = addTurn(df);
  return df;
}

/**
 * Lee todos los archivos CSV en la carpeta especificada y devuelve un array con el nombre del último archivo.
 * @param {File[]} files - Lista de archivos File (input type="file" multiple)
 * @returns {Promise<string[]>} - Nombres de archivos seleccionados (uno por día)
 */
export async function getAllData(files) {
  // Extraer fecha de nombre de archivo: YYYYMMDD-HHMMSS.csv
  const fileInfos = sortFilesByLastModified(files);
  return [...new Set(fileInfos.map((f) => f.name))];
}

/**
 * Parsea fecha y hora desde nombre de archivo tipo YYYYMMDD-HHMMSS
 * @param {string} name
 * @returns {Date}
 */
// function parseDateTimeFromFilename(name) {
//   // name: '20250821-230324'
//   const [date, time] = name.split("-");
//   const year = +date.slice(0, 4);
//   const month = +date.slice(4, 6) - 1;
//   const day = +date.slice(6, 8);
//   const hour = +time.slice(0, 2);
//   const min = +time.slice(2, 4);
//   const sec = +time.slice(4, 6);
//   return new Date(year, month, day, hour, min, sec);
// }

// Formatea una fecha a YYYY-MM-DD en hora local (evita desplazamientos por UTC)
function formatLocalDay(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ordena los archivos por lastModifiedDate
 * @param {File[]} files
 * @returns {File[]} archivos ordenados por fecha de modificacion descendente
 */
export function sortFilesByLastModified(files) {
  return files
    .filter((f) => f.name.toLowerCase().endsWith(".csv"))
    .map((f) => {
      const dt = new Date(f.lastModified);
      return {
        file: f,
        name: f.name,
        date: dt,
        // usar fecha completa YYYY-MM-DD en lugar de número de día de semana
        day: formatLocalDay(dt),
        hour: dt.getHours(),
        minute: dt.getMinutes(),
        lastModified: f.lastModified,
      };
    })
    .sort((a, b) => {
      const dateA = a.lastModified;
      const dateB = b.lastModified;
      return dateB - dateA;
    });
}

/**
 * Obtiene los archivos correspondientes al turno actual y anterior.
 * @param {File[]} files
 * @returns {Promise<string[]>} - Nombres de archivos del turno actual y anterior
 */
export async function getTurns(files) {
  // ordenar y filtrar por fecha de ultima modificacion

  const fileInfos = sortFilesByLastModified(files);

  if (fileInfos.length === 0) return [];
  const actual = fileInfos[0];
  // Definir turnos
  // 21 a 6 -- mañana, 6 a 13 -- tarde, 13 a 21 -- noche
  let turnoAnterior;
  if (actual.hour >= 21) {
    turnoAnterior = fileInfos.find((f) => f.day === actual.day && f.hour < 21);
  } else if (actual.hour <= 6) {
    const prevDay = new Date(actual.date);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = formatLocalDay(prevDay);
    turnoAnterior = fileInfos.find((f) => f.day === prevDayStr && f.hour < 21);
  } else if (actual.hour < 13) {
    turnoAnterior = fileInfos.find((f) => f.day === actual.day && f.hour < 6);
  } else {
    turnoAnterior = fileInfos.find((f) => f.day === actual.day && f.hour < 13);
  }
  if (!turnoAnterior && fileInfos.length > 1) {
    turnoAnterior = fileInfos[1];
  }
  return [actual.name, turnoAnterior ? turnoAnterior.name : null].filter(
    Boolean
  );
}

/**
 * Obtiene los datos de 1 solo archivo (el más reciente) para vista rápida.
 * @param {File[]} file
 * @returns {Promise<dfd.DataFrame>}
 */
export async function getQuickData(file) {
  if (!file || file.length === 0) return new dfd.DataFrame([]);
  let df = await file.text();
  df = Papa.parse(df, { header: true, skipEmptyLines: true });
  df = df.data.map((row) => ({
    ...row,
  }));
  df = df.filter(
    (row) =>
      row["LOCATION"] !== "ULOG" &&
      row["LOCATION"] !== "DPBQ" &&
      row["ESTADO"] === "STOCK" &&
      row["DEPO"] === "Planta SFM" &&
      row["COMPLETA"] === "Saldo"
  );
  df = df.map((row) => {
    return {
      ROLL_ID: row["ROLL_ID"],
      PAPER_CODE: row["PAPER_CODE"],
      WIDTH: row["WIDTH"],
      ESTADO: row["ESTADO"],
      COMPLETA: row["COMPLETA"],
    };
  });
  const requiredCols = ["PAPER_CODE", "WIDTH", "ROLL_ID"];

  const filtered = new dfd.DataFrame(df).loc({
    columns: requiredCols.filter((col) =>
      new dfd.DataFrame(df).columns.includes(col)
    ),
  });
  if (filtered.shape[0] === 0) {
    return new dfd.DataFrame([], {
      columns: ["PAPER_CODE", "WIDTH", "Cantidad"],
    });
  }

  const grouped = filtered.groupby(["PAPER_CODE", "WIDTH"]);
  const counted = grouped.col(["ROLL_ID"]).count();
  // Renombrar la columna de conteo a 'Cantidad'
  return counted.rename({ ROLL_ID_count: "Cantidad" });
}

/**
 * Lee y concatena los archivos CSV seleccionados, filtrando según reglas de negocio.
 * @param {File[]} files - Archivos File
 * @returns {Promise<dfd.DataFrame>} - DataFrame concatenado y filtrado
 */
export async function readDataFrame(files) {
  const dfs = [];
  for (const file of files) {
    try {
      const text = await file.text();
      // Parsear el CSV con PapaParse
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data || parsed.data.length === 0) continue;
      // Agregar columna de fecha desde el nombre del archivo

      const dateCreated = file.lastModifiedDate || file.lastModified;
      if (!dateCreated) continue;
      // Asegurar que dateCreated es un objeto Date válido
      let dateObj =
        dateCreated instanceof Date ? dateCreated : new Date(dateCreated);
      if (isNaN(dateObj.getTime())) continue;
      // formato local YYYY-MM-DD HH:MM:SS
      dateObj = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        dateObj.getHours(),
        dateObj.getMinutes(),
        dateObj.getSeconds()
      );
      //
      let dataWithDate = parsed.data.map((row) => ({
        ...row,
        "Date created": dateObj,
      }));
      // Filtrar según reglas de negocio
      dataWithDate = dataWithDate.filter(
        (row) =>
          row["LOCATION"] !== "ULOG" &&
          row["LOCATION"] !== "DPBQ" &&
          row["ESTADO"] === "STOCK" &&
          row["DEPO"] === "Planta SFM"
      );
      // Seleccionar columnas
      dataWithDate = dataWithDate.map((row) => {
        return {
          ROLL_ID: row["ROLL_ID"],
          PAPER_CODE: row["PAPER_CODE"],
          WIDTH: row["WIDTH"],
          ESTADO: row["ESTADO"],
          COMPLETA: row["COMPLETA"],
          "Date created": row["Date created"],
        };
      });
      if (dataWithDate.length > 0) {
        dfs.push(new dfd.DataFrame(dataWithDate));
      }
    } catch (e) {
      console.error(`Error leyendo archivo ${file.name}:`, e);
      continue;
    }
  }
  if (dfs.length === 0) {
    return new dfd.DataFrame([], {
      columns: [
        "ROLL_ID",
        "PAPER_CODE",
        "WIDTH",
        "ESTADO",
        "COMPLETA",
        "Date created",
      ],
    });
  }
  return dfd.concat({ dfList: dfs, axis: 0 });
}

/**
 * Devuelve un DataFrame con los datos de los últimos n días.
 * @param {File[]} files
 * @param {number} n
 * @returns {Promise<dfd.DataFrame>}
 */
export async function getLastNDays(files, n = 20) {
  let allData = await getAllData(files);
  // obtener los archivos mas recientes por dia
  allData = sortFilesByLastModified(
    files.filter((f) => allData.includes(f.name))
  );
  if (allData.length === 0) return new dfd.DataFrame([]);

  // Use a Map keyed by day to keep the single most recent file per day
  const byDay = new Map();
  for (const info of allData) {
    const prev = byDay.get(info.day);
    if (!prev) {
      byDay.set(info.day, info);
    } else if (info.lastModified > prev.lastModified) {
      byDay.set(info.day, info);
    }
    if (byDay.size >= n) break; // limit days
  }
  const selectedFiles = Array.from(byDay.values())
    .sort((a, b) => b.lastModified - a.lastModified)
    .map((fi) => files.find((f) => f.name === fi.name))
    .filter(Boolean);
  // ordenar selectedFiles por fecha descendente
  selectedFiles.sort((a, b) => b.lastModified - a.lastModified);
  if (selectedFiles.length === 0) return new dfd.DataFrame([]);
  // leer y concatenar
  const dfs = [];
  for (const file of selectedFiles) {
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data || parsed.data.length === 0) continue;
      const dateCreated = file.lastModifiedDate || file.lastModified;
      if (!dateCreated) continue;
      // Asegurar que dateCreated es un objeto Date válido
      let dateObj =
        dateCreated instanceof Date ? dateCreated : new Date(dateCreated);
      if (isNaN(dateObj.getTime())) continue;
      // formato local YYYY-MM-DD HH:MM:SS
      dateObj = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
      );
      let dataWithDate = parsed.data.map((row) => ({
        ...row,
        "Date created": dateObj,
      }));
      dataWithDate = dataWithDate.filter(
        (row) =>
          row["LOCATION"] !== "ULOG" &&
          row["LOCATION"] !== "DPBQ" &&
          row["ESTADO"] === "STOCK" &&
          row["DEPO"] === "Planta SFM"
      );

      dataWithDate = dataWithDate.map((row) => {
        return {
          ROLL_ID: row["ROLL_ID"],
          PAPER_CODE: row["PAPER_CODE"],
          WIDTH: row["WIDTH"],
          ESTADO: row["ESTADO"],
          COMPLETA: row["COMPLETA"],
          "Date created": row["Date created"],
        };
      });
      if (dataWithDate.length > 0) {
        dfs.push(new dfd.DataFrame(dataWithDate));
      }
    } catch (e) {
      console.error(`Error leyendo archivo ${file.name}:`, e);
      continue;
    }
  }
  if (dfs.length === 0) {
    return new dfd.DataFrame([], {
      columns: [
        "ROLL_ID",
        "PAPER_CODE",
        "WIDTH",
        "ESTADO",
        "COMPLETA",
        "Date created",
      ],
    });
  }
  return dfd.concat({ dfList: dfs, axis: 0 });
}

/**
 * Agrega columna 'Cambio Completa' al DataFrame, indicando cambios de estado entre turnos.
 * @param {dfd.DataFrame} df
 * @returns {dfd.DataFrame}
 */
export function addTurn(df) {
  // Fuerza DataFrame limpio para evitar corrupción de índices/valores
  df = new dfd.DataFrame(df.values, { columns: df.columns });
  if (!df.columns.includes("Date created")) {
    console.error(
      "[addTurn] La columna 'Date created' no existe en el DataFrame",
      df.columns
    );
    throw new Error("La columna 'Date created' no existe en el DataFrame");
  }
  // Filtrar filas con 'Date created' inválido
  let validMask = df["Date created"].values.map((d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return !isNaN(dt.getTime());
  });
  if (validMask.some((v) => !v)) {
    console.warn(
      "[addTurn] Filas con 'Date created' inválido serán eliminadas:",
      validMask.filter((v) => !v).length
    );
    df = df.loc({ rows: validMask });
  }
  const dateValues = df["Date created"].values;
  if (!dateValues || dateValues.length === 0) {
    console.error(
      "[addTurn] La columna 'Date created' está vacía tras limpiar"
    );
    throw new Error("La columna 'Date created' está vacía");
  }
  // Asegura que todos los valores sean Date
  const dateObjs = dateValues.map((d) => (d instanceof Date ? d : new Date(d)));
  const dateMax = dateObjs.reduce((max, d) => (d > max ? d : max), dateObjs[0]);
  let turno = dateObjs.map((d) => (d.getTime() === dateMax.getTime() ? 1 : 0));
  // Forzar tipo Number y limpiar NaN
  turno = turno.map((v) => (v === 1 ? 1 : 0));
  if (turno.length !== df.shape[0]) {
    console.error(
      `[addTurn] Desajuste de longitud tras limpiar: filas=${df.shape[0]}, turno=${turno.length}`
    );
    throw new Error("Desajuste de longitud al agregar columna 'Turno'");
  }
  // Reiniciar índices antes de agregar la columna
  df = df.resetIndex({ inplace: false });
  df.addColumn("Turno", turno, { inplace: true });
  return df;
}

/**
 * Cuenta rollos por PAPER_CODE y WIDTH para el turno actual con COMPLETA == 'Saldo'.
 * @param {dfd.DataFrame} df
 * @returns {dfd.DataFrame}
 */
export function countItems(df) {
  // Filtrar primero por 'COMPLETA' == 'Saldo'
  let filtered = df;

  const maskSaldo = filtered["COMPLETA"].values.map(
    (v) => String(v).trim().toLowerCase() === "saldo"
  );
  const maskTurno = filtered["Turno"].values.map((v) => Number(v) === 1);
  filtered = filtered.loc({ rows: maskSaldo.map((m, i) => m && maskTurno[i]) });

  // Agrupar y contar
  if (filtered.shape[0] === 0) {
    return new dfd.DataFrame([], {
      columns: ["PAPER_CODE", "WIDTH", "Cantidad"],
    });
  }
  // Verificar columnas para agrupar y contar
  const requiredCols = ["PAPER_CODE", "WIDTH", "ROLL_ID"];
  for (const col of requiredCols) {
    if (!filtered.columns.includes(col)) {
      console.warn(`[countItems] Falta columna '${col}'`);
      return new dfd.DataFrame({
        columns: ["PAPER_CODE", "WIDTH", "Cantidad"],
      });
    }
  }
  const grouped = filtered.groupby(["PAPER_CODE", "WIDTH"]);
  const counted = grouped.col(["ROLL_ID"]).count();
  // Renombrar la columna de conteo a 'Cantidad'
  return counted.rename({ ROLL_ID_count: "Cantidad" });
}

/**
 * retorna la diferencia entre 2 archivos.
 */

export async function getTurnResume(files) {
  // obtener el archivo mas reciente y el mas antiguo
  if (!files || files.length === 0) {
    return null;
  }
  // ordenar los archivos por fecha de modificacion descendiente
  const sortedFiles = files.slice().sort((a, b) => {
    const dateA = a.lastModifiedDate || a.lastModified;
    const dateB = b.lastModifiedDate || b.lastModified;
    return dateB - dateA;
  });
  const latestFile = sortedFiles[0];
  const oldestFile = sortedFiles[sortedFiles.length - 1];
  // leer los archivos y obtener los dataframes
  const readFile = async (file) => {
    let df = await file.text();
    df = Papa.parse(df, { header: true, skipEmptyLines: true });
    df = df.data.map((row) => ({
      ...row,
    }));
    df = df.filter(
      (row) =>
        row["LOCATION"] !== "ULOG" &&
        row["LOCATION"] !== "DPBQ" &&
        row["ESTADO"] === "STOCK" &&
        row["DEPO"] === "Planta SFM" &&
        row["COMPLETA"] === "Saldo"
    );
    df = df.map((row) => {
      return {
        ROLL_ID: row["ROLL_ID"],
        PAPER_CODE: row["PAPER_CODE"],
        WIDTH: row["WIDTH"],
        ESTADO: row["ESTADO"],
        COMPLETA: row["COMPLETA"],
      };
    });
    return new dfd.DataFrame(df);
  };
  const dfLatest = await readFile(latestFile);
  const dfOldest = await readFile(oldestFile);
  if (dfLatest.shape[0] === 0 || dfOldest.shape[0] === 0) {
    return null;
  }
  // agregar columna 'Turno' a ambos dataframes, latest = 1, oldest = 0
  const addTurnColumn = (df, turno) => {
    const turnoCol = Array(df.shape[0]).fill(turno);
    df = df.resetIndex({ inplace: false });
    df.addColumn("Turno", turnoCol, { inplace: true });
    return df;
  };
  const dfLatestTurn = addTurnColumn(dfLatest, 1);
  const dfOldestTurn = addTurnColumn(dfOldest, 0);
  // concatenar ambos dataframes
  const dfConcat = dfd.concat({
    dfList: [dfLatestTurn, dfOldestTurn],
    axis: 0,
  });
  // contar los cambios de estado 'COMPLETA' entre turnos
  const result = checkChangeStatus(dfConcat);
  return result; // [generados, consumidos]
}
