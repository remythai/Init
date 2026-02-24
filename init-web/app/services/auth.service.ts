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
  private refreshPromise: Promise<string | null> | null = null;

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

  getUserType(): 'user' | 'orga' | null {
    return this.getStorageItem('userType') as 'user' | 'orga' | null;
  }

  clearAuth() {
    this.removeStorageItem('token');
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
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur de connexion');
    }

    let token = null;
    let payload = null;

    if (data.data && data.data.accessToken) {
      token = data.data.accessToken;
      payload = data.data;
    } else if (data.data && data.data.token) {
      token = data.data.token;
      payload = data.data;
    } else if (data.accessToken) {
      token = data.accessToken;
      payload = data;
    } else if (data.token) {
      token = data.token;
      payload = data;
    }

    if (!token) {
      console.error('Structure de réponse non reconnue:', data);
      throw new Error("Le serveur n'a pas retourné de token.");
    }

    this.setToken(token);
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
      credentials: 'include',
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
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearAuth();
  }

  async refreshAccessToken(): Promise<string | null> {
    // Mutex: if a refresh is already in flight, wait for it instead of firing a second one
    // This prevents race conditions when multiple 401s trigger simultaneous refreshes
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<string | null> {
    const userType = this.getUserType();

    if (!userType) {
      console.log('No user type available');
      return null;
    }

    try {
      const endpoint = userType === 'orga' ? '/api/orga/refresh' : '/api/users/refresh';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        // Refresh token is truly invalid/expired — clear auth
        this.clearAuth();
        return null;
      }

      if (!response.ok) {
        // Rate limit (429), server error (500), etc. — don't clear auth, just fail silently
        console.warn('Refresh failed with status:', response.status);
        return null;
      }

      const data = await response.json();
      const newToken = data.data?.accessToken || data.accessToken || data.data?.token || data.token;

      if (!newToken) {
        console.warn('No token in refresh response');
        return null;
      }

      this.setToken(newToken);
      return newToken;
    } catch (error) {
      // Network error — don't clear auth, user might just be offline
      console.error('Refresh token error:', error);
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
      credentials: 'include',
    });

    if (response.status === 401) {
      token = await this.refreshAccessToken();

      if (token) {
        return fetch(`${API_URL}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
      // Refresh failed — return the original 401 response so the caller can handle it
      return response;
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
      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';
      let response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        token = await this.refreshAccessToken();

        if (token) {
          response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
        } else {
          console.log('Failed to refresh token');
          this.clearAuth();
          return null;
        }
      }

      if (response.status === 403) {
        this.clearAuth();
        return null;
      }

      if (!response.ok) {
        // Server error / rate limit — don't clear auth
        console.warn('Validation request failed with status:', response.status);
        return userType;
      }

      return userType;
    } catch (error) {
      // Network error — don't log out the user
      console.error('Error validating token:', error);
      return userType;
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
      credentials: 'include',
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
        credentials: 'include',
      });

      if (response.status === 401) {
        console.log('Token expired, attempting refresh...');
        token = await this.refreshAccessToken();

        if (token) {
          response = await fetch(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
        } else {
          console.log('Failed to refresh token');
          this.clearAuth();
          return false;
        }
      }

      if (response.status === 403) {
        this.clearAuth();
        return false;
      }

      if (!response.ok) {
        // Server error / rate limit — assume token is still valid
        console.warn('Validation request failed with status:', response.status);
        return true;
      }

      return true;
    } catch (error) {
      // Network error — don't log out the user
      console.error('Error checking token:', error);
      return true;
    }
  }
}

export const authService = new AuthService();
