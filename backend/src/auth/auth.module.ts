import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'qlda-procurement-jwt-secret-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EffectivePermissionsService,
    PermissionsGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtModule,
    EffectivePermissionsService,
    PermissionsGuard,
  ],
})
export class AuthModule {}
