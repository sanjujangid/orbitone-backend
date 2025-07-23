import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const userSession = await this.authService.verifyToken(token);
      request.user = {
        userId: userSession.userId,
        username: userSession.username,
        role: userSession.role,
        privileges: userSession.privileges,
      };

      // Check if specific privileges are required
      const requiredPrivileges = this.reflector.get<string[]>(
        'privileges',
        context.getHandler(),
      );

      if (requiredPrivileges && requiredPrivileges.length > 0) {
        const hasPrivilege = requiredPrivileges.some(privilege =>
          userSession.privileges.includes(privilege),
        );

        if (!hasPrivilege) {
          throw new ForbiddenException(
            `Insufficient privileges. Required: ${requiredPrivileges.join(', ')}`,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 