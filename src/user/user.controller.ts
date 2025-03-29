import { Controller, Get, Put, Delete, Param, Body, UseGuards, UnauthorizedException, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { UserService } from './user.service'; 
import { User } from './user.entity'; 

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/edit')
async editUser(
  @Param('id') id: string,
  @Body() body: { username: string },
  @Request() req,
) {
  const loggedInUser = req.user;

  if (loggedInUser.role === 'admin') {
    return this.userService.updateUsername(Number(id), body.username); 
  }

  if (loggedInUser.id !== Number(id)) {
    throw new UnauthorizedException('You are not allowed to update another user\'s username.');
  }

  return this.userService.updateUsername(Number(id), body.username); 
}
@UseGuards(JwtAuthGuard)
@Delete(':id')
async deleteUser(@Param('id') id: string) {
  return this.userService.deleteUser(Number(id)); 
}

}
