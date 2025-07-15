import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class AwsBucketClient {
  private s3Client: S3Client;
  constructor(private readonly userId: string) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
    });
  }

  async uploadFile(file: Express.Multer.File) {
    const command = new PutObjectCommand({
      Bucket: this.userId,
      Key: file.originalname,
      Body: file.buffer,
      Metadata: {
        'Content-Type': file.mimetype,
        userId: this.userId,
      },
    });
    await this.s3Client.send(command);
  }

  async downloadFile(fileName: string) {
    const command = new GetObjectCommand({
      Bucket: this.userId,
      Key: fileName,
      ResponseContentType: 'application/octet-stream',
    });

    const response = await this.s3Client.send(command);
    return response.Body;
  }

  async deleteFile(fileName: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.userId,
      Key: fileName,
    });
    await this.s3Client.send(command);
  }

  async listFiles() {
    const command = new ListObjectsCommand({
      Bucket: this.userId,
    });
    const response = await this.s3Client.send(command);
    return response.Contents;
  }
}
