import { tokenStorage } from './auth';

// Configuration API - À modifier selon votre backend
const API_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Développement
  : 'https://votre-api.com/api';  // Production

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async beforeRequest(config: RequestConfig): Promise<RequestConfig> {
    const token = await tokenStorage.getToken();
    
    const headers = new Headers(config.headers || this.defaultHeaders);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return { ...config, headers };
  }

  private async handleResponse(response: Response, url: string, config: RequestConfig): Promise<any> {
    // Gestion du refresh token sur 401
    if (response.status === 401 && !(config as any)._retry) {
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: this.defaultHeaders,
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshResponse.ok) throw new Error('Refresh failed');

        const { accessToken } = await refreshResponse.json();
        await tokenStorage.setToken(accessToken);

        // Retry la requête originale
        const retryConfig = { ...config, _retry: true } as any;
        return this.request(url, retryConfig);
      } catch (error) {
        await tokenStorage.removeTokens();
        throw error;
      }
    }

    // Erreur HTTP
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      try {
        error.response = {
          status: response.status,
          data: await response.json(),
        };
      } catch {
        error.response = {
          status: response.status,
          data: { message: response.statusText },
        };
      }
      throw error;
    }

    // Succès
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  private async request(endpoint: string, config: RequestConfig = {}): Promise<any> {
    const finalConfig = await this.beforeRequest(config);
    
    let url = `${this.baseURL}${endpoint}`;
    if (config.params) {
      const queryString = new URLSearchParams(config.params).toString();
      url += `?${queryString}`;
    }

    const response = await fetch(url, finalConfig);
    return this.handleResponse(response, endpoint, config);
  }

  async get(endpoint: string, config?: RequestConfig) {
    return this.request(endpoint, { ...config, method: 'GET' });
  }

  async post(endpoint: string, data?: any, config?: RequestConfig) {
    return this.request(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any, config?: RequestConfig) {
    return this.request(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, config?: RequestConfig) {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any, config?: RequestConfig) {
    return this.request(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient(API_URL);