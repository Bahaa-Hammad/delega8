// src/config/encryption.config.ts

import { ConfigService } from '@nestjs/config';
import { EncryptionTransformer } from 'typeorm-encrypted';

export function createEncryptionTransformer(
  configService: ConfigService,
): EncryptionTransformer {
  const key = configService.get<string>('encryptionKey');

  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables!');
  }

  // Return the encryption transformer instance
  return new EncryptionTransformer({
    key: process.env.ENCRYPTION_KEY?.trim() || '', // must be 32 bytes for aes-256-cbc
    algorithm: 'aes-256-cbc',
    ivLength: 16, // standard IV length for aes-256-cbc
    // optional: encoding, etc.
  });
}
