/**
 * API Test Utility - For debugging connection issues
 * Open browser console and run: testAPI()
 */

import api from './axios';
import type { AxiosError } from 'axios';

export const testAPI = async () => {
  console.log('🧪 Testing API Connection...');
  console.log('Base URL:', api.defaults.baseURL);

  try {
    // Test basic connectivity
    console.log('📡 Testing basic connectivity to backend...');
    const response = await api.get('/health').catch(() => {
      console.log('Health endpoint not available, trying login endpoint...');
      return null;
    });

    if (response) {
      console.log('✅ Backend is responding!', response);
    }

    // Test without token
    console.log('\n📝 Testing endpoints:');

    try {
      const loginTest = await api.get('/tasks');
      console.log('✅ /api/tasks accessible:', loginTest.status);
    } catch (e: unknown) {
      const error = e as AxiosError;
      console.log('❌ /api/tasks error:', error.response?.status, error.message);
    }

    try {
      const projectTest = await api.get('/projects');
      console.log('✅ /api/projects accessible:', projectTest.status);
    } catch (e: unknown) {
      const error = e as AxiosError;
      console.log('❌ /api/projects error:', error.response?.status, error.message);
    }

  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error('❌ Connection failed:', err.message);
    console.error('Details:', {
      baseURL: api.defaults.baseURL,
      error: err.message,
      code: err.code,
    });
  }
};

// Make it globally accessible in console
declare global {
  interface Window {
    testAPI: typeof testAPI;
  }
}

window.testAPI = testAPI;

export default testAPI;
