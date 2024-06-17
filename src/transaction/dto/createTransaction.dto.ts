import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ChainEnum } from 'src/types/transaction';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  transactionHash: string;

  @IsEnum(ChainEnum)
  @IsNotEmpty()
  chain: ChainEnum;
}
