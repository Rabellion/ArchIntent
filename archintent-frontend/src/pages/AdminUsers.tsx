import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Download,
  ChevronDown,
  AlertCircle,
  X,
  Eye,
  Lock,
  Unlock,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axiosInstance from '../api/axios';
import { resolveImageUrl } from '../utils/storage';

interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: 'client' | 'architect' | 'contractor' | 'admin';
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  profile_image?: string;
  // Architect specific
  verification_status?: string;
  specialization?: string;
  experience?: string;
  // Contractor specific
  company_name?: string;
  company_registration?: string;
}

interface PaginationData {
  data: User[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface ConfirmDialogState {
  isOpen: boolean;
  type: 'suspend' | 'delete' | null;
  user: User | null;
  deleteConfirmEmail: string;
}

interface SelectedUser {
  user: User;
  details: User;
}

const normalizeUser = (raw: any): User => {
  const role = (raw?.role || 'client') as User['role'];
  const status = (raw?.status || raw?.account_status || 'pending') as User['status'];

  return {
    user_id: raw?.user_id,
    full_name: raw?.full_name || 'Unknown User',
    email: raw?.email || 'N/A',
    phone: raw?.phone || raw?.phone_number,
    role,
    status,
    created_at: raw?.created_at || new Date().toISOString(),
    profile_image: raw?.profile_image,
    verification_status: raw?.verification_status,
    specialization: raw?.specialization,
    experience: raw?.experience,
    company_name: raw?.company_name,
    company_registration: raw?.company_registration,
  };
};

const toTitle = (value?: string) => {
  if (!value || value.length === 0) return 'N/A';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20,
  });

  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
  });

  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: null,
    user: null,
    deleteConfirmEmail: '',
  });
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, current_page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.current_page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      if (filters.search) params.search = filters.search;
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.status !== 'all') params.account_status = filters.status;

      const response = await axiosInstance.get('/admin/users', { params });
      const userList = Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeUser)
        : [];
      const paginationData = response.data?.pagination || {};

      setUsers(userList);
      setPagination({
        current_page: paginationData.current_page ?? 1,
        last_page: paginationData.last_page ?? 1,
        total: paginationData.total ?? userList.length,
        per_page: paginationData.per_page ?? pagination.per_page,
      });
      setError(null);
    } catch (err: any) {
      setUsers([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      client: 'bg-blue-500/15 text-blue-300',
      architect: 'bg-purple-500/15 text-purple-300',
      contractor: 'bg-orange-500/15 text-orange-300',
      admin: 'bg-rose-500/15 text-rose-300',
    };
    return colors[role] || 'bg-slate-800 text-slate-300';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-300',
      pending: 'bg-amber-500/15 text-amber-300',
      suspended: 'bg-rose-500/15 text-rose-300',
    };
    return colors[status] || 'bg-slate-800 text-slate-300';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSuspend = async (user: User) => {
    try {
      await axiosInstance.put(`/admin/users/${user.user_id}/suspend`);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, status: 'suspended' } : u
        )
      );
      setConfirmDialog({ isOpen: false, type: null, user: null, deleteConfirmEmail: '' });
      setDropdownOpen(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to suspend user');
    }
  };

  const handleActivate = async (user: User) => {
    try {
      await axiosInstance.put(`/admin/users/${user.user_id}/activate`);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, status: 'active' } : u
        )
      );
      setDropdownOpen(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate user');
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await axiosInstance.delete(`/admin/users/${user.user_id}`);
      setUsers((prev) => prev.filter((u) => u.user_id !== user.user_id));
      setConfirmDialog({ isOpen: false, type: null, user: null, deleteConfirmEmail: '' });
      setDropdownOpen(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleViewProfile = async (user: User) => {
    try {
      setPanelLoading(true);
      const response = await axiosInstance.get(`/admin/users/${user.user_id}`);
      // The API wraps payloads as { success, data }. This previously
      // assigned the whole envelope to `details`, so every field read
      // as undefined even once the endpoint existed.
      setSelectedUser({ user, details: normalizeUser(response.data?.data ?? response.data) });
      setDropdownOpen(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user details');
    } finally {
      setPanelLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
    const rows = users.map((u) => [
      u.full_name,
      u.email,
      u.phone || 'N/A',
      u.role,
      u.status,
      new Date(u.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const startIndex = (pagination.current_page - 1) * pagination.per_page + 1;
  const endIndex = Math.min(
    pagination.current_page * pagination.per_page,
    pagination.total
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">User Management</h1>
          <p className="text-slate-400 mt-1">Manage all platform users</p>
        </div>
        <Users className="w-8 h-8 text-slate-500" />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-rose-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, role: e.target.value }))
            }
            className="px-4 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="client">Client</option>
            <option value="architect">Architect</option>
            <option value="contractor">Contractor</option>
            <option value="admin">Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="px-4 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportCSV}
            disabled={users.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading users...</p>
          </div>
        </div>
      )}

      {/* Users Table */}
      {!loading && users.length > 0 && (
        <div className="bg-slate-900 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-100 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-800 transition">
                  {/* Avatar + Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.profile_image ? (
                        <img
                          src={resolveImageUrl(user.profile_image)}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      <span className="font-medium text-slate-100">{user.full_name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-400 text-sm">{user.email}</span>
                  </td>

                  {/* Role Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {toTitle(user.role)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        user.status
                      )}`}
                    >
                      {toTitle(user.status)}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() =>
                          setDropdownOpen(
                            dropdownOpen === user.user_id ? null : user.user_id
                          )
                        }
                        className="inline-flex items-center px-3 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
                      >
                        Actions
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </button>

                      {dropdownOpen === user.user_id && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleViewProfile(user)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 border-b border-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                            View Profile
                          </button>

                          {user.status === 'active' && user.role !== 'admin' && (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  type: 'suspend',
                                  user,
                                  deleteConfirmEmail: '',
                                })
                              }
                              className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-500/10 flex items-center gap-2 border-b border-slate-700"
                            >
                              <Lock className="w-4 h-4" />
                              Suspend
                            </button>
                          )}

                          {(user.status === 'suspended' || user.status === 'pending') &&
                            user.role !== 'admin' && (
                              <button
                                onClick={() => handleActivate(user)}
                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-emerald-500/10 flex items-center gap-2 border-b border-slate-700"
                              >
                                <Unlock className="w-4 h-4" />
                                Activate
                              </button>
                            )}

                          {user.role !== 'admin' && (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  type: 'delete',
                                  user,
                                  deleteConfirmEmail: '',
                                })
                              }
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-rose-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Showing {startIndex} to {endIndex} of {pagination.total} users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    current_page: Math.max(1, prev.current_page - 1),
                  }))
                }
                disabled={pagination.current_page === 1}
                className="p-2 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm text-slate-400">
                Page {pagination.current_page} of {pagination.last_page}
              </span>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    current_page: Math.min(
                      prev.last_page,
                      prev.current_page + 1
                    ),
                  }))
                }
                disabled={pagination.current_page >= pagination.last_page}
                className="p-2 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="bg-slate-900 rounded-lg shadow p-12 text-center">
          <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-100">No users found</h3>
          <p className="text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && confirmDialog.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-slate-900 w-full md:w-96 rounded-t-lg shadow-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              {confirmDialog.type === 'suspend'
                ? `Suspend ${confirmDialog.user.full_name}?`
                : `Delete ${confirmDialog.user.full_name}?`}
            </h3>

            {confirmDialog.type === 'suspend' && (
              <p className="text-slate-400">
                They will not be able to login until their account is reactivated.
              </p>
            )}

            {confirmDialog.type === 'delete' && (
              <div className="space-y-3">
                <p className="text-slate-400">
                  This action cannot be undone. Type their email address to confirm:
                </p>
                <input
                  type="text"
                  placeholder={confirmDialog.user.email}
                  value={confirmDialog.deleteConfirmEmail}
                  onChange={(e) =>
                    setConfirmDialog((prev) => ({
                      ...prev,
                      deleteConfirmEmail: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: false,
                    type: null,
                    user: null,
                    deleteConfirmEmail: '',
                  })
                }
                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'suspend') {
                    handleSuspend(confirmDialog.user!);
                  } else if (
                    confirmDialog.type === 'delete' &&
                    confirmDialog.deleteConfirmEmail === confirmDialog.user?.email
                  ) {
                    handleDelete(confirmDialog.user!);
                  }
                }}
                disabled={
                  confirmDialog.type === 'delete' &&
                  confirmDialog.deleteConfirmEmail !== confirmDialog.user.email
                }
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${
                  confirmDialog.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmDialog.type === 'suspend' ? 'Suspend' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Slide-Over Panel */}
      {selectedUser && (
        <div className="fixed inset-0 overflow-hidden z-50">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedUser(null)}
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-slate-900 shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100">User Profile</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            {panelLoading ? (
              <div className="p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="text-center pb-4 border-b border-slate-700">
                  {selectedUser.details.profile_image ? (
                    <img
                      src={resolveImageUrl(selectedUser.details.profile_image)}
                      alt={selectedUser.details.full_name}
                      className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                      {getInitials(selectedUser.details.full_name)}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-slate-100">
                    {selectedUser.details.full_name}
                  </h3>
                  <p className="text-slate-400 text-sm">{selectedUser.details.email}</p>
                </div>

                {/* Details Grid */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Phone
                    </label>
                    <p className="text-slate-100 mt-1">
                      {selectedUser.details.phone || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role
                    </label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(
                        selectedUser.details.role
                      )}`}
                    >
                      {selectedUser.details.role.charAt(0).toUpperCase() +
                        selectedUser.details.role.slice(1)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        selectedUser.details.status
                      )}`}
                    >
                      {selectedUser.details.status.charAt(0).toUpperCase() +
                        selectedUser.details.status.slice(1)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Joined Date
                    </label>
                    <p className="text-slate-100 mt-1">
                      {new Date(selectedUser.details.created_at).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>

                  {/* Architect Specific */}
                  {selectedUser.details.role === 'architect' && (
                    <>
                      <div className="pt-4 border-t border-slate-700">
                        <h4 className="font-bold text-slate-100 mb-4">
                          Architect Details
                        </h4>
                      </div>
                      {selectedUser.details.verification_status && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Verification Status
                          </label>
                          <span
                            className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              selectedUser.details.verification_status === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {selectedUser.details.verification_status}
                          </span>
                        </div>
                      )}
                      {selectedUser.details.specialization && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Specialization
                          </label>
                          <p className="text-slate-100 mt-1">
                            {selectedUser.details.specialization}
                          </p>
                        </div>
                      )}
                      {selectedUser.details.experience && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Experience
                          </label>
                          <p className="text-slate-100 mt-1">
                            {selectedUser.details.experience}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Contractor Specific */}
                  {selectedUser.details.role === 'contractor' && (
                    <>
                      <div className="pt-4 border-t border-slate-700">
                        <h4 className="font-bold text-slate-100 mb-4">
                          Contractor Details
                        </h4>
                      </div>
                      {selectedUser.details.company_name && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Company Name
                          </label>
                          <p className="text-slate-100 mt-1">
                            {selectedUser.details.company_name}
                          </p>
                        </div>
                      )}
                      {selectedUser.details.company_registration && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Registration
                          </label>
                          <p className="text-slate-100 mt-1">
                            {selectedUser.details.company_registration}
                          </p>
                        </div>
                      )}
                      {selectedUser.details.verification_status && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Verification Status
                          </label>
                          <span
                            className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              selectedUser.details.verification_status === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {selectedUser.details.verification_status}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="pt-6 border-t border-slate-700 space-y-3">
                  <button
                    onClick={() => {
                      handleViewProfile(selectedUser.user);
                      setSelectedUser(null);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Refresh
                  </button>

                  {selectedUser.details.status === 'active' &&
                    selectedUser.details.role !== 'admin' && (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            type: 'suspend',
                            user: selectedUser.details,
                            deleteConfirmEmail: '',
                          });
                          setSelectedUser(null);
                        }}
                        className="w-full px-4 py-2 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-500/10 transition font-medium"
                      >
                        Suspend
                      </button>
                    )}

                  {(selectedUser.details.status === 'suspended' ||
                    selectedUser.details.status === 'pending') &&
                    selectedUser.details.role !== 'admin' && (
                      <button
                        onClick={() => {
                          handleActivate(selectedUser.details);
                          setSelectedUser(null);
                        }}
                        className="w-full px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-emerald-500/10 transition font-medium"
                      >
                        Activate
                      </button>
                    )}

                  {selectedUser.details.role !== 'admin' && (
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          type: 'delete',
                          user: selectedUser.details,
                          deleteConfirmEmail: '',
                        });
                        setSelectedUser(null);
                      }}
                      className="w-full px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-rose-500/10 transition font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
