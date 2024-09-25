import { Test, TestingModule } from '@nestjs/testing';
import { StakingTransactionService } from './staking-transaction.service';

describe('StakingTransactionService', () => {
  let service: StakingTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StakingTransactionService],
    }).compile();

    service = module.get<StakingTransactionService>(StakingTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
