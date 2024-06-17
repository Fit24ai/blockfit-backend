import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PaymenReceivedDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  id: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  amount: number;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  user: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsNumber()
  block_number: number;

  @IsNotEmpty()
  @ApiProperty()
  @IsNumber()
  block_timestamp: number;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  transaction_hash: string;
}