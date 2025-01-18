import { Controller } from '@nestjs/common';
import { RankRewardsService } from './rank-rewards.service';

@Controller('rank-rewards')
export class RankRewardsController {
  constructor(private readonly rankRewardsService: RankRewardsService) {}
}
