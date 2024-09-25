import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChainEnum } from 'src/types/transaction';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  transactionHash: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  apr: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  poolType: string;

  @IsEnum(ChainEnum)
  @IsNotEmpty()
  chain: ChainEnum;
}
