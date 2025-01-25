import { IsNumber, IsString } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  qualifierAmount: number;
}
