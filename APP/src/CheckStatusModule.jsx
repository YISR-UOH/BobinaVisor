import { useCheckStatus } from "./hooks/useCheckStatus";

export default function CheckStatusModule({ files }) {
  const { data, loading, error } = useCheckStatus(files);

  if (!files.length) return null;
  if (loading)
    return <div style={{ marginTop: 20 }}>Cargando conteo de rollos...</div>;
  if (error)
    return <div style={{ color: "red" }}>Error countItems: {error}</div>;
  if (!data) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <b>Cambio de estado (turno actual, saldo):</b>
      <table border="1" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            {data.columns.map((col, i) => (
              <th key={i}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
