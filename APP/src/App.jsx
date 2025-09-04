import { useEffect, useState } from "react";
import CountItemsModule from "./CountItemsModule";
import CheckStatusModule from "./CheckStatusModule";
import SummaryTableModule from "./SummaryTableModule";
import "./style.css";

import { getAllData } from "./DataUtils";

function App() {
  const [files, setFiles] = useState([]);
  const [n, setN] = useState(240);
  const [path, setPath] = useState("");
  const state = { files: {}, n: {}, path: {} };
  try {
    const saved_files = localStorage.getItem("bobinavisor:files");
    if (saved_files) {
      const parsed = JSON.parse(saved_files);
      if (parsed && typeof parsed === "object") {
        state.files = parsed;
      }
    }
  } catch {}
  try {
    const saved_n = localStorage.getItem("bobinavisor:n");
    if (saved_n) {
      const parsed = JSON.parse(saved_n);
      if (parsed && typeof parsed === "number") {
        state.n = parsed;
      }
    }
  } catch {}
  try {
    const saved_path = localStorage.getItem("bobinavisor:path");
    if (saved_path) {
      const parsed = JSON.parse(saved_path);
      if (parsed && typeof parsed === "string") {
        state.path = parsed;
      }
    }
  } catch {}

  console.log("Loaded state from localStorage:", state);
  useEffect(() => {
    if (n) {
      try {
        localStorage.setItem("bobinavisor:n", JSON.stringify(n));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
    if (files) {
      try {
        localStorage.setItem("bobinavisor:files", JSON.stringify(files));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
    if (path) {
      try {
        localStorage.setItem("bobinavisor:path", JSON.stringify(path));
      } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
      }
    }
  }, [n, files]);
  useEffect(() => {
    if (state.n && state.n !== n) {
      setN(state.n);
    }
    if (state.files && Array.isArray(state.files) && state.files.length > 0) {
      setFiles(state.files);
    }
    if (state.path && state.path !== path) {
      setPath(state.path.split("/")[0] + "/" || "");
    }
  }, []);

  const handleFiles = async (fileArr) => {
    console.log("handleFiles", fileArr);
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
          &nbsp; (aprox. {Math.min(100, Math.max(1, Math.floor(n / 24)))} días)
        </div>
        <input
          directory=""
          webkitdirectory=""
          type="file"
          multiple
          onChange={async (e) => {
            const fileArr = Array.from(e.target.files);
            console.log("Selected files:", fileArr);
            // log del directorio
            console.log(e);
            setPath(fileArr[0]?.webkitRelativePath || "");
            await handleFiles(fileArr);
          }}
        />
        {files.length > 0 && <CheckStatusModule files={files} />}
        {files.length > 0 && <CountItemsModule files={files} />}
        {files.length > 0 && (
          <SummaryTableModule
            files={files}
            n={Math.min(100, Math.max(1, Math.floor(n / 24)))}
          />
        )}
      </div>
    </>
  );
}

export default App;
