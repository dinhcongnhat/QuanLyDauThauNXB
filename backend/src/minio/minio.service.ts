import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'qldanxb';
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'jtscminio.duckdns.org',
      port: parseInt(process.env.MINIO_PORT || '443', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'jtsc',
      secretKey: process.env.MINIO_SECRET_KEY || 'jtsc12345',
    });
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return objectName;
  }

  async download(objectName: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectName);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getPresignedUrl(objectName: string, expiry = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectName, expiry);
  }

  async delete(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName);
  }

  async exists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }
}
