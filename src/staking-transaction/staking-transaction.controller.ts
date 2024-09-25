import { Controller } from '@nestjs/common';
import { StakingTransactionService } from './staking-transaction.service';

@Controller('staking-transaction')
export class StakingTransactionController {
  constructor(private readonly stakingTransactionService: StakingTransactionService) {}
}
