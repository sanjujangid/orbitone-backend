import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'PG_CONNECTION',
      useFactory: async (config: ConfigService) => new Pool({
        host: config.get('DB_HOST'),
        port: +config.get('DB_PORT'),
        user: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
      }),
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ['PG_CONNECTION', DatabaseService]
})
export class DatabaseModule {}