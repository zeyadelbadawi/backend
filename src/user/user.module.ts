// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserController } from './user.controller';  // Import the controller

@Module({
  imports: [TypeOrmModule.forFeature([User])],  // Include the User entity in the module
  providers: [UserService],
  controllers: [UserController],  // Add the controller here
  exports: [UserService],  // Export UserService so it can be used in other modules
})
export class UserModule {}
