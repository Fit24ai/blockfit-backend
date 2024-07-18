import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ReferralReceivedDto {
//   @IsNotEmpty()
//   @IsString()
//   @ApiProperty()
//   id: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  referrer: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  buyer: string;


  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  buy_amount: string;


  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  referral_income: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  token: string;


  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  transaction_hash: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsNumber()
  block_number: number;

  @IsNotEmpty()
  @ApiProperty()
  @IsNumber()
  block_timestamp: number;
}
