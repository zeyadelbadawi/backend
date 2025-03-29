import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';  
import { JwtStrategy } from './jwt.strategy'; 

@Module({
  imports: [
    JwtModule.register({
      secret: 'secretKey', 
      signOptions: { expiresIn: '60m' },
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
