import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Rewards } from 'src/rewards/entities/reward.entity';
import { StakingTransaction } from 'src/staking-transaction/schema/stakingTransaction.schema';
import { ClaimedHistory } from 'src/staking/schema/claimedHistory.schema';
import { Staking } from 'src/staking/schema/staking.schema';
import { User } from 'src/users/schema/user.schema';
import { S3Service } from 'src/utils/s3Sevice';
import { RankRewards } from './entities/rank-reward.entity';
import { RewardsService } from 'src/rewards/rewards.service';

@Injectable()
export class RankRewardsService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly ethersService: EthersService,
    private readonly rewardsService: RewardsService,
    @InjectModel(User.name) private User: Model<User>,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(RankRewards.name) private rankRewardsModel: Model<RankRewards>,
    @InjectModel(StakingTransaction.name)
    private Transaction: Model<StakingTransaction>,
  ) {}

  async createRank(body: any) {
    try {
      const data = await this.rankRewardsModel.create(body);
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateRewardAmount(body: any) {
    try {
      const data = await this.rankRewardsModel.updateOne(
        { rank: body.rank },
        { $set: { rewardAmount: body.rewardAmount } },
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getTotalBusinessDetails(address: string) {
    try {
      const data = await this.rewardsService.getQualifiedBusiness2(address);
      return data;
    } catch (error) {
      throw error;
    }
  }
}
