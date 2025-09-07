export default function RecentTable({ transactions }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h3 className="font-semibold mb-3">Transactions Récentes</h3>
      <table className="w-full text-sm text-left">
        <thead className="text-gray-600 border-b">
          <tr>
            <th className="py-2">CODE</th>
            <th>MONTANT</th>
            <th>ROUTE</th>
            <th>STATUT</th>
            <th>DATE</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{t.tracking_code}</td>
                <td>{t.send_amount} ₽</td>
                <td>
                  {t.from_country} → {t.to_country}
                </td>
                <td>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                    {t.status}
                  </span>
                </td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-4 text-gray-500">
                Aucune transaction pour le moment
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
