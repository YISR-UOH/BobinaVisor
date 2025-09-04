import { use, useEffect, useState } from "react";
import CountItemsModule from "./CountItemsModule";
import CheckStatusModule from "./CheckStatusModule";
import SummaryTableModule from "./SummaryTableModule";
import "./style.css";

import { getAllData } from "./DataUtils";

function App() {
  const [files, setFiles] = useState([]);
  const [n, setN] = useState(240);
  const [days, setDays] = useState(20);
  const state = { files: {}, n: {} };
  try {
    const saved_files = localStorage.getItem("bobinavisor:files");
    if (saved_files) {
      const parsed = JSON.parse(saved_files);
      if (parsed && typeof parsed === "object") {
        state.files = parsed;
      }
    }
    const saved_n = localStorage.getItem("bobinavisor:n");
    if (saved_n) {
      const parsed = JSON.parse(saved_n);
      if (parsed && typeof parsed === "number") {
        state.n = parsed;
      }
    }
    if (Array.isArray(state.files) && state.files.length > 0) {
      setFiles(state.files);
    }
    if (state.n && typeof state.n === "number") {
      setN(state.n);
    }
  } catch {}
  useEffect(() => {
    if (n) {
      setDays(Math.min(100, Math.max(1, Math.floor(n / 24))));
    }
  }, [n]);
  useEffect(() => {
    if (n) {
      try {
        localStorage.setItem("bobinavisor:n", JSON.stringify(state.n));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
    if (files) {
      try {
        localStorage.setItem("bobinavisor:files", JSON.stringify(state.files));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
  }, [n, files]);

  const handleFiles = async (fileArr) => {
    const sorted = fileArr
      .filter((f) => f.name.toLowerCase().endsWith(".csv"))
      .sort((a, b) => b.name.localeCompare(a.name));
    const limited = sorted.slice(0, n);
    const names = await getAllData(limited);
    const filtered = limited.filter((f) => names.includes(f.name));
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
            N archivos a cargar:&nbsp;
            <input
              type="number"
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
          &nbsp; (aprox. {days} días)
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
        {files.length > 0 && <CheckStatusModule files={files} />}
        {files.length > 0 && <CountItemsModule files={files} />}
        {files.length > 0 && <SummaryTableModule files={files} n={days} />}
      </div>
    </>
  );
}

export default App;
