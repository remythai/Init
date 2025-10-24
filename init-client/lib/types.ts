export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  }
  
  export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    user: User;
  }