import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MessagingGateway } from './modules/messaging/messaging.gateway';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { VitalModule } from './modules/vital/vital.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    SuperadminModule,
    VitalModule,
  ],
  providers: [MessagingGateway],
})
export class AppModule {}
