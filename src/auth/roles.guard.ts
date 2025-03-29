// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum'; // Import the Role enum
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector, // Reflector is used to access metadata (the roles)
    private jwtService: JwtService, // JwtService is used to verify the token
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Get the required roles from the handler's metadata using Reflector
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());

    // If no roles are defined for this route, allow access
    if (!requiredRoles) {
      return true;
    }

    // Extract the request and authorization token from the incoming request
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1]; // Extract token from "Bearer <token>"

    // If the token is missing, deny access
    if (!token) {
      return false;
    }

    try {
      // Verify the token and decode it
      const decoded: any = this.jwtService.verify(token);

      // Log the decoded payload to see if the role is included correctly (optional)
      console.log('Decoded Token:', decoded);

      const userRole = decoded?.role; // Get the user's role from the decoded token

      // Check if the user's role matches any of the required roles
      return requiredRoles.includes(userRole);
    } catch (error) {
      // If the token is invalid or expired, deny access
      return false;
    }
  }
}
