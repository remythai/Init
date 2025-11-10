import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  tel?: string;
  password: string;
}

export interface RegisterData {
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  tel?: string;
  password: string;
  birthday?: string;
  description?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user?: any;
  orga?: any;
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
  created_at?: string;
  updated_at?: string;
}

class AuthService {
  async setToken(token: string) {
    if (!token) {
      console.warn('Tentative de sauvegarde d\'un token undefined/null');
      return;
    }
    await AsyncStorage.setItem('token', token);
  }

  async setRefreshToken(refreshToken: string) {
    if (!refreshToken) {
      console.warn('Tentative de sauvegarde d\'un refreshToken undefined/null');
      return;
    }
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  async setUserType(userType: 'user' | 'orga') {
    if (!userType) {
      console.warn('Tentative de sauvegarde d\'un userType undefined/null');
      return;
    }
    await AsyncStorage.setItem('userType', userType);
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token');
  }

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem('refreshToken');
  }

  async getUserType(): Promise<'user' | 'orga' | null> {
    return (await AsyncStorage.getItem('userType')) as 'user' | 'orga' | null;
  }

  async clearAuth() {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'userType']);
  }

  async login(credentials: LoginCredentials, isOrganizer: boolean): Promise<AuthResponse> {
    const endpoint = isOrganizer ? '/api/orga/login' : '/api/users/login';

    const body = isOrganizer 
      ? { mail: credentials.email, password: credentials.password }
      : { tel: credentials.phone || credentials.tel, password: credentials.password };

    console.log('Login request:', { endpoint, body: { ...body, password: '***' } });

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Login response complète:', JSON.stringify(data, null, 2));

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
      console.log('Token trouvé dans data.data.accessToken');
    } else if (data.data && data.data.token) {
      token = data.data.token;
      refreshToken = data.data.refreshToken;
      payload = data.data;
      console.log('Token trouvé dans data.data.token');
    } else if (data.accessToken) {
      token = data.accessToken;
      refreshToken = data.refreshToken;
      payload = data;
      console.log('Token trouvé dans data.accessToken');
    } else if (data.token) {
      token = data.token;
      refreshToken = data.refreshToken;
      payload = data;
      console.log('Token trouvé dans data.token');
    } else if (data.data?.data?.accessToken) {
      token = data.data.data.accessToken;
      refreshToken = data.data.data.refreshToken;
      payload = data.data.data;
      console.log('Token trouvé dans data.data.data.accessToken');
    } else if (data.data?.data?.token) {
      token = data.data.data.token;
      refreshToken = data.data.data.refreshToken;
      payload = data.data.data;
      console.log('Token trouvé dans data.data.data.token');
    }

    if (!token) {
      console.error('Structure de réponse non reconnue:', JSON.stringify(data, null, 2));
      throw new Error("Le serveur n'a pas retourné de token. Vérifiez la console pour plus de détails.");
    }

    console.log('Token extrait:', token.substring(0, 20) + '...');
    console.log('RefreshToken extrait:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'non fourni');

    await this.setToken(token);
    if (refreshToken) await this.setRefreshToken(refreshToken);
    await this.setUserType(isOrganizer ? 'orga' : 'user');

    console.log('Login réussi pour', isOrganizer ? 'orga' : 'user');
    return payload;
  }

  async register(data: RegisterData, isOrganizer: boolean): Promise<AuthResponse> {
    const endpoint = isOrganizer ? '/api/orga/register' : '/api/users/register';

    const body = isOrganizer
      ? {
          nom: data.name,
          mail: data.email,
          password: data.password,
          description: data.description,
          tel: data.phone || data.tel,
        }
      : {
          firstname: data.firstname,
          lastname: data.lastname,
          tel: data.phone || data.tel,
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
    console.log('Register response complète:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(result.error || result.message || "Erreur lors de l'inscription");
    }

    console.log('Inscription réussie, connexion automatique...');
    
    const loginCredentials: LoginCredentials = isOrganizer
      ? { email: data.email, password: data.password }
      : { phone: data.phone || data.tel, password: data.password };

    return await this.login(loginCredentials, isOrganizer);
  }

  async logout(): Promise<void> {
    const token = await this.getToken();
    const refreshToken = await this.getRefreshToken();
    const userType = await this.getUserType();

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

    await this.clearAuth();
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    const userType = await this.getUserType();

    if (!refreshToken || !userType) {
      console.log('No refresh token or user type available');
      return null;
    }

    try {
      const endpoint = userType === 'orga' ? '/api/orga/refresh' : '/api/users/refresh';
      
      console.log('Refresh token request:', { endpoint });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      await this.setToken(newToken);
      return newToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      await this.clearAuth();
      return null;
    }
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = await this.getToken();

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
      token = await this.refreshToken();
      
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

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    
    if (!token) {
      console.log('🔐 No token found');
      return false;
    }
  
    try {
      const userType = await this.getUserType();
      if (!userType) {
        console.log('🔐 No user type found');
        await this.clearAuth();
        return false;
      }
  
      const endpoint = userType === 'orga' ? '/api/orga/me' : '/api/users/me';
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (!response.ok) {
        console.log('🔐 Token invalid, clearing auth');
        await this.clearAuth();
        return false;
      }
  
      console.log('🔐 Token valid');
      return true;
    } catch (error) {
      console.error('🔐 Error checking token:', error);
      await this.clearAuth();
      return false;
    }
  }

  async getCurrentProfile(): Promise<User | Orga | null> {
    try {
      const userType = await this.getUserType();
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
    const userType = await this.getUserType();
    if (userType !== 'user') return null;
    return await this.getCurrentProfile() as User | null;
  }

  async getCurrentOrga(): Promise<Orga | null> {
    const userType = await this.getUserType();
    if (userType !== 'orga') return null;
    return await this.getCurrentProfile() as Orga | null;
  }

  async updateCurrentProfile(updates: Partial<User | Orga>): Promise<User | Orga | null> {
    try {
      const userType = await this.getUserType();
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
}

export const authService = new AuthService();