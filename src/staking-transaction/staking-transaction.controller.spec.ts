import { Test, TestingModule } from '@nestjs/testing';
import { StakingTransactionController } from './staking-transaction.controller';
import { StakingTransactionService } from './staking-transaction.service';

describe('StakingTransactionController', () => {
  let controller: StakingTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StakingTransactionController],
      providers: [StakingTransactionService],
    }).compile();

    controller = module.get<StakingTransactionController>(StakingTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
