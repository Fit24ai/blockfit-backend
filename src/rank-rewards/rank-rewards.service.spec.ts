import { Test, TestingModule } from '@nestjs/testing';
import { RankRewardsService } from './rank-rewards.service';

describe('RankRewardsService', () => {
  let service: RankRewardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RankRewardsService],
    }).compile();

    service = module.get<RankRewardsService>(RankRewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
