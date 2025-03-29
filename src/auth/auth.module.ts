// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';  // Import UserModule
import { JwtStrategy } from './jwt.strategy'; 

@Module({
  imports: [
    JwtModule.register({
      secret: 'secretKey', // Use environment variables in production
      signOptions: { expiresIn: '60m' },
    }),
    forwardRef(() => UserModule),  // Use forwardRef to resolve circular dependency
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Add JwtStrategy to providers here
})
export class AuthModule {}
