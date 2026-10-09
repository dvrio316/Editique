// Small client for the Django API. In dev, Vite forwards /api and /media to Django (vite.config.js).
// Uses Django's session cookie + CSRF token, so no extra packages are needed.

const getCookie = (name) => {
  const hit = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.split('=')[1]) : '';
};

async function request(path, { method = 'GET', json, form } = {}) {
  const headers = {};
  if (method !== 'GET') headers['X-CSRFToken'] = getCookie('csrftoken');
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // browser sets the multipart boundary
  }

  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Is Django running?'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  }
  return data;
}

export const api = {
  csrf: () => request('/auth/csrf/'), // sets the csrftoken cookie
  me: () => request('/auth/me/'),
  register: (username, password) => request('/auth/register/', { method: 'POST', json: { username, password } }),
  login: (username, password) => request('/auth/login/', { method: 'POST', json: { username, password } }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  listStrips: () => request('/strips/'),
  saveStrip: (blob, title = '') => {
    const form = new FormData();
    form.append('image', blob, 'strip.png');
    form.append('title', title);
    return request('/strips/', { method: 'POST', form });
  },
  deleteStrip: (id) => request(`/strips/${id}/`, { method: 'DELETE' }),
};
