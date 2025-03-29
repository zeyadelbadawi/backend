import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Logger } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  // Method to validate user credentials
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findOne(username);
    if (user && bcrypt.compareSync(pass, user.password)) {
      const { password, ...result } = user;
      this.logger.log(`User ${username} validation successful`);
      return result;
    }
    this.logger.warn(`User ${username} validation failed`);
    return null;
  }

  // Login method
  async login(user: User) {
    const userData = await this.userService.findOne(user.username);

    if (!userData) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validUser = await this.validateUser(user.username, user.password);
    if (!validUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      username: userData.username, 
      sub: userData.id, 
      role: userData.role 
    };

    this.logger.log(`User ${user.username} logged in successfully`);

    return {
      access_token: this.jwtService.sign(payload),
      userId: userData.id,
      role: userData.role,
    };
  }

  // Registration method
  async register(createUserDto: CreateUserDto): Promise<User> {
    const role = createUserDto.role || 'user';
    const user = await this.userService.create(createUserDto.username, createUserDto.password, role);
    this.logger.log(`User ${createUserDto.username} registered successfully with role ${role}`);

    return user;
  }
}
