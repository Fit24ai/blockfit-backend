import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  isNumber,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  walletAddress: string;
  
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number: string;
}
