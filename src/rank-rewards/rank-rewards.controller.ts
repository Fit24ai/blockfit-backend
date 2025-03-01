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
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0x26128440d3F2e8385a287f349ab03202069E4A6b',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xFB3F9Eb5590a4295A0dFfb972C7020eC2EDc6D87',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xAb6AEf07A54cd86b1C995B165Ceb0170D77B02e4',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xDa32B4C2359f2C11f1C2aBD913cB18eFE9FFA461',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xE2c90A07D508a8D88963112B499eCECc1C7c5bC3',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xC35468b7427102c94e387d0798Dda9f295A3b868',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xeC6341C0D5068e8093425e67a3C8e92fff288768',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0x26128440d3F2e8385a287f349ab03202069E4A6b',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xDa32B4C2359f2C11f1C2aBD913cB18eFE9FFA461',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xA34b9d29467e0359b60034E54D3b883e8ADCBe1B',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xFE6a5591acdD4E0714f9D925011D748B2CB0a4Db',
    // );
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   '0xAdA1E2891a83Ffcdee96582eb459Af16D7ddB39b',
    // );
    // console.log({ address: req.user.walletAddress });
    // return this.rankRewardsService.getAllRanksAndUserEligibilities(
    //   req.user.walletAddress === '0x50Ca1fde29D62292a112A72671E14a5d4f05580f'
    //     ? '0xDa32B4C2359f2C11f1C2aBD913cB18eFE9FFA461'
    //     : '0xAdA1E2891a83Ffcdee96582eb459Af16D7ddB39b',
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
    //   '0xDa32B4C2359f2C11f1C2aBD913cB18eFE9FFA461',
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
