import { requireAdminSession } from '@/lib/auth/admin';
import { getAuditLogs, getAuditActionLabel } from '@/lib/audit/queries';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  await requireAdminSession();
  const logs = await getAuditLogs(200);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-gray-500">Kritik işlem izleri (cari, tahsilat, sipariş, fiyat, stok, ayarlar).</p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">İşlem</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Kaynak</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Kaynak ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Aktor</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">IP</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {getAuditActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.resource_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.resource_id?.slice(0, 8) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{log.actor_user_id?.slice(0, 8) || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{log.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(log.created_at).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Henüz audit log kaydı yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
