import axios from 'axios';

const BASE = process.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || null;

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
});

const endpoints = [
  { method: 'get', path: '/health' },
  { method: 'get', path: '/auth/me' },
  { method: 'post', path: '/auth/login', data: { email: 'test@example.com', password: 'password' } },
  { method: 'get', path: '/tasks' },
  { method: 'get', path: '/projects' },
  { method: 'get', path: '/dashboard/stats' },
  { method: 'get', path: '/dashboard/workload' },
  { method: 'get', path: '/dashboard/performance' },
];

async function run() {
  console.log('API Test Runner');
  console.log('Base URL:', BASE);
  if (TEST_TOKEN) console.log('Using TEST_TOKEN from env');

  for (const ep of endpoints) {
    const label = `${ep.method.toUpperCase()} ${ep.path}`;
    try {
      let res;
      if (ep.method === 'get') res = await api.get(ep.path);
      else if (ep.method === 'post') res = await api.post(ep.path, ep.data);
      else res = await api.request({ method: ep.method, url: ep.path, data: ep.data });

      console.log(`✅ ${label} -> ${res.status} ${res.statusText}`);
    } catch (err) {
      if (err.response) {
        console.log(`❌ ${label} -> ${err.response.status} ${err.response.statusText} | ${JSON.stringify(err.response.data)}`);
      } else {
        console.log(`❌ ${label} -> ${err.message}`);
      }
    }
  }

  console.log('Done.');
}

run().catch((e) => {
  console.error('Runner error:', e);
  process.exit(1);
});
