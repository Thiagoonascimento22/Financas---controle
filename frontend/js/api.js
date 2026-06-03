const API = (() => {
  const BASE = '/api';

  const headers = () => {
    const h = { 'Content-Type': 'application/json' };
    const t = localStorage.getItem('fp_token');
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;

    // Admin
    adminStats: () => req('GET', '/admin/stats'),
    adminUsers: () => req('GET', '/admin/users'),
    blockUser: (id, blocked) => req('PATCH', `/admin/users/${id}/block`, { blocked }),
    deleteUser: (id) => req('DELETE', `/admin/users/${id}`),

  };

  const req = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
    return data;

    // Admin
    adminStats: () => req('GET', '/admin/stats'),
    adminUsers: () => req('GET', '/admin/users'),
    blockUser: (id, blocked) => req('PATCH', `/admin/users/${id}/block`, { blocked }),
    deleteUser: (id) => req('DELETE', `/admin/users/${id}`),

  };

  return {
    post:   (p, b)    => req('POST',   p, b),
    get:    (p)       => req('GET',    p),
    put:    (p, b)    => req('PUT',    p, b),
    delete: (p)       => req('DELETE', p),

    register: (body)  => req('POST', '/auth/register', body),
    login:    (body)  => req('POST', '/auth/login',    body),
    me:       ()      => req('GET',  '/auth/me'),

    getEntries:   (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return req('GET', '/entries' + (qs ? '?' + qs : ''));
    },
    getSummary:   (months = 6)  => req('GET', `/entries/summary?months=${months}`),
    getByCategory:(month, year) => req('GET', `/entries/by-category?month=${month}&year=${year}`),
    createEntry:  (body)        => req('POST',   '/entries', body),
    updateEntry:  (id, body)    => req('PUT',    `/entries/${id}`, body),
    deleteEntry:  (id)          => req('DELETE', `/entries/${id}`),

    getCategories:   ()         => req('GET',    '/categories'),
    createCategory:  (body)     => req('POST',   '/categories', body),
    deleteCategory:  (id)       => req('DELETE', `/categories/${id}`),

    // Admin
    adminStats: () => req('GET', '/admin/stats'),
    adminUsers: () => req('GET', '/admin/users'),
    blockUser: (id, blocked) => req('PATCH', `/admin/users/${id}/block`, { blocked }),
    deleteUser: (id) => req('DELETE', `/admin/users/${id}`),

  };
})();
