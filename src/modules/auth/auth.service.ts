import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User, UserSession } from './interfaces/user.interface';
import { AuthResponse, TokenPayload } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private activeSessions = new Map<number, UserSession>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user and create session
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      // Call PostgreSQL procedure for authentication
      const result = await this.databaseService.queryOne(
        'CALL authenticate_user($1, $2, $3)',
        [loginDto.username, loginDto.password, new Date()]
      );

      if (!result || !result.user_id) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get user privileges and token validity from database
      const userData = await this.databaseService.queryOne(
        `SELECT 
          u.id, u.username, u.email, u.role, u.is_active,
          u.token_validity_hours,
          ARRAY_AGG(p.privilege_name) as privileges
        FROM users u
        LEFT JOIN user_privileges up ON u.id = up.user_id
        LEFT JOIN privileges p ON up.privilege_id = p.id
        WHERE u.id = $1 AND u.is_active = true
        GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.token_validity_hours`,
        [result.user_id]
      );

      if (!userData) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Logout any existing session for this user
      await this.logoutExistingSession(userData.id);

      // Create user session
      const userSession: UserSession = {
        userId: userData.id,
        username: userData.username,
        role: userData.role,
        privileges: userData.privileges || [],
        tokenValidityHours: userData.token_validity_hours || 24,
        loginTime: new Date(),
        lastActivity: new Date(),
      };

      // Store active session
      this.activeSessions.set(userData.id, userSession);

      // Generate tokens
      const tokens = await this.generateTokens(userSession);

      // Log successful login
      await this.databaseService.query(
        'INSERT INTO login_logs (user_id, login_time, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
        [userData.id, new Date(), '127.0.0.1', 'API']
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: userData.token_validity_hours * 3600, // Convert hours to seconds
        user: {
          id: userData.id,
          username: userData.username,
          role: userData.role,
          privileges: userData.privileges || [],
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Login failed: ' + error.message);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userSession = this.activeSessions.get(payload.sub);
      if (!userSession) {
        throw new UnauthorizedException('Session not found');
      }

      // Update last activity
      userSession.lastActivity = new Date();
      this.activeSessions.set(payload.sub, userSession);

      // Generate new tokens
      const tokens = await this.generateTokens(userSession);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: userSession.tokenValidityHours * 3600,
        user: {
          id: userSession.userId,
          username: userSession.username,
          role: userSession.role,
          privileges: userSession.privileges,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: number): Promise<void> {
    this.activeSessions.delete(userId);
    
    // Log logout
    await this.databaseService.query(
      'INSERT INTO logout_logs (user_id, logout_time) VALUES ($1, $2)',
      [userId, new Date()]
    );
  }

  /**
   * Verify token and return user session
   */
  async verifyToken(token: string): Promise<UserSession> {
    try {
      const payload = this.jwtService.verify(token) as TokenPayload;
      const userSession = this.activeSessions.get(payload.sub);

      if (!userSession) {
        throw new UnauthorizedException('Session not found');
      }

      // Check if token is still valid based on database validity
      const tokenAge = Date.now() - (payload.iat * 1000);
      const maxAge = userSession.tokenValidityHours * 3600 * 1000; // Convert to milliseconds

      if (tokenAge > maxAge) {
        this.activeSessions.delete(payload.sub);
        throw new UnauthorizedException('Token expired');
      }

      // Update last activity
      userSession.lastActivity = new Date();
      this.activeSessions.set(payload.sub, userSession);

      return userSession;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user privileges
   */
  async getUserPrivileges(userId: number): Promise<string[]> {
    const userSession = this.activeSessions.get(userId);
    return userSession ? userSession.privileges : [];
  }

  /**
   * Check if user has specific privilege
   */
  async hasPrivilege(userId: number, privilege: string): Promise<boolean> {
    const privileges = await this.getUserPrivileges(userId);
    return privileges.includes(privilege);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userSession: UserSession): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: userSession.userId,
      username: userSession.username,
      role: userSession.role,
      privileges: userSession.privileges,
      tokenValidityHours: userSession.tokenValidityHours,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (userSession.tokenValidityHours * 3600),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d', // Refresh token valid for 7 days
    });

    return { accessToken, refreshToken };
  }

  /**
   * Logout existing session for user
   */
  private async logoutExistingSession(userId: number): Promise<void> {
    const existingSession = this.activeSessions.get(userId);
    if (existingSession) {
      this.activeSessions.delete(userId);
      
      // Log forced logout
      await this.databaseService.query(
        'INSERT INTO logout_logs (user_id, logout_time, reason) VALUES ($1, $2, $3)',
        [userId, new Date(), 'New login - forced logout']
      );
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [userId, session] of this.activeSessions.entries()) {
      const sessionAge = now.getTime() - session.lastActivity.getTime();
      const maxAge = session.tokenValidityHours * 3600 * 1000;

      if (sessionAge > maxAge) {
        this.activeSessions.delete(userId);
        
        // Log expired session
        await this.databaseService.query(
          'INSERT INTO logout_logs (user_id, logout_time, reason) VALUES ($1, $2, $3)',
          [userId, now, 'Session expired']
        );
      }
    }
  }
} 