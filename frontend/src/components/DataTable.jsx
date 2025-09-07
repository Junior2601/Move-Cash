export default function DataTable({ columns, data, onEdit, onDelete, emptyLabel = "Aucune donnée" }) {
  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-4 py-2 font-medium">{c.header}</th>
            ))}
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((row) => (
              <tr key={row.id} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-2">{c.render ? c.render(row) : row[c.key]}</td>
                ))}
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onEdit(row)} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Éditer</button>
                  <button onClick={() => onDelete(row)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Supprimer</button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-500">{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
