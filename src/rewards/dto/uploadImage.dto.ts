import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  image: Express.Multer.File[];
}
