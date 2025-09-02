import { useState } from "react";
import CountItemsModule from "./CountItemsModule";
import CheckStatusModule from "./CheckStatusModule";
import SummaryTableModule from "./SummaryTableModule";
import "./App.css";

import { getAllData } from "./DataUtils";

function App() {
  const [files, setFiles] = useState([]);
  const [n, setN] = useState(20); // Número de archivos a mantener

  const handleFiles = async (fileArr) => {
    // Ordenar por nombre descendente (YYYYMMDD-HHMMSS.csv)
    const sorted = fileArr
      .filter((f) => f.name.endsWith(".csv"))
      .sort((a, b) => b.name.localeCompare(a.name));
    const limited = sorted.slice(0, n);
    // Solo pasar los N archivos más recientes a getAllData
    console.log(limited.length);
    const names = await getAllData(limited);
    console.log(names.length);
    const filtered = limited.filter((f) => names.includes(f.name));
    console.log(filtered.length);
    setFiles(filtered);
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold underline bg-sky-950">
          Resumen de Inventario
        </h1>
        <div style={{ marginBottom: 8 }}>
          <label>
            N archivos a mostrar:&nbsp;
            <input
              type="number"
              min={1}
              max={100}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
        </div>
        <input
          directory=""
          webkitdirectory=""
          type="file"
          multiple
          onChange={async (e) => {
            const fileArr = Array.from(e.target.files);
            await handleFiles(fileArr);
          }}
        />
        {console.log(files.length)}

        {files.length > 0 && <CountItemsModule files={files} />}
        {files.length > 0 && <CheckStatusModule files={files} />}
        {files.length > 0 && <SummaryTableModule files={files} />}
      </div>
    </>
  );
}

export default App;
