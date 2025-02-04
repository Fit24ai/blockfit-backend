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
import { S3Service } from 'src/utils/s3Sevice';
import { UploadImageDto } from './dto/uploadImage.dto';

@Injectable()
export class RewardsService {
  constructor(
    private readonly s3Service: S3Service,
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

  async getQualifiedBusiness2(address: string, startDate?: any, endDate?: any) {
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

    let rewardStakes = [];

    if (startDate && endDate) {
      const startDateIST = new Date(
        startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      const endDateIST = new Date(
        endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      console.log({
        startDateIST: startDateIST.getTime() / 1000,
        endDateIST: endDateIST.getTime() / 1000,
      });
      rewardStakes = await this.StakingModel.find({
        walletAddress: address,
        isReferred: true,
        startTime: {
          $gte: startDateIST.getTime() / 1000,
          $lte: endDateIST.getTime() / 1000,
        },
      });
    } else
      rewardStakes = await this.StakingModel.find({
        walletAddress: address,
        isReferred: true,
        startTime: { $gte: 1732991400 },
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
        let memberStakes = [];
        if (startDate && endDate) {
          const startDateIST = new Date(
            startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
          );
          const endDateIST = new Date(
            endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
          );
          memberStakes = await this.StakingModel.find({
            walletAddress: member,
            isReferred: false,
            startTime: {
              $gte: startDateIST.getTime() / 1000,
              $lte: endDateIST.getTime() / 1000,
            },
          });
        } else {
          memberStakes = await this.StakingModel.find({
            walletAddress: member,
            isReferred: false,
            startTime: { $gte: 1732991400 },
          });
        }

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

  // async createReward(reward: CreateRewardDto, files: UploadImageDto) {
  //   const image = await this.s3Service.uploadMulterFileToS3(
  //     files.image[0].buffer,
  //     `Image/${Date.now()}_${files.image[0].originalname}`,
  //   );
  //   const newReward = new this.rewardsModel({ ...reward, imageUrl: image });
  //   await newReward.save();
  //   return {
  //     success: true,
  //     message: 'Reward created successfully',
  //   };
  // }

  async createReward(reward: CreateRewardDto, files: UploadImageDto) {
    const image = await this.s3Service.uploadMulterFileToS3(
      files.image[0].buffer,
      `Image/${Date.now()}_${files.image[0].originalname}`,
    );

    const newReward = new this.rewardsModel({
      ...reward,
      imageUrl: image,
      startDate: reward.startDate,
      endDate: reward.endDate,
    });

    await newReward.save();
    return {
      success: true,
      message: 'Reward created successfully',
    };
  }

  async claimReward(address: string, rewardId: string) {
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
      status: RewardStatusEnum.ACTIVE,
      userClaimedStatus: {
        $not: {
          $elemMatch: { userId: user._id },
        },
      },
      $expr: {
        $gte: [qualifierBusiness, '$qualifierAmount'],
      },
    });

    return rewards;
  }
  async getAllUnclaimedRewards2(address: string) {
    const user = await this.User.findOne({ walletAddress: address });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rewards = await this.rewardsModel.find({
      status: RewardStatusEnum.ACTIVE,
      userClaimedStatus: {
        $not: {
          $elemMatch: { userId: user._id },
        },
      },
    });

    const rewardsWithBusiness = await Promise.all(
      rewards.map(async (reward) => {
        const { qualifierBusiness } = await this.getQualifiedBusiness2(
          user.walletAddress,
          reward.startDate,
          reward.endDate,
        );

        return {
          ...reward.toObject(),
          qualifierBusiness,
        };
      }),
    );

    const qualifiedRewards = rewardsWithBusiness.filter(
      (reward) => reward.qualifierBusiness >= reward.qualifierAmount,
    );

    return qualifiedRewards;
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

  async getAllActiveRewards() {
    const rewards = await this.rewardsModel.find({
      status: RewardStatusEnum.ACTIVE,
    });
    return rewards;
  }

  async getAllExpiredRewards() {
    const rewards = await this.rewardsModel.find({
      status: RewardStatusEnum.EXPIRED,
    });
    return rewards;
  }

  async getAllRewards() {
    const rewards = await this.rewardsModel.find();
    return rewards;
  }

  // async getAllPendingRewardsByUsers() {
  //   const rewards = await this.rewardsModel
  //     .find({
  //       userClaimedStatus: {
  //         $elemMatch: {
  //           claimStatus: RewardClaimStatusEnum.PENDING,
  //         },
  //       },
  //     })
  //     .populate('userClaimedStatus.userId');
  //   return rewards;
  // }

  async getAllPendingRewardsByUsers() {
    try {
      const rewards = await this.rewardsModel
        .find({
          status: RewardStatusEnum.ACTIVE,
          userClaimedStatus: {
            $elemMatch: {
              claimStatus: RewardClaimStatusEnum.PENDING,
            },
          },
        })
        .populate('userClaimedStatus.userId');

      return rewards;
    } catch (error) {
      console.error('Error fetching pending rewards:', error);
      throw new Error('Unable to fetch pending rewards.');
    }
  }

  async getAllApprovedRewardsByUsers() {
    const rewards = await this.rewardsModel
      .find({
        userClaimedStatus: {
          $elemMatch: {
            claimStatus: RewardClaimStatusEnum.APPROVED,
          },
        },
      })
      .populate('userClaimedStatus.userId');
    return rewards;
  }

  async approvePendingReward(rewardId: string, userId: string) {
    const reward = await this.rewardsModel.findById(rewardId);
    if (!reward) {
      throw new BadRequestException('Reward not found');
    }
    const user = await this.User.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const rewardClaimStatus = reward.userClaimedStatus.find(
      (status) => status.userId.toString() === user._id.toString(),
    );
    if (!rewardClaimStatus) {
      throw new BadRequestException('Reward not found for the user');
    }
    if (rewardClaimStatus.claimStatus !== RewardClaimStatusEnum.PENDING) {
      throw new BadRequestException('Reward is not pending for approval');
    }
    rewardClaimStatus.claimStatus = RewardClaimStatusEnum.APPROVED;
    await reward.save();
    return {
      success: true,
      message: 'Reward approved successfully',
    };
  }

  async expireReward(rewardId: string) {
    const reward = await this.rewardsModel.findById(rewardId);
    if (!reward) {
      throw new BadRequestException('Reward not found');
    }
    reward.status = RewardStatusEnum.EXPIRED;
    await reward.save();
    return {
      success: true,
      message: 'Reward expired successfully',
    };
  }
}
