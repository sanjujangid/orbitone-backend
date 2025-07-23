export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
    role: string;
    privileges: string[];
  };
}

export interface TokenPayload {
  sub: number;
  username: string;
  role: string;
  privileges: string[];
  tokenValidityHours: number;
  iat: number;
  exp: number;
} 