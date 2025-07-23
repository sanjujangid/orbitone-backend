import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RequirePrivileges } from '../auth/decorators/privileges.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('superadmin')
@UseGuards(AuthGuard)
@RequirePrivileges('superadmin')
export class SuperadminController {
  constructor(private readonly databaseService: DatabaseService) { }

  @Get('hello')
  async getHello(@CurrentUser() user: any): Promise<string> {
    const dbTime = await this.databaseService.getCurrentTime();
    return `Hello ${user.username}! <br/> DB Time: ${dbTime}`;
  }

  @Get('health')
  async getHealth(): Promise<{ status: string; data: { database: boolean } }> {
    const dbHealth = await this.databaseService.healthCheck();
    return {
      status: 'ok',
      data: {
        database: dbHealth
      }
    };
  }

  @Get('stats')
  async getDatabaseStats(): Promise<any> {
    return await this.databaseService.getDatabaseStats();
  }

  @Get('users')
  @RequirePrivileges('superadmin', 'admin')
  async getUsers(): Promise<any> {
    const users = await this.databaseService.queryAll(`
      SELECT 
        u.id, u.username, u.email, u.role, u.is_active,
        u.last_login_at, u.created_at,
        ARRAY_AGG(p.privilege_name) as privileges
      FROM users u
      LEFT JOIN user_privileges up ON u.id = up.user_id
      LEFT JOIN privileges p ON up.privilege_id = p.id
      GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.last_login_at, u.created_at
      ORDER BY u.created_at DESC
    `);
    return { users };
  }
}
