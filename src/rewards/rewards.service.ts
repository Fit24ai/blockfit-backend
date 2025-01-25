import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { formatUnits, getAddress } from 'ethers';
import { Model, ObjectId } from 'mongoose';
import { Admin } from 'src/admin/schema/admin.schema';
import { EthersService } from 'src/ethers/ethers.service';
import { StakingTransaction } from 'src/staking-transaction/schema/stakingTransaction.schema';
import { ClaimedHistory } from 'src/staking/schema/claimedHistory.schema';
import { Staking } from 'src/staking/schema/staking.schema';
import { DistributionStatusEnum } from 'src/types/transaction';
import { User } from 'src/users/schema/user.schema';
import { Rewards } from './entities/reward.entity';
import { CreateRewardDto } from './dto/createReward.dto';
import {
  RewardClaimStatusEnum,
  RewardStatusEnum,
} from './enum/rewardType.enum';
import { UserRequest } from 'src/types/user';

@Injectable()
export class RewardsService {
  constructor(
    private readonly ethersService: EthersService,
    @InjectModel(User.name) private User: Model<User>,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(Rewards.name) private rewardsModel: Model<Rewards>,
    @InjectModel(StakingTransaction.name)
    private Transaction: Model<StakingTransaction>,
    @InjectModel(ClaimedHistory.name)
    private ClaimedHistoryModel: Model<ClaimedHistory>,
  ) {}

