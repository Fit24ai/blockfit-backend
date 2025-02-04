import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly s3Client = new S3Client({
    region: this.configService.get('AWS_REGION_S3'),
    credentials: {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID_S3'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY_S3'),
    },
  });

  constructor(private readonly configService: ConfigService) {}
  public async uploadFileToS3(file: string, fileName: string) {
    const base64Data = Buffer.from(
      file.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );

    const type = file.split(';')[0].split('/')[1];

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME_S3'),
        Key: `${fileName}.${type}`,
        Body: base64Data,
        ContentEncoding: 'base64',
        ContentType: 'image/png',
      }),
    );
    return `https://${this.configService.get('AWS_BUCKET_NAME_S3')}.s3.amazonaws.com/${fileName}.${type}`;
  }

  public async uploadMulterFileToS3(file: Buffer, fileName: string) {
    const res = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME_S3'),
        Key: fileName,
        Body: file,
      }),
    );
    return `https://${this.configService.get('AWS_BUCKET_NAME_S3')}.s3.amazonaws.com/${fileName}`;
  }

  public async uploadJsonToS3(json: string, fileName: string) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME_S3'),
        Key: fileName,
        Body: json,
        ContentType: 'application/json',
      }),
    );
    return `https://${this.configService.get('AWS_BUCKET_NAME_S3')}.s3.amazonaws.com/${fileName}`;
  }
}
