import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminService } from '../admin.service';
import { AdminJwtStrategy } from './admin.strategy';
import { AdminAuthGuard } from './admin.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
  ],
  providers: [AdminService, AdminJwtStrategy, AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminModule {}
