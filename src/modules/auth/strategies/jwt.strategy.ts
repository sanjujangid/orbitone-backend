import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { TokenPayload } from '../interfaces/auth-response.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: TokenPayload) {
    try {
      const userSession = await this.authService.verifyToken(
        payload.sub.toString()
      );
      
      if (!userSession) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        userId: userSession.userId,
        username: userSession.username,
        role: userSession.role,
        privileges: userSession.privileges,
      };
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
} 