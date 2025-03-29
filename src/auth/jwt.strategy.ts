// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private jwtService: JwtService,
    private userService: UserService, // Inject UserService to find the user
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from Bearer token
      ignoreExpiration: false,
      secretOrKey: 'secretKey', // Ensure this matches the secret in JwtModule
    });
  }

  async validate(payload: any): Promise<User> {
    // Check if user exists based on the payload's username
    const user = await this.userService.findOne(payload.username);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user; // Return the user if found
  }
}
