import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StakingService } from './staking.service';
import { StakeDuration } from './schema/stakeDuration.schema';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';

@Controller('staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('create/:txHash')
  async createStakingRecord(@Param('txHash') txHash: string) {
    return this.stakingService.createStakingRecord(txHash);
  }

  @Get('get-all-Stakes-by-user/:walletAddress')
  async getAllStakesByUser(@Param('walletAddress') walletAddress: string) {
    return this.stakingService.getAllStakesByUser(walletAddress);
  }

  @Post('create-stake-duration')
  async createStakeDuration(
    @Body() StakeDuration: { poolType: number; duration: number },
  ) {
    return this.stakingService.createStakeDuration(StakeDuration);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-claimed-reward-for-stake/:txHash')
  async createClaimedRewardForStake(@Param('txHash') txHash:string) {
    return this.stakingService.createClaimedRewardForStake(txHash);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-claimed-rewards')
  async getAllClaimedRewardsByUser(@Request() req: UserRequest) {
    return this.stakingService.getAllClaimedRewardsByUser(
      req.user.walletAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-referral-stream')
  async getReferralStream(@Request() req: UserRequest) {
    return this.stakingService.getReferralStream(req.user.walletAddress);
  }
}
