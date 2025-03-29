import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum'; 
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector, 
    private jwtService: JwtService, 
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1]; 

    if (!token) {
      return false;
    }

    try {
      const decoded: any = this.jwtService.verify(token);

      console.log('Decoded Token:', decoded);

      const userRole = decoded?.role; 

      return requiredRoles.includes(userRole);
    } catch (error) {
      return false;
    }
  }
}
