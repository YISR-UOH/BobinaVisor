import { useSummaryData } from "./hooks/useSummaryData";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/**
 * Componente para mostrar el resumen de conteo por fecha y estado 'COMPLETA'.
 * @param {{ files: File[], n?: number }} props
 */
export default function SummaryTableModule({ files, n = 20 }) {
  const { data, loading, error } = useSummaryData(files, n);

  if (loading) return <div>Cargando resumen...</div>;
  if (error)
    return <div style={{ color: "red" }}>Error SummaryTable: {error}</div>;
  if (!data || !data.rows || data.rows.length === 0)
    return <div>No hay datos para mostrar.</div>;

  // Transformar data.rows -> [{ date, Saldo, Completa } ...]
  const dateIdx = data.columns.indexOf("Date created");
  const completaIdx = data.columns.indexOf("COMPLETA");
  const countIdx = data.columns.indexOf("Cantidad");

  const byDate = new Map();
  for (const row of data.rows) {
    const date = String(row[dateIdx]);
    const statusRaw = String(row[completaIdx] ?? "");
    const status = statusRaw.trim().toLowerCase();
    const count = Number(row[countIdx] ?? 0) || 0;
    if (!byDate.has(date)) byDate.set(date, { date, Saldo: 0, Completa: 0 });
    const entry = byDate.get(date);
    if (status === "saldo") entry.Saldo += count;
    else if (status === "completa") entry.Completa += count;
  }
  const chartData = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  return (
    <div style={{ overflowX: "auto", margin: "1em 0" }}>
      <h3>Resumen por fecha y estado</h3>
      <div style={{ width: "100%", height: 320, marginBottom: "0.75rem" }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              label={{
                value: "Saldo",
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              label={{
                value: "Completa",
                angle: -90,
                position: "insideRight",
                offset: 10,
              }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Saldo"
              stroke="#2c7be5"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Completa"
              stroke="#e55353"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "12px",
        }}
      >
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                style={{
                  border: "1px solid #ddd",
                  padding: "0.25em 0.4em",
                  background: "#f8f8f8",
                  fontWeight: 600,
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
                    border: "1px solid #eee",
                    padding: "0.2em 0.35em",
                    textAlign: "center",
                    whiteSpace: "nowrap",
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
