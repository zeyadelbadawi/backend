// src/auth/auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
  handleRequest(err, user) {
    // Simply return the user if token is valid
    return user;
  }
}
