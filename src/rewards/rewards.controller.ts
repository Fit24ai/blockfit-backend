import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AdminJwtAuthGuard, JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';
import { CreateRewardDto } from './dto/createReward.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadImageDto } from './dto/uploadImage.dto';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('qualifier-business')
  @UseGuards(JwtAuthGuard)
  async getQualifiedBusiness(@Request() req: UserRequest) {
    // return this.rewardsService.getQualifiedBusiness(req.user.walletAddress);
    return this.rewardsService.getQualifiedBusiness2(
      '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
    );
  }

  @Get('qualifier-business-test/:address')
  async getQualifiedBusiness2(@Param('address') address: string) {
    // return this.rewardsService.getQualifiedBusiness(req.user.walletAddress);
    return this.rewardsService.getQualifiedBusiness2(address);
  }

  @Post('create')
  @UseGuards(AdminJwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: UploadImageDto,
    @Body() body: CreateRewardDto) {
    return this.rewardsService.createReward(body, files);
  }

  @Get('claim-reward/:id')
  @UseGuards(JwtAuthGuard)
  async claimReward(@Request() req: UserRequest, @Param('id') id: string) {
    // return this.rewardsService.claimReward(req.user._id, id);
    return this.rewardsService.claimReward(
      '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
      id,
    );
  }

  @Get('unclaimed-rewards')
  @UseGuards(JwtAuthGuard)
  async getUnclaimedRewards(@Request() req: UserRequest) {
    // return this.rewardsService.getAllUnclaimedRewards(req.user._id);
    return this.rewardsService.getAllUnclaimedRewards2(
      '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
    );
  }

  @Get('claimed-approved-rewards')
  @UseGuards(JwtAuthGuard)
  async getClaimedApprovedRewards(@Request() req: UserRequest) {
    // return this.rewardsService.getAllClaimedApprovedRewards(req.user._id);
    return this.rewardsService.getAllClaimedApprovedRewards(
      '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
    );
  }

  @Get('claimed-pending-rewards')
  @UseGuards(JwtAuthGuard)
  async getClaimedPendingRewards(@Request() req: UserRequest) {
    // return this.rewardsService.getAllClaimedPendingRewards(req.user._id);
    return this.rewardsService.getAllClaimedPendingRewards(
      '0x8725A3dbbc7b1bc74947B34922eB1b82F0aAb2C7',
    );
  }

  @Get('active-rewards')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async getActiveRewards() {
    return this.rewardsService.getAllActiveRewards();
  }

  @Get('expired-rewards')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async getExpiredRewards() {
    return this.rewardsService.getAllExpiredRewards();
  }

  @Get('expire-reward/:id')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async expireReward(@Param('id') id: string) {
    return this.rewardsService.expireReward(id);
  }

  @Get('pending-rewards')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async getPendingRewards() {
    console.log('Pending rewards');
    return this.rewardsService.getAllPendingRewardsByUsers();
  }

  @Get('approved-rewards')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async getApprovedRewards() {
    return this.rewardsService.getAllApprovedRewardsByUsers();
  }

  @Post('approve-pending-rewards')
  @UsePipes(ValidationPipe)
  @UseGuards(AdminJwtAuthGuard)
  async approvePendingRewards(
    @Query('rewardId') rewardId: string,
    @Query('userId') userId: string,
  ) {
    return this.rewardsService.approvePendingReward(rewardId, userId);
  }
}
