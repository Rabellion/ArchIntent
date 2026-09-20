import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import axiosInstance from '../api/axios';

interface LogEntry {
  log_id: number;
  action: string;
  target_table: string;
  target_id: number;
  description: string;
  created_at: string;
  admin_name?: string;
  admin?: {
    full_name?: string;
  };
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminName, setAdminName] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [currentPage, adminName, actionFilter, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(adminName && { admin_name: adminName }),
        ...(actionFilter && { action: actionFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });
      const response = await axiosInstance.get(`/admin/logs?${params}`);

      const logsData = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      const normalizedLogs: LogEntry[] = logsData.map((log: any) => ({
        log_id: log.log_id,
        action: log.action || 'unknown',
        target_table: log.target_table || 'unknown',
        target_id: log.target_id || 0,
        description: log.description || '',
        created_at: log.created_at || new Date().toISOString(),
        admin_name: log.admin_name || log.admin?.full_name || 'System',
        admin: log.admin,
      }));

      setLogs(normalizedLogs);
      setTotalPages(response.data?.pagination?.last_page || 1);
      setError(null);
    } catch (err: any) {
      setLogs([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-rose-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Audit Logs</h1>

        {/* Filters */}
        <div className="bg-slate-900 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Name
              </label>
              <input
                type="text"
                placeholder="Search admin..."
                value={adminName}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  handleFilterChange();
                }}
                className="w-full border border-slate-600 bg-slate-800 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Action
              </label>
              <input
                type="text"
                placeholder="Search action..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  handleFilterChange();
                }}
                className="w-full border border-slate-600 bg-slate-800 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full border border-slate-600 bg-slate-800 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full border border-slate-600 bg-slate-800 text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-100">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-100">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-100">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-100">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-100">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.log_id}
                    className="border-b border-slate-700 hover:bg-slate-800"
                  >
                    <td className="px-6 py-4 text-sm text-slate-100">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-100">
                      {log.admin_name || log.admin?.full_name || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-500/15 text-blue-300 rounded text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-100">
                      {log.target_table} #{log.target_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {log.description || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-700 px-6 py-4 flex justify-between items-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700 text-slate-100 rounded hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-700 text-slate-100 rounded hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