  async getUserTotalTokenStaked(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const tokens =
      await this.ethersService.icoContract.userTotalTokenStaked(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
  }

  async getQualifiedBusiness(address: string) {
    let tokensLevel = 0;
    let levelCount = 0;

    const userTokens = await this.getUserTotalTokenStaked(address);

    if (userTokens.tokens >= 12500) {
      const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
      tokensLevel += additionalLevels;
    }

    if (tokensLevel > 24) {
      tokensLevel = 24;
    }

    const directMembers =
      await this.ethersService.referralContract.getAllRefrees(address);
    levelCount = directMembers.length;

    if (levelCount <= tokensLevel) {
      levelCount = tokensLevel;
    }

    // console.log({ level: levelCount });

    // console.log({ level: levelCount, directMembers: directMembers.length });

    if (levelCount < 3) {
      return {
        success: false,
        message: 'You need to have at least 3 levels opened!',
      };
    }

    const rewardStakes = await this.StakingModel.find({
      walletAddress: address,
      isReferred: true,
    });

    const levelBusinessMap = new Map<number, number>();

    await Promise.all(
      rewardStakes.map(async (stake) => {
        const referredStake = await this.StakingModel.findOne({
          stakeId: stake.refId,
          isReferred: false,
        });

        if (referredStake) {
          const level = stake.level;
          const amount = referredStake.amount;

          levelBusinessMap.set(
            level,
            (levelBusinessMap.get(level) || 0) + amount,
          );
        }
      }),
    );

    // console.log(levelBusinessMap);

    // Check if levels 1, 2, or 3 have staking
    const levels = [3];
    const hasStakingOnOrAboveThirdLevel = levels.some(
      (level) => (levelBusinessMap.get(level) || 0) > 0,
    );

    if (!hasStakingOnOrAboveThirdLevel) {
      return {
        success: false,
        message: 'You must have staking on or above the 3rd level!',
      };
    }

    const sortedLevelBusiness = Array.from(levelBusinessMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const totalBusiness = sortedLevelBusiness.reduce(
      (sum, [, business]) => sum + business,
      0,
    );

    let maxBusiness = 0;
    let maxLevel = null;
    let secondMaxLevel = null;

    if (sortedLevelBusiness.length > 0) {
      maxBusiness += sortedLevelBusiness[0][1] * 0.4;
      maxLevel = sortedLevelBusiness[0][0];
    }
    if (sortedLevelBusiness.length > 1) {
      maxBusiness += sortedLevelBusiness[1][1] * 0.3;
      secondMaxLevel = sortedLevelBusiness[1][0];
    }

    const remainingBusiness = sortedLevelBusiness
      .slice(2)
      .reduce((sum, [, business]) => sum + business, 0);
    maxBusiness += remainingBusiness * 0.3;

    return {
      success: true,
      levelCount,
      totalBusiness,
      maxBusiness,
      maxLevel,
      secondMaxLevel,
      levelBusiness: Object.fromEntries(levelBusinessMap),
      message: `The maximum business is calculated as ${maxBusiness}`,
    };
  }

  async getQualifiedBusiness2(address: string) {
    let tokensLevel = 0;
    let levelCount = 0;

    const userTokens = await this.getUserTotalTokenStaked(address);

    if (userTokens.tokens >= 12500) {
      const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
      tokensLevel += additionalLevels;
    }

    if (tokensLevel > 24) {
      tokensLevel = 24;
    }

    const directMembers =
      await this.ethersService.referralContract.getAllRefrees(address);

    if (directMembers.length < 1) {
      return {
        success: false,
        message: 'You need to have at least 1 level opened!',
        qualifierBusiness: 0,
      };
    }

    levelCount = directMembers.length;

    if (levelCount <= tokensLevel) {
      levelCount = tokensLevel;
    }

    // console.log({ level: levelCount, directMembers: directMembers.length });

    const rewardStakes = await this.StakingModel.find({
      walletAddress: address,
      isReferred: true,
      startTime: { $gt: 1732991399 },
    });

    const levelBusinessMap = new Map<number, number>();

    await Promise.all(
      rewardStakes.map(async (stake) => {
        const referredStake = await this.StakingModel.findOne({
          stakeId: stake.refId,
          isReferred: false,
          // startTime: { $gt: 1735689600 },
        });

        // console.log({ referredStake });

        if (referredStake) {
          const level = stake.level;
          const amount = referredStake.amount;

          levelBusinessMap.set(
            level,
            (levelBusinessMap.get(level) || 0) + amount,
          );
        }
      }),
    );

    // console.log(levelBusinessMap);

    const sortedLevelBusiness = Array.from(levelBusinessMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const totalBusiness = sortedLevelBusiness.reduce(
      (sum, [, business]) => sum + business,
      0,
    );

    let maxBusiness = 0;
    let maxLevel = null;
    let secondMaxLevel = null;

    if (sortedLevelBusiness.length > 0) {
      maxBusiness += sortedLevelBusiness[0][1] * 0.4;
      maxLevel = sortedLevelBusiness[0][0];
    }
    if (sortedLevelBusiness.length > 1) {
      maxBusiness += sortedLevelBusiness[1][1] * 0.3;
      secondMaxLevel = sortedLevelBusiness[1][0];
    }

    const remainingBusiness = sortedLevelBusiness
      .slice(2)
      .reduce((sum, [, business]) => sum + business, 0);
    maxBusiness += remainingBusiness * 0.3;

    let directMembersStaking = 0;

    await Promise.all(
      directMembers.map(async (member) => {
        const memberStakes = await this.StakingModel.find({
          walletAddress: member,
          isReferred: false,
          startTime: { $gt: 1732991399 },
        });

        const totalStakes = memberStakes.reduce(
          (sum, stake) => sum + stake.amount,
          0,
        );

        directMembersStaking += totalStakes;
      }),
    );

    const qualifierBusiness = Math.max(maxBusiness, directMembersStaking);

    return {
      success: true,
      levelCount,
      totalBusiness,
      maxBusiness,
      directMembersStaking,
      qualifierBusiness,
      maxLevel,
      secondMaxLevel,
      levelBusiness: Object.fromEntries(levelBusinessMap),
      message: `The qualifier business is calculated as ${qualifierBusiness}`,
    };
  }

  async createReward(reward: CreateRewardDto) {
    const newReward = new this.rewardsModel(reward);
    return newReward.save();
  }

  async claimReward(address : string, rewardId: string) {
    const user = await this.User.findOne({ walletAddress: address });
    const reward = await this.rewardsModel.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('Reward not found');
    }
    if (reward.status !== RewardStatusEnum.ACTIVE) {
      throw new BadRequestException('Reward is not active');
    }
    const isAlreadyClaimed = reward.userClaimedStatus.some(
      (status) => status.userId.toString() === user._id.toString(),
    );

    if (isAlreadyClaimed) {
      throw new BadRequestException('Reward already claimed');
    }

    reward.userClaimedStatus.push({
      userId: user._id,
      claimStatus: RewardClaimStatusEnum.PENDING,
    });
    await reward.save();

    return {
      success: true,
      message: 'Reward claimed successfully',
    };
  }

  // async getAllUnclaimedRewards(userId: ObjectId) {
  //   const user = await this.User.findById(userId);
  //   const rewards = await this.rewardsModel.find({
  //     userClaimedStatus: { $nin: [user._id] },
  //   });
  //   return rewards;
  // }

  async getAllUnclaimedRewards(address: string) {
    const user = await this.User.findOne({ walletAddress: address });
    const { qualifierBusiness } = await this.getQualifiedBusiness2(
      user.walletAddress,
    );

    // console.log({ qualifierBusiness });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rewards = await this.rewardsModel.find({
      userClaimedStatus: {
        $not: {
          $elemMatch: { userId: user._id },
        },
      },
      $expr: {
        $gte: [qualifierBusiness, '$qualifierAmount'],
      },
    });

    // rewards.forEach((reward) => {
    //   console.log({ rewardAmount: reward.qualifierAmount });
    // });

    return rewards;
  }

  // async getAllClaimedRewards(userId: ObjectId) {
  //   const user = await this.User.findById(userId);
  //   const rewards = await this.rewardsModel.find({
  //     userClaimedStatus: { $in: [user._id] },
  //   });
  //   return rewards;
  // }

  async getAllClaimedApprovedRewards(addresss: string) {
    const user = await this.User.findOne({ walletAddress: addresss });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rewards = await this.rewardsModel.find({
      userClaimedStatus: {
        $elemMatch: {
          userId: user._id,
          claimStatus: RewardClaimStatusEnum.APPROVED,
        },
      },
    });

    return rewards;
  }

  async getAllClaimedPendingRewards(address: string) {
    const user = await this.User.findOne({ walletAddress: address });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rewards = await this.rewardsModel.find({
      userClaimedStatus: {
        $elemMatch: {
          userId: user._id,
          claimStatus: RewardClaimStatusEnum.PENDING,
        },
      },
    });

    return rewards;
  }
}
