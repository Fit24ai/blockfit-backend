import { Module } from '@nestjs/common';
import { RankRewardsService } from './rank-rewards.service';
import { RankRewardsController } from './rank-rewards.controller';

@Module({
  controllers: [RankRewardsController],
  providers: [RankRewardsService],
})
export class RankRewardsModule {}
