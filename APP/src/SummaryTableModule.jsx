import { useSummaryData } from "./hooks/useSummaryData";

/**
 * Componente para mostrar el resumen de conteo por fecha y estado 'COMPLETA'.
 * @param {{ files: File[], n?: number }} props
 */
export default function SummaryTableModule({ files, n = 20 }) {
  const { data, loading, error } = useSummaryData(files, n);

  if (loading) return <div>Cargando resumen...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!data || !data.rows || data.rows.length === 0)
    return <div>No hay datos para mostrar.</div>;

  return (
    <div style={{ overflowX: "auto", margin: "1em 0" }}>
      <h3>Resumen por fecha y estado</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                style={{
                  border: "1px solid #ccc",
                  padding: "0.5em",
                  background: "#f5f5f5",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    border: "1px solid #ccc",
                    padding: "0.5em",
                    textAlign: "center",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
