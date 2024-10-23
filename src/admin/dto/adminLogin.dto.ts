import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  isNumber,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class AdminLoginDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password: string;
}
