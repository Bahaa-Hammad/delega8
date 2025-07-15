// models/entities/model.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModelAvailability, ModelProvider } from './enums';
import { ModelParameters } from './types';
import { EncryptionTransformer } from 'typeorm-encrypted';

const encryptionTransformer = new EncryptionTransformer({
  key: Buffer.from((process.env.ENCRYPTION_KEY || '').trim(), 'utf-8').toString(
    'hex',
  ),
  algorithm: 'aes-256-cbc',
  ivLength: 16,
});

@Entity('models')
export class ModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ModelProvider,
  })
  provider: ModelProvider;

  @Column({
    type: 'enum',
    enum: ModelAvailability,
    default: ModelAvailability.ENABLED,
  })
  availability: ModelAvailability;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Store parameters as JSON for flexibility
  @Column({ type: 'jsonb', nullable: false, default: {} })
  parameters: ModelParameters;

  @Column({
    type: 'text',
    nullable: true,
    select: false,
    transformer: encryptionTransformer,
  })
  apiKey?: string;

  // Common audit columns
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
