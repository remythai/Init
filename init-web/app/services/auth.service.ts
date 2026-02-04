// services/auth.service.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterData {
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  password: string;
  birthday?: string;
  description?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user?: User;
  orga?: Orga;
}

export interface User {
  id: number;
  firstname: string;
  lastname: string;
  tel: string;
  mail?: string;
  birthday?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Orga {
  id: number;
  nom: string;
  mail: string;
  description?: string;
  tel?: string;
  logo_path?: string;
  created_at?: string;
  updated_at?: string;
}

class AuthService {
  private getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  private removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  setToken(token: string) {
    if (!token) {
      console.warn('Tentative de sauvegarde d\'un token undefined/null');
      return;
    }
    this.setStorageItem('token', token);
  }

  setRefreshToken(refreshToken: string) {
    if (!refreshToken) {
      console.warn('Tentative de sauvegarde d\'un refreshToken undefined/null');
      return;
    }
    this.setStorageItem('refreshToken', refreshToken);
  }

  setUserType(userType: 'user' | 'orga') {
    if (!userType) {
      console.warn('Tentative de sauvegarde d\'un userType undefined/null');
      return;
    }
    this.setStorageItem('userType', userType);
  }

  getToken(): string | null {
    return this.getStorageItem('token');
  }

  getRefreshToken(): string | null {
    return this.getStorageItem('refreshToken');
  }

  getUserType(): 'user' | 'orga' | null {
    return this.getStorageItem('userType') as 'user' | 'orga' | null;
  }

  clearAuth() {
    this.removeStorageItem('token');
    this.removeStorageItem('refreshToken');
    this.removeStorageItem('userType');
  }

  async login(credentials: LoginCredentials, isOrganizer: boolean): Promise<AuthResponse> {
    const endpoint = isOrganizer ? '/api/orga/login' : '/api/users/login';

    const body = isOrganizer
      ? { mail: credentials.email, password: credentials.password }
      : { tel: credentials.phone, password: credentials.password };

    console.log('Login request:', { endpoint, body: { ...body, password: '***' } });

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur de connexion');
    }

    let token = null;
    let refreshToken = null;
    let payload = null;

    if (data.data && data.data.accessToken) {
      token = data.data.accessToken;
      refreshToken = data.data.refreshToken;
      payload = data.data;
    } else if (data.data && data.data.token) {
      token = data.data.token;
      refreshToken = data.data.refreshToken;
      payload = data.data;
    } else if (data.accessToken) {
      token = data.accessToken;
      refreshToken = data.refreshToken;
      payload = data;
    } else if (data.token) {
      token = data.token;
      refreshToken = data.refreshToken;
      payload = data;
    }

    if (!token) {
      console.error('Structure de réponse non reconnue:', data);
      throw new Error("Le serveur n'a pas retourné de token.");
    }

    this.setToken(token);
    if (refreshToken) this.setRefreshToken(refreshToken);
    this.setUserType(isOrganizer ? 'orga' : 'user');

    console.log('Login réussi pour', isOrganizer ? 'orga' : 'user');
    return payload;
  }

