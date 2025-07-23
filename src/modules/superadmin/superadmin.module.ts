import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SuperadminController],
})
export class SuperadminModule {}