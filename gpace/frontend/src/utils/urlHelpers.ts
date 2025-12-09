import { API_BASE_URL } from '@/config';

export const createPageUrl = (page) => {
  return `${API_BASE_URL}/${page}`;
};

export const createApiUrl = (endpoint) => {
  return `${API_BASE_URL}/api/${endpoint}`;
};