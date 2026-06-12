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
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
      }
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      console.log('[MinioService] Bucket ready and policy set to public:', this.bucket);
    } catch (err: any) {
      console.warn('[MinioService] MinIO unavailable at startup:', err.message);
    }
  }

  async upload(objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
        'Content-Type': contentType,
      });
      return objectName;
    } catch (err: any) {
      console.error('[MinioService] Upload failed:', err.message);
      throw new Error('File storage unavailable: ' + err.message);
    }
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
    const url = await this.client.presignedGetObject(this.bucket, objectName, expiry);
    const appUrl = process.env.APP_URL || 'https://demo.jtsc.vn';
    if (appUrl.startsWith('https://') || appUrl.includes('demo.jtsc.vn')) {
      const publicUrl = appUrl.replace(/\/$/, '');
      const urlObj = new URL(url);
      return `${publicUrl}${urlObj.pathname}${urlObj.search}`;
    }
    return url;
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
