export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  privileges: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  tokenValidityHours: number;
}

export interface UserSession {
  userId: number;
  username: string;
  role: string;
  privileges: string[];
  tokenValidityHours: number;
  loginTime: Date;
  lastActivity: Date;
} 