import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RankRewardsService } from './rank-rewards.service';

@Controller('rank-rewards')
export class RankRewardsController {
  constructor(private readonly rankRewardsService: RankRewardsService) {}

  @Post('create-rank')
  async createRank(@Body() body: any) {
    this.rankRewardsService.createRank(body);
  }

  @Post('update-reward-amount')
  async updateRewardAmount(@Body() body: any) {
    this.rankRewardsService.updateRewardAmount(body);
  }

  @Get('business-details/:address')
  async getTotalBusinessDetails(@Param('address') address: string) {
    return this.rankRewardsService.getTotalBusinessDetails(address);
  }
}
