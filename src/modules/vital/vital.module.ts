import { Module } from '@nestjs/common';
import { VitalController } from './vital.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VitalController],
})
export class VitalModule {}