  async register(data: RegisterData, isOrganizer: boolean): Promise<AuthResponse> {
    const endpoint = isOrganizer ? '/api/orga/register' : '/api/users/register';

    const body = isOrganizer
      ? {
          name: data.name,
          mail: data.email,
          password: data.password,
          description: data.description,
          tel: data.phone,
        }
      : {
          firstname: data.firstname,
          lastname: data.lastname,
          tel: data.phone,
          password: data.password,
          birthday: data.birthday,
          mail: data.email,
        };

    console.log('Register request:', { endpoint, body: { ...body, password: '***' } });

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('Register response:', result);

    if (!response.ok) {
      throw new Error(result.error || result.message || "Erreur lors de l'inscription");
    }

    console.log('Inscription réussie, connexion automatique...');

    const loginCredentials: LoginCredentials = isOrganizer
      ? { email: data.email, password: data.password }
      : { phone: data.phone, password: data.password };

    return await this.login(loginCredentials, isOrganizer);
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    const userType = this.getUserType();

    if (token && userType) {
      const endpoint = userType === 'orga' ? '/api/orga/logout' : '/api/users/logout';
      try {
        await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearAuth();
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    const userType = this.getUserType();

    if (!refreshToken || !userType) {
      console.log('No refresh token or user type available');
      return null;
    }

    try {
      const endpoint = userType === 'orga' ? '/api/orga/refresh' : '/api/users/refresh';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Refresh token failed');
      }

      const newToken = data.data?.accessToken || data.accessToken || data.data?.token || data.token;

      if (!newToken) {
        throw new Error('No token in refresh response');
      }

      this.setToken(newToken);
      return newToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearAuth();
      return null;
    }
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getToken();

    if (!token) {
      throw new Error('No token available');
    }

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      token = await this.refreshAccessToken();

      if (token) {
        return fetch(`${API_URL}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        throw new Error('Failed to refresh token');
      }
    }

    return response;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const userType = this.getUserType();
    return !!token && !!userType;
  }

  async validateAndGetUserType(): Promise<'user' | 'orga' | null> {
    let token = this.getToken();
    const userType = this.getUserType();

    if (!token || !userType) {
      console.log('No token or userType found');
      this.clearAuth();
      return null;
    }

    try {
      // Validate token by calling the appropriate endpoint
      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';
      let response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If token expired, try to refresh
      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        token = await this.refreshAccessToken();

        if (token) {
          // Retry with new token
          response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          console.log('Failed to refresh token');
          this.clearAuth();
          return null;
        }
      }

      if (!response.ok) {
        console.log('Token invalid for userType:', userType);
        this.clearAuth();
        return null;
      }

      console.log('Token valid for userType:', userType);
      return userType;
    } catch (error) {
      console.error('Error validating token:', error);
      this.clearAuth();
      return null;
    }
  }

  async getCurrentProfile(): Promise<User | Orga | null> {
    try {
      const userType = this.getUserType();
      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';

      const response = await this.authenticatedFetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération du profil');
      }

      return data.data || data;
    } catch (error) {
      console.error('Error fetching current profile:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const userType = this.getUserType();
    if (userType !== 'user') return null;
    return await this.getCurrentProfile() as User | null;
  }

  async getCurrentOrga(): Promise<Orga | null> {
    const userType = this.getUserType();
    if (userType !== 'orga') return null;
    return await this.getCurrentProfile() as Orga | null;
  }

  async updateCurrentProfile(updates: Partial<User | Orga>): Promise<User | Orga | null> {
    try {
      const userType = this.getUserType();
      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';

      const response = await this.authenticatedFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
      }

      return data.data || data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async updateCurrentUser(updates: Partial<User>): Promise<User | null> {
    return await this.updateCurrentProfile(updates) as User | null;
  }

  async updateCurrentOrga(updates: Partial<Orga>): Promise<Orga | null> {
    return await this.updateCurrentProfile(updates) as Orga | null;
  }

  async uploadOrgaLogo(file: File): Promise<string> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token available');
    }

    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`${API_URL}/api/orga/logo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de l\'upload du logo');
    }

    const data = await response.json();
    return data.data.logo_path;
  }

  async deleteOrgaLogo(): Promise<void> {
    const response = await this.authenticatedFetch('/api/orga/logo', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la suppression du logo');
    }
  }

  async validateToken(): Promise<boolean> {
    let token = this.getToken();

    if (!token) {
      console.log('No token found');
      return false;
    }

    try {
      const userType = this.getUserType();
      if (!userType) {
        console.log('No user type found');
        this.clearAuth();
        return false;
      }

      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';
      let response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If token expired, try to refresh
      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        token = await this.refreshAccessToken();

        if (token) {
          response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          console.log('Failed to refresh token');
          this.clearAuth();
          return false;
        }
      }

      if (!response.ok) {
        console.log('Token invalid, clearing auth');
        this.clearAuth();
        return false;
      }

      console.log('Token valid');
      return true;
    } catch (error) {
      console.error('Error checking token:', error);
      this.clearAuth();
      return false;
    }
  }
}

export const authService = new AuthService();
