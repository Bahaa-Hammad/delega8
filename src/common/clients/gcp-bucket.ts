import { Injectable } from '@nestjs/common';
import { Storage, Bucket } from '@google-cloud/storage';

@Injectable()
export class GcpBucketClient {
  private storage: Storage;
  private bucket: Bucket;

  constructor(private userId: string) {
    // Typically you'd inject or load the bucket name from env variables
    const bucketName = process.env.GCS_BUCKET_NAME || 'deleg8';

    // Initialize the GCP Storage client
    this.storage = new Storage();

    // Instead of creating a new bucket for every user,
    // we get a reference to the single bucket
    this.bucket = this.storage.bucket(bucketName);
  }

  // If you truly want to ensure the bucket is created if it doesn't exist
  // (rarely needed if you manage buckets via infra/IaC), you could do something like this:
  // But usually you'd handle bucket creation once, outside of this code path.
  private async createBucketIfMissing(bucketName: string) {
    const [exists] = await this.bucket.exists();
    if (!exists) {
      await this.storage.createBucket(bucketName);
    }
  }

  /**
   * Uploads a file to:
   *  <bucket>/<userId>/<fileName>
   */
  async uploadFile(file: Express.Multer.File): Promise<void> {
    await this.createBucketIfMissing(this.bucket.name);

    // Construct the path so it's userId/<filename>
    const filePath = `${this.userId}/${file.originalname}`;
    const blob = this.bucket.file(filePath);

    // Streams are often used for large file uploads
    const stream = blob.createWriteStream();
    stream.end(file.buffer);
  }

  /**
   * Downloads a file from:
   *  <bucket>/<userId>/<fileName>
   */
  async downloadFile(fileName: string): Promise<Buffer> {
    await this.createBucketIfMissing(this.bucket.name);

    const filePath = `${this.userId}/${fileName}`;
    const [fileBuffer] = await this.bucket.file(filePath).download();
    return fileBuffer;
  }

  /**
   * Deletes a file at:
   *  <bucket>/<userId>/<fileName>
   */
  async deleteFile(fileName: string): Promise<void> {
    await this.createBucketIfMissing(this.bucket.name);

    const filePath = `${this.userId}/${fileName}`;
    await this.bucket.file(filePath).delete();
  }

  /**
   * Lists all files in the folder:
   *  <bucket>/<userId>/
   */
  async listFiles(): Promise<string[]> {
    await this.createBucketIfMissing(this.bucket.name);

    // The prefix is the 'folder' path
    const [files] = await this.bucket.getFiles({ prefix: `${this.userId}/` });
    // Return their full paths or just filenames
    return files.map((file) => file.name);
  }
}
