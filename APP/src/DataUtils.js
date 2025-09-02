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
    return dt.toISOString().slice(0, 10);
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
 * @returns {dfd.DataFrame} DataFrame con columnas 'Cambio Completa' y 'Cantidad'
 */
export function checkChangeStatus(df) {
  // Crear copias filtradas por turno y con índice ROLL_ID
  const df_turno_1 = df
    .query(df["Turno"].eq(1))
    .setIndex({ column: "ROLL_ID", drop: false });
  const df_turno_0 = df
    .query(df["Turno"].eq(0))
    .setIndex({ column: "ROLL_ID", drop: false });

  // Inicializar columna 'Cambio Completa' en 0
  let cambioCompleta = Array(df.shape[0]).fill(0);
  const rollIds_1 = df_turno_1.index;
  const rollIds_0 = df_turno_0.index;

  // Mapas para acceso rápido
  const idxMap = {};
  for (let i = 0; i < df.shape[0]; i++) {
    const rid = df.at(i, "ROLL_ID");
    const turno = df.at(i, "Turno");
    idxMap[`${rid}_${turno}`] = i;
  }

  // Para cada roll_id en turno 1
  for (let i = 0; i < rollIds_1.length; i++) {
    const roll_id = rollIds_1[i];
    const completa_1 = df_turno_1.at(roll_id, "COMPLETA");
    if (!rollIds_0.includes(roll_id)) {
      if (completa_1 === "Saldo") {
        const idx = idxMap[`${roll_id}_1`];
        cambioCompleta[idx] = 1;
      }
    } else {
      const completa_0 = df_turno_0.at(roll_id, "COMPLETA");
      if (completa_1 === "Saldo" && completa_0 === "Completa") {
        const idx = idxMap[`${roll_id}_1`];
        cambioCompleta[idx] = 1;
      }
    }
  }

  // Para cada roll_id en turno 0
  for (let i = 0; i < rollIds_0.length; i++) {
    const roll_id = rollIds_0[i];
    if (!rollIds_1.includes(roll_id)) {
      const completa_0 = df_turno_0.at(roll_id, "COMPLETA");
      if (completa_0 === "Saldo") {
        const idx = idxMap[`${roll_id}_0`];
        cambioCompleta[idx] = -1;
      }
    }
  }

  // Agregar columna al DataFrame
  df = df.copy();
  df.addColumn("Cambio Completa", cambioCompleta, { inplace: true });

  // Filtrar y agrupar
  let filtered = df.query(df["Cambio Completa"].ne(0));
  if (filtered.shape[0] === 0) {
    return new dfd.DataFrame({ "Cambio Completa": [], Cantidad: [] });
  }
  const grouped = filtered.groupby(["Cambio Completa"]);
  const counted = grouped.col(["Cambio Completa"]).count();
  return counted.rename({ "Cambio Completa_count": "Cantidad" });
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
// DataUtils.js
// Utilidades para manejo de archivos CSV y análisis de inventario usando danfojs en el navegador
// Autor: Adaptado profesionalmente desde DataUtils.py

import * as dfd from "danfojs";
import Papa from "papaparse";

/**
 * Lee todos los archivos CSV en la carpeta especificada y devuelve un array con el nombre del último archivo de cada día.
 * @param {File[]} files - Lista de archivos File (input type="file" multiple)
 * @returns {Promise<string[]>} - Nombres de archivos seleccionados (uno por día)
 */
export async function getAllData(files) {
  // Extraer fecha de nombre de archivo: YYYYMMDD-HHMMSS.csv
  const fileInfos = files
    .filter((f) => f.name.toLowerCase().endsWith(".csv"))
    .map((f) => {
      const [dateStr] = f.name.split(".");
      const dt = parseDateTimeFromFilename(dateStr);
      return {
        file: f,
        name: f.name,
        date: dt,
        day: dt.toISOString().slice(0, 10),
      };
    });
  // Agrupar por día y obtener el archivo más reciente de cada día
  const byDay = {};
  for (const info of fileInfos) {
    if (!byDay[info.day] || info.date > byDay[info.day].date) {
      byDay[info.day] = info;
    }
  }
  // Ordenar por fecha descendente
  return Object.values(byDay)
    .sort((a, b) => b.date - a.date)
    .map((info) => info.name);
}

/**
 * Parsea fecha y hora desde nombre de archivo tipo YYYYMMDD-HHMMSS
 * @param {string} name
 * @returns {Date}
 */
function parseDateTimeFromFilename(name) {
  // name: '20250821-230324'
  const [date, time] = name.split("-");
  const year = +date.slice(0, 4);
  const month = +date.slice(4, 6) - 1;
  const day = +date.slice(6, 8);
  const hour = +time.slice(0, 2);
  const min = +time.slice(2, 4);
  const sec = +time.slice(4, 6);
  return new Date(year, month, day, hour, min, sec);
}

/**
 * Obtiene los archivos correspondientes al turno actual y anterior.
 * @param {File[]} files
 * @returns {Promise<string[]>} - Nombres de archivos del turno actual y anterior
 */
export async function getTurns(files) {
  // Ordenar archivos por fecha descendente
  const fileInfos = files
    .filter((f) => f.name.endsWith(".csv"))
    .map((f) => {
      const [dateStr] = f.name.split(".");
      const dt = parseDateTimeFromFilename(dateStr);
      return {
        file: f,
        name: f.name,
        date: dt,
        day: dt.toISOString().slice(0, 10),
        hour: dt.getHours(),
      };
    })
    .sort((a, b) => b.date - a.date);
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
    const prevDayStr = prevDay.toISOString().slice(0, 10);
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
      const [dateStr] = file.name.split(".");
      const dateCreated = parseDateTimeFromFilename(dateStr);
      const dataWithDate = parsed.data.map((row) => ({
        ...row,
        "Date created": dateCreated,
      }));
      let df = new dfd.DataFrame(dataWithDate);
      // Normalizar nombres de columna: quitar comillas dobles
      const colMap = {};
      df.columns.forEach((col) => {
        const clean = String(col).replace(/^"|"$/g, "");
        if (clean !== col) colMap[col] = clean;
      });
      if (Object.keys(colMap).length > 0) {
        df = df.rename(colMap, { inplace: false });
      }
      df = df.loc({
        columns: ["ROLL_ID", "PAPER_CODE", "WIDTH", "COMPLETA", "Date created"],
      });

      if (Object.keys(colMap).length > 0) {
        df = df.rename(colMap, { inplace: false });
      }
      dfs.push(df);
    } catch (e) {
      // Omitir archivos con error

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
  // Obtener los nombres de los archivos más recientes (uno por día)
  const allData = await getAllData(files);
  const selectedNames = allData.slice(0, n);
  const selectedFiles = files.filter((f) => selectedNames.includes(f.name));
  const dfs = [];
  for (const file of selectedFiles) {
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data || parsed.data.length === 0) continue;
      // Agregar columna de fecha desde el nombre del archivo
      const [dateStr] = file.name.split(".");
      const dateCreated = parseDateTimeFromFilename(dateStr);
      let dataWithDate = parsed.data.map((row) => ({
        ...row,
        "Date created": dateCreated,
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
    return new dfd.DataFrame({
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

  filtered = filtered.iloc({ rows: filtered["COMPLETA"].eq("Saldo") });
  filtered = filtered.loc({ rows: filtered["Turno"].eq(1) });
  // Agrupar y contar
  if (filtered.shape[0] === 0) {
    return new dfd.DataFrame({ columns: ["PAPER_CODE", "WIDTH", "Cantidad"] });
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

// Puedes agregar más funciones según sea necesario, siguiendo el mismo patrón modular y profesional.
