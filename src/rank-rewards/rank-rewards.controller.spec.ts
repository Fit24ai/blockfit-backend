import { Test, TestingModule } from '@nestjs/testing';
import { RankRewardsController } from './rank-rewards.controller';
import { RankRewardsService } from './rank-rewards.service';

describe('RankRewardsController', () => {
  let controller: RankRewardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RankRewardsController],
      providers: [RankRewardsService],
    }).compile();

    controller = module.get<RankRewardsController>(RankRewardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
