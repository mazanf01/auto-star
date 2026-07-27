const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : API_BASE + path;
  const headers = { ...options.headers };
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  // Handle 401 → redirect to login
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, full_name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) }),
  me: () => request('/auth/me'),
  changePassword: (current_password, new_password) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),

  // Dashboard
  dashboard: () => request('/dashboard'),

  // Users (admin)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  toggleUser: (id) => request(`/users/${id}/toggle`, { method: 'POST' }),

  // Users — bulk operations (Phase 2 #3)
  bulkActivateUsers: (user_ids) => request('/users/bulk/activate', { method: 'POST', body: JSON.stringify({ user_ids }) }),
  bulkDeactivateUsers: (user_ids) => request('/users/bulk/deactivate', { method: 'POST', body: JSON.stringify({ user_ids }) }),
  bulkDeleteUsers: (user_ids) => request('/users/bulk/delete', { method: 'POST', body: JSON.stringify({ user_ids }) }),
  bulkAssignMenus: (user_ids, menu_ids) => request('/users/bulk/assign-menus', { method: 'POST', body: JSON.stringify({ user_ids, menu_ids }) }),

  // Menus
  getMyMenus: () => request('/menus/my'),
  getAllMenus: () => request('/admin/menus'),
  createMenu: (data) => request('/admin/menus', { method: 'POST', body: JSON.stringify(data) }),
  updateMenu: (id, data) => request(`/admin/menus/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenu: (id) => request(`/admin/menus/${id}`, { method: 'DELETE' }),
  toggleMenu: (id) => request(`/admin/menus/${id}/toggle`, { method: 'POST' }),
  toggleMenuDefault: (id) => request(`/admin/menus/${id}/toggle-default`, { method: 'POST' }),
  getDefaultMenus: () => request('/admin/menus/defaults/list'),
  getMenuAccess: (id) => request(`/admin/menus/${id}/access`),
  grantMenuAccess: (id, user_ids) => request(`/admin/menus/${id}/access`, { method: 'POST', body: JSON.stringify({ user_ids }) }),
  revokeMenuAccess: (id, userId) => request(`/admin/menus/${id}/access/${userId}`, { method: 'DELETE' }),
  getUserMenus: (userId) => request(`/admin/menus/users/${userId}/menus-list`),
  assignUserMenus: (userId, menu_ids) => request(`/admin/menus/users/${userId}/menus`, { method: 'PUT', body: JSON.stringify({ menu_ids }) }),

  // ─── Phase 3: Holidays, Notifications, Analytics ──────────
  getHolidays: (year) => request(`/holidays${year ? `?year=${year}` : ''}`),
  checkHoliday: () => request('/holidays/check'),
  createHoliday: (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  updateHoliday: (id, data) => request(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/holidays/${id}`, { method: 'DELETE' }),

  getNotifications: () => request('/notifications'),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  getAnalytics: (days = 30) => request(`/analytics?days=${days}`),

  // ─── Phase 4: Sessions, Multi-Account ─────────────────────
  getSessions: () => request('/sessions'),
  revokeSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  revokeAllOtherSessions: () => request('/sessions', { method: 'DELETE' }),

  // Multi-account STAR ASN (updated Phase 4)
  activateStarAccount: (id) => request(`/star-asn/credentials/${id}/activate`, { method: 'POST' }),
  deleteStarAccount: (id) => request(`/star-asn/credentials/${id}`, { method: 'DELETE' }),

  // ─── Telegram ─────────────────────────────────────────────
  getTelegramStatus: () => request('/telegram/status'),
  testTelegram: () => request('/telegram/test', { method: 'POST' }),
  setTelegramChatId: (chat_id) => request('/telegram/chat-id', { method: 'PUT', body: JSON.stringify({ chat_id }) }),
  getTelegramMe: () => request('/telegram/me'),
  getTelegramWebhookInfo: () => request('/telegram/webhook-info'),
  saveTelegramSettings: (data) => request('/telegram/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Auth: logout (with session cleanup) ──────────────────
  logout: () => request('/auth/logout', { method: 'POST' }),

  // ─── Admin: Presensi Config ───────────────────────────────
  getPresensiConfig: () => request('/admin/settings'),
  savePresensiConfig: (settings) => request('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  resetPresensiConfig: () => request('/admin/settings/reset', { method: 'POST' }),

  // ─── Admin: STAR Accounts viewer ──────────────────────────
  getAdminStarAccounts: () => request('/admin/star-accounts'),
  checkStarSession: (credId) => request(`/admin/star-accounts/${credId}/check-session`, { method: 'POST' }),
  updateStarAccount: (credId, data) => request(`/admin/star-accounts/${credId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStarAccountAdmin: (credId) => request(`/admin/star-accounts/${credId}`, { method: 'DELETE' }),

  // STAR ASN
  saveStarCredentials: (star_username, star_password, label) => request('/star-asn/credentials', { method: 'POST', body: JSON.stringify({ star_username, star_password, label }) }),
  getStarCredentials: () => request('/star-asn/credentials'),
  deleteStarCredentials: () => request('/star-asn/credentials', { method: 'DELETE' }),
  starLogin: (star_username, star_password) => request('/star-asn/login', { method: 'POST', body: JSON.stringify({ star_username, star_password }) }),
  getIdentity: () => request('/star-asn/identity'),
  doPresensi: (type, latitude, longitude, timezone) => request('/star-asn/presensi', { method: 'POST', body: JSON.stringify({ type, latitude, longitude, timezone }) }),
  getPresensiStatus: () => request('/star-asn/presensi-status'),
  getTunjangan: (year, period) => request(`/star-asn/tunjangan?year=${year}&period=${period}`),

  // Saved Locations
  getLocations: () => request('/locations'),
  createLocation: (data) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id, data) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id) => request(`/locations/${id}`, { method: 'DELETE' }),
  setPrimaryLocation: (id) => request(`/locations/${id}/set-primary`, { method: 'POST' }),

  // Presensi settings
  getPresensiSettings: () => request('/presensi-settings'),
  updatePresensiSettings: (data) => request('/presensi-settings', { method: 'PUT', body: JSON.stringify(data) }),
  getPresensiLogs: (page = 1, limit = 50) => request(`/presensi-settings/logs?page=${page}&limit=${limit}`),
  getAllPresensiSettings: () => request('/presensi-settings/all'),

  // Activity logs
  getActivityLogs: (page = 1, limit = 50, user_id) => {
    let q = `/activity?page=${page}&limit=${limit}`;
    if (user_id) q += `&user_id=${user_id}`;
    return request(q);
  },
};
