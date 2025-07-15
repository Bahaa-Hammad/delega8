import {
  Controller,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  // create user
  @Post()
  async create(
    @Body() data: Partial<UserEntity>,
  ): Promise<Partial<UserEntity>> {
    return this.userService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Partial<UserEntity>> {
    return this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<UserEntity>,
  ): Promise<UserEntity> {
    return this.userService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.userService.delete(id);
  }
}
