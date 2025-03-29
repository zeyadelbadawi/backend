// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Now accept role as a parameter for user creation
  async create(username: string, password: string, role: string): Promise<User> {
    const user = new User();
    user.username = username;
    user.password = await bcrypt.hash(password, 10); // Hash the password before saving
    user.role = role; // Assign the role passed to this method
    return this.userRepository.save(user); // Save the user to the database
  }

  // Check if username exists
  async checkUsername(username: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { username } });
    return !!user; // Returns true if user exists, false if not
  }
  // Fetch a single user by username
  async findOne(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  // Fetch all users
  async findAll(): Promise<User[]> {
    return this.userRepository.find(); // This will fetch all users from the database
  }
  
  async updateUsername(id: number, newUsername: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    const usernameExists = await this.checkUsername(newUsername);
  
    if (usernameExists) {
      throw new Error('Username already exists');
    }
  
    user.username = newUsername;
  
    return this.userRepository.save(user);
  }
  
  

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    await this.userRepository.remove(user);
  }

}
