import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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

  @UseGuards(JwtAuthGuard)
  @Post('create/:txHash')
  async createStake(
    @Param('txHash') txHash: string,
    @Request() req: UserRequest,
    @Body('poolType') poolType: number,
  ) {
    return this.stakingService.createStake(
      txHash,
      req.user.walletAddress,
      poolType,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify/:txHash')
  async createStakingRecord(
    @Param('txHash') txHash: string,
    @Request() req: UserRequest,
  ) {
    return this.stakingService.verifyStakingRecord(
      txHash,
      req.user.walletAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
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
  async createClaimedRewardForStake(@Param('txHash') txHash: string) {
    return this.stakingService.createClaimedRewardForStake(txHash);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-claimed-rewards')
  async getAllClaimedRewardsByUser(@Request() req: UserRequest) {
    return this.stakingService.getAllClaimedRewardsByUser(
      req.user.walletAddress,
    );
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('get-referral-stream')
  // async getReferralStream(@Request() req: UserRequest) {
  //   return this.stakingService.getReferralStream(req.user.walletAddress);
  // }

  @UseGuards(JwtAuthGuard)
  @Get('get-referral-stream/:level?') // Make level optional with ?
  async getReferralStream(
    @Request() req: UserRequest,
    @Param('level') level?: number, // Make level optional
  ) {
    const walletAddress = req.user.walletAddress;
    return this.stakingService.getReferralStream(walletAddress, level);
  }

  @Get('get-user-staked-tokens')
  // @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getUserTotalStaked(@Request() req: UserRequest) {
    return this.stakingService.getUserTotalTokenStaked(req.user.walletAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-level-claimed-rewards')
  async getAllRefrralRewardClaimed(@Request() req: UserRequest) {
    return this.stakingService.getAllRefrralRewardClaimed(
      req.user.walletAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-stake-claimed-rewards')
  async getAllStakeRewardClaimed(@Request() req: UserRequest) {
    return this.stakingService.getAllStakeRewardClaimed(req.user.walletAddress);
  }

  @Get('get-total-members')
  @UseGuards(JwtAuthGuard)
  async getTotalMembers(@Request() req: UserRequest) {
    return this.stakingService.getTotalMembersAndStaked(req.user.walletAddress);
  }
  @Get('get-user-level')
  @UseGuards(JwtAuthGuard)
  async getUserLevel(@Request() req: UserRequest) {
    return this.stakingService.getDirectMemberswithStakedTokens(
      req.user.walletAddress,
    );
  }
  @Get('get-level/:address')
  // @UseGuards(JwtAuthGuard)
  async getLEVELUSER(@Param('address') address: string) {
    return this.stakingService.getDirectMemberswithStakedTokens(address);
  }
  @Post('get-direct-members-data')
  @UseGuards(JwtAuthGuard)
  async getAllMembersData(
    @Request() req: UserRequest,
    @Body() body: { level: number },
  ) {
    return this.stakingService.getAllLevelMembers(
      req.user.walletAddress,
      body.level,
    );
  }

  @Get('get-total-network-members')
  async getTotalNetworkMembers() {
    return this.stakingService.getTotalNetworkMembers();
  }
  @Get('get-total-network-staked')
  async getTotalNetworkStaked() {
    return this.stakingService.getTotalNetworkStaked();
  }
  @Get('get-total-network-withdrawal')
  async getTotalNetworkWithdrawal() {
    return this.stakingService.getTotalNetworkWithdrawals();
  }
  @Get('get-upline')
  @UseGuards(JwtAuthGuard)
  async getReferrer(@Request() req: UserRequest) {
    return this.stakingService.getReferrer(req.user.walletAddress);
  }
}
