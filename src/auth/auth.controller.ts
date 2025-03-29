import { Controller, Post, Body, Get, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service'; 
import { AuthGuard } from './auth.guard'; 
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from './role.enum'; 

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: any) {
    if (!createUserDto.role) {
      createUserDto.role = 'user';
    }
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    const token = authHeader.split(' ')[1]; 
    if (!token) {
      throw new UnauthorizedException('Token is missing or malformed');
    }

    try {
      const decoded: any = this.jwtService.verify(token); 
      const user = await this.userService.findOne(decoded.username);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('users')
  async getUsers() {
    return this.userService.findAll(); 
  }

  @Post('check-username')
  async checkUsername(@Body() body: { username: string }) {
    const usernameExists = await this.userService.findOne(body.username);
    return { exists: !!usernameExists }; 
  }
}
