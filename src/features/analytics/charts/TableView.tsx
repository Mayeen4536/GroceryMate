export interface TableViewColumn {
  key: string
  label: string
}

export interface TableViewProps {
  caption: string
  columns: TableViewColumn[]
  rows: Array<Record<string, string>>
}

/**
 * The accessible, WCAG-clean twin every chart needs alongside its visual
 * render — a collapsed-by-default table so every value stays reachable
 * without relying on color, position, or hover.
 */
export function TableView({ caption, columns, rows }: TableViewProps) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer rounded text-xs font-medium text-muted select-none hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
        View as table
      </summary>
      <div className="mt-3 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-sand/60">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-2 font-medium text-ink-soft">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-line last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-ink tabular-nums">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
