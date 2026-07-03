import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID', 'placeholder');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY', 'placeholder');

    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'ap-south-1'),
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = config.get<string>('AWS_S3_BUCKET', 'home-service-uploads');
  }

  async uploadFile(file: Express.Multer.File, folder = 'general'): Promise<string> {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed. Allowed: JPG, PNG, WEBP, PDF');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const region = this.config.get<string>('AWS_REGION', 'ap-south-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async uploadMultiple(files: Express.Multer.File[], folder = 'general'): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadFile(f, folder)));
  }
}
