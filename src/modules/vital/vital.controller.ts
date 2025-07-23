import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Controller('vital')
export class VitalController {
  constructor(private readonly databaseService: DatabaseService) { }

  @Get('hello')
  async getHello(): Promise<string> {
    const dbTime = await this.databaseService.getCurrentTime();
    return `Hello World! <br/> DB Time: ${dbTime}`;
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
}
