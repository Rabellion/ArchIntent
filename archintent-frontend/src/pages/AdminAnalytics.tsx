import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, Calendar } from 'lucide-react';
import axiosInstance from '../api/axios';

interface AnalyticsData {
  registrations_by_date: Array<{
    date: string;
    count: number;
  }>;
  projects_by_status: Array<{
    status: string;
    count: number;
  }>;
  revenue_by_month: Array<{
    month: string;
    amount: number;
  }>;
  platform_fee_summary?: {
    gross_completed: number;
    platform_fees: number;
    net_to_payees: number;
    platform_fee_percent: number;
  };
  top_architects: Array<{
    architect_id: number;
    full_name: string;
    completed_projects: number;
    total_earned: number;
  }>;
  top_contractors: Array<{
    contractor_id: number;
    company_name: string;
    bids_won: number;
    win_rate: number;
  }>;
  reviews?: {
    average_platform_rating: number;
    total_reviews_submitted: number;
    top_rated_architects: Array<{
      architect_id: number;
      full_name: string;
      average_rating: number;
      reviews_count: number;
    }>;
    top_rated_contractors: Array<{
      contractor_id: number;
      company_name: string;
      average_rating: number;
      reviews_count: number;
    }>;
    reviews_by_month: Array<{
      month: string;
      count: number;
    }>;
  };
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/analytics', {
        params: { start_date: startDate, end_date: endDate },
      });
      setData(response.data?.data || null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const applyYearPreset = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#10b981',
      pending: '#f59e0b',
      completed: '#3b82f6',
      cancelled: '#ef4444',
      'in-progress': '#8b5cf6',
    };
    return colors[status.toLowerCase()] || '#6b7280';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `₨${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₨${(value / 1000).toFixed(1)}K`;
    return `₨${value}`;
  };

  const LoadingSkeleton = ({ height = 300 }: { height?: number }) => (
    <div
      style={{ height: `${height}px` }}
      className="bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse"
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-100">Analytics</h1>
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
            <p className="text-rose-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Analytics Dashboard</h1>
        <p className="text-slate-400">Visualize key metrics and performance data</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-slate-900 rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-100">Date Range</h2>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => applyPreset(7)}
            className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 font-medium text-sm transition"
          >
            Last 7 days
          </button>
          <button
            onClick={() => applyPreset(30)}
            className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/15 font-medium text-sm transition"
          >
            Last 30 days
          </button>
          <button
            onClick={() => applyPreset(90)}
            className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 font-medium text-sm transition"
          >
            Last 3 months
          </button>
          <button
            onClick={applyYearPreset}
            className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 font-medium text-sm transition"
          >
            This Year
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchAnalytics}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {!loading && data?.platform_fee_summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-lg shadow border border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Gross (completed)
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {formatCurrency(data.platform_fee_summary.gross_completed)}
            </p>
          </div>
          <div className="bg-slate-900 rounded-lg shadow border border-emerald-500/30 p-5">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
              Platform fees
            </p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              {formatCurrency(data.platform_fee_summary.platform_fees)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {data.platform_fee_summary.platform_fee_percent}% of gross on new payments
            </p>
          </div>
          <div className="bg-slate-900 rounded-lg shadow border border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Net to architects
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {formatCurrency(data.platform_fee_summary.net_to_payees)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {/* Row 1 - Two charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <div className="h-8 bg-slate-700 rounded mb-6 w-48 animate-pulse" />
              <LoadingSkeleton height={300} />
            </div>
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <div className="h-8 bg-slate-700 rounded mb-6 w-48 animate-pulse" />
              <LoadingSkeleton height={300} />
            </div>
          </div>

          {/* Row 2 - Full width chart */}
          <div className="bg-slate-900 rounded-lg shadow p-6">
            <div className="h-8 bg-slate-700 rounded mb-6 w-48 animate-pulse" />
            <LoadingSkeleton height={400} />
          </div>

          {/* Row 3 - Two tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <div className="h-8 bg-slate-700 rounded mb-6 w-48 animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <div className="h-8 bg-slate-700 rounded mb-6 w-48 animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ROW 1: Two Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: User Registrations Over Time */}
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-6">
                User Registrations Over Time
              </h2>
              {data?.registrations_by_date &&
              data.registrations_by_date.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.registrations_by_date}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value) => [value, 'Users']}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ fill: '#4f46e5', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  No data available for selected period
                </div>
              )}
            </div>

            {/* Chart 2: Revenue by Month */}
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-6">
                Revenue by Month
              </h2>
              {data?.revenue_by_month && data.revenue_by_month.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.revenue_by_month}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value: any) => [
                        formatCurrency(value),
                        'Revenue',
                      ]}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  No data available for selected period
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: Projects by Status (Full Width Horizontal Bar) */}
          <div className="bg-slate-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-6">
              Projects by Status
            </h2>
            {data?.projects_by_status && data.projects_by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={data.projects_by_status}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis
                    dataKey="status"
                    type="category"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    width={180}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value) => [value, 'Count']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-96 flex items-center justify-center text-slate-400">
                No data available for selected period
              </div>
            )}
          </div>

          {/* ROW 3: Top Architects & Top Contractors Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Architects Table */}
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-6">
                Top 5 Architects by Completed Projects
              </h2>
              {data?.top_architects && data.top_architects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-700 bg-slate-800">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                          Name
                        </th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                          Completed
                        </th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                          Net earned
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_architects.map((arch, idx) => (
                        <tr
                          key={arch.architect_id}
                          className="border-b border-slate-800 hover:bg-slate-800 transition"
                        >
                          <td className="px-4 py-3 text-slate-400 font-semibold">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {arch.full_name}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-100 font-medium">
                            {arch.completed_projects}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {formatCurrency(arch.total_earned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  No data available for selected period
                </div>
              )}
            </div>

            {/* Top Contractors Table */}
            <div className="bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-6">
                Top 5 Contractors by Won Bids
              </h2>
              {data?.top_contractors && data.top_contractors.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-700 bg-slate-800">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                          Company
                        </th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                          Bids Won
                        </th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                          Win Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_contractors.map((cont, idx) => (
                        <tr
                          key={cont.contractor_id}
                          className="border-b border-slate-800 hover:bg-slate-800 transition"
                        >
                          <td className="px-4 py-3 text-slate-400 font-semibold">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {cont.company_name}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-100 font-medium">
                            {cont.bids_won}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300">
                              {(cont.win_rate * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  No data available for selected period
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-slate-900 p-6 shadow">
              <p className="text-sm font-semibold text-slate-400">Average Platform Rating</p>
              <p className="mt-2 text-4xl font-bold text-slate-100">
                {Number(data?.reviews?.average_platform_rating || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900 p-6 shadow">
              <p className="text-sm font-semibold text-slate-400">Total Reviews Submitted</p>
              <p className="mt-2 text-4xl font-bold text-slate-100">{data?.reviews?.total_reviews_submitted || 0}</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 p-6 shadow">
            <h2 className="mb-6 text-lg font-bold text-slate-100">Reviews Submitted Over Time</h2>
            {data?.reviews?.reviews_by_month?.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.reviews.reviews_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value) => [value, 'Reviews']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-400">
                No review trend data available
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-900 p-6 shadow">
              <h2 className="mb-6 text-lg font-bold text-slate-100">Top Rated Architects (min 3 reviews)</h2>
              {data?.reviews?.top_rated_architects?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-700 bg-slate-800">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Name</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">Avg Rating</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">Reviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reviews.top_rated_architects.map((row) => (
                        <tr key={row.architect_id} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-slate-100">{row.full_name}</td>
                          <td className="px-4 py-3 text-right text-slate-100 font-medium">{row.average_rating.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-slate-100">{row.reviews_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">No qualifying architects yet</div>
              )}
            </div>

            <div className="rounded-lg bg-slate-900 p-6 shadow">
              <h2 className="mb-6 text-lg font-bold text-slate-100">Top Rated Contractors (min 3 reviews)</h2>
              {data?.reviews?.top_rated_contractors?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-700 bg-slate-800">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Company</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">Avg Rating</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-semibold">Reviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reviews.top_rated_contractors.map((row) => (
                        <tr key={row.contractor_id} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-slate-100">{row.company_name}</td>
                          <td className="px-4 py-3 text-right text-slate-100 font-medium">{row.average_rating.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-slate-100">{row.reviews_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">No qualifying contractors yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
