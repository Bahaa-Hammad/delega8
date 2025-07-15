import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
  ) {}

  async create(data: Partial<UserEntity>): Promise<Partial<UserEntity>> {
    const user = new UserEntity();
    user.email = data.email;
    user.name = data.name;
    await user.setPassword(data.password);
    const savedUser = await this.UserRepository.save(user);
    return instanceToPlain(savedUser);
  }

  async findAll(): Promise<Partial<UserEntity>[]> {
    return this.UserRepository.find();
  }

  async findOne(id: string): Promise<Partial<UserEntity>> {
    return this.UserRepository.findOneBy({ id });
  }

  async findFullOne(id: string): Promise<UserEntity> {
    // ensure password is not included
    return this.UserRepository.findOne({
      where: { id },
      select: {
        password: false,
      },
    });
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.findOne(id);
    if (data.password) {
      await user.setPassword(data.password);
    }
    return this.UserRepository.save({ ...user, ...data });
  }

  async delete(id: string): Promise<void> {
    await this.UserRepository.delete(id);
  }
}
