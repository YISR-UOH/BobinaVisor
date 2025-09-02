import { useState } from "react";
import CountItemsModule from "./CountItemsModule";
import CheckStatusModule from "./CheckStatusModule";
import SummaryTableModule from "./SummaryTableModule";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold underline bg-sky-950">
          Resumen de Inventario
        </h1>
        <input
          directory=""
          webkitdirectory=""
          type="file"
          multiple
          onChange={(e) => {
            const fileArr = Array.from(e.target.files);
            setFiles(fileArr);
          }}
        />

        {files.length > 0 && <CountItemsModule files={files} />}
        {files.length > 0 && <CheckStatusModule files={files} />}
        {files.length > 0 && <SummaryTableModule files={files} />}
      </div>
    </>
  );
}

export default App;
