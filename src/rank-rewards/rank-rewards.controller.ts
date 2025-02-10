import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RankRewardsService } from './rank-rewards.service';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';

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

  @Post('/update-unique-features')
  async updateRankUniqueFeatures(
    @Body() body: { rank: number; uniqueFeatures: string[] },
  ) {
    return this.rankRewardsService.updateUniqueFeatures(body);
  }

  @Post('update-salary-text')
  async updateSalaryText(@Body() body: any) {
    this.rankRewardsService.updateSalaryText(body);
  }

  @Post('update')
  async updateReward(@Body() body: any) {
    this.rankRewardsService.updateReward(body);
  }

  @Get('business-details/:address')
  async getTotalBusinessDetails(@Param('address') address: string) {
    return this.rankRewardsService.getTotalBusinessDetails(address);
  }

  @Get('ranks')
  @UseGuards(JwtAuthGuard)
  async getAllRanksAndUserEligibilities(@Request() req: UserRequest) {
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xAdA1E2891a83Ffcdee96582eb459Af16D7ddB39b',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0x53bC7cEC2EEc02f1CC467a7c2B9B5FC5D659acff',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
    // );

    return this.rankRewardsService.getAllRanksAndUserEligibilities(
      req.user.walletAddress,
    );
  }

  @Get('claim-rank/:rankId')
  @UseGuards(JwtAuthGuard)
  async claimRankReward(
    @Request() req: UserRequest,
    @Param('rankId') rankId: string,
  ) {
    // return this.rankRewardsService.claimRankReward(
    //   '0x53bC7cEC2EEc02f1CC467a7c2B9B5FC5D659acff',
    //   rankId,
    // );

    return this.rankRewardsService.claimRankReward(
      req.user.walletAddress,
      rankId,
    );
  }

  @Get('all-users')
  async getAllUsers() {
    return this.rankRewardsService.getAllUsers();
  }
}
