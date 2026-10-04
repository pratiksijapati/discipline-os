import styles from "./Chart.module.css";

interface DataTableProps {
  caption: string;
  columns: [string, string];
  rows: Array<[string, string]>;
}

/** Every chart's numbers, readable without hovering (and by screen readers). */
export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <details className={styles.table}>
      <summary>Show as table</summary>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <th scope="row">{a}</th>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
