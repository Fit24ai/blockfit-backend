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
import {
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';
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

    console.log('reward claiming');

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

  async getAllRewardAndUserDetails(address: string) {
    const user = await this.User.findOne({ walletAddress: address });
    const userId = user._id.toString();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const rewards = await this.rewardsModel.find({
      status: RewardStatusEnum.ACTIVE,
      // userClaimedStatus: {
      //   $not: {
      //     $elemMatch: { userId: user._id },
      //   },
      // },
    });

    const rewardDetails = await Promise.all(
      rewards.map(async (reward) => {
        const { qualifierBusiness } = await this.getQualifiedBusinessLegs(
          address,
          reward.startDate,
          reward.endDate,
        );

        const userClaimStatus = reward.userClaimedStatus.find(
          (entry) => entry.userId.toString() === userId,
        );
        const claimStatus = userClaimStatus?.claimStatus || null;
        const startDateIST = new Date(
          reward.startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
        );
        const endDateIST = new Date(
          reward.endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
        );

        const selfStakes = await this.StakingModel.find({
          walletAddress: address,
          transactionStatus: TransactionStatusEnum.CONFIRMED,
          isReferred: false,
          startTime: {
            $gte: startDateIST.getTime(),
            $lte: endDateIST.getTime(),
          },
        });

        let usdAmount = 0;

        selfStakes.map((stake) => {
          usdAmount += stake.usdAmount;
        });

        let isEligible = false;

        if (reward.selfQualifierAmount) {
          isEligible =
            qualifierBusiness >= reward.qualifierAmount ||
            usdAmount >= reward.selfQualifierAmount;
        } else {
          isEligible = qualifierBusiness >= reward.qualifierAmount;
        }

        return {
          reward,
          qualifierBusinessUsd: qualifierBusiness,
          selfStakesUsd: usdAmount,
          isEligibleForClaim: isEligible && !claimStatus,
          progressPercentage: Math.min(
            (qualifierBusiness / reward.qualifierAmount) * 100,
            100,
          ),
          claimStatus,
        };
      }),
    );

    return { rewards: rewardDetails };
  }

  async getQualifiedBusinessUsd(
    address: string,
    startDate?: any,
    endDate?: any,
  ) {
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
    const levelBusinessUsdMap = new Map<number, number>();

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
          const usdAmount = referredStake.usdAmount || 0;

          levelBusinessMap.set(
            level,
            (levelBusinessMap.get(level) || 0) + amount,
          );
          levelBusinessUsdMap.set(
            level,
            (levelBusinessUsdMap.get(level) || 0) + usdAmount,
          );
        }
      }),
    );

    // console.log(levelBusinessMap);

    const sortedLevelBusiness = Array.from(levelBusinessMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    const sortedLevelUsdBusiness = Array.from(
      levelBusinessUsdMap.entries(),
    ).sort((a, b) => b[1] - a[1]);

    const totalBusiness = sortedLevelBusiness.reduce(
      (sum, [, business]) => sum + business,
      0,
    );
    const totalUsdBusiness = sortedLevelUsdBusiness.reduce(
      (sum, [, business]) => sum + business,
      0,
    );

    let maxBusiness = 0;
    let maxUsdBusiness = 0;
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

    if (sortedLevelUsdBusiness.length > 0) {
      maxUsdBusiness += sortedLevelUsdBusiness[0][1] * 0.4;
      maxLevel = sortedLevelUsdBusiness[0][0];
    }
    if (sortedLevelUsdBusiness.length > 1) {
      maxUsdBusiness += sortedLevelUsdBusiness[1][1] * 0.3;
      secondMaxLevel = sortedLevelUsdBusiness[1][0];
    }

    const remainingBusiness = sortedLevelBusiness
      .slice(2)
      .reduce((sum, [, business]) => sum + business, 0);
    maxBusiness += remainingBusiness * 0.3;

    const remainingUsdBusiness = sortedLevelUsdBusiness
      .slice(2)
      .reduce((sum, [, business]) => sum + business, 0);
    maxUsdBusiness += remainingUsdBusiness * 0.3;

    let directMembersStaking = 0;
    let directMembersStakingUsd = 0;

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

        const totalStakesUsd = memberStakes.reduce(
          (sum, stake) => sum + stake.usdAmount,
          0,
        );

        directMembersStaking += totalStakes;
        directMembersStakingUsd += totalStakesUsd;
      }),
    );

    const qualifierBusiness = Math.max(maxBusiness, directMembersStaking);
    const qualifierBusinessUsd = Math.max(
      maxUsdBusiness,
      directMembersStakingUsd,
    );

    return {
      success: true,
      levelCount,
      totalBusiness,
      maxBusiness,
      directMembersStaking,
      qualifierBusiness,
      totalUsdBusiness,
      maxUsdBusiness,
      directMembersStakingUsd,
      qualifierBusinessUsd,
      maxLevel,
      secondMaxLevel,
      levelBusiness: Object.fromEntries(levelBusinessMap),
      message: `The qualifier business is calculated as ${qualifierBusiness}`,
    };
  }

  // async getQualifiedBusinessLegs(
  //   address: string,
  //   startDate?: any,
  //   endDate?: any,
  // ) {
  //   let totalUsdAmount = 0;
  //   let directMembersStaking = 0;

  //   const refrees =
  //     await this.ethersService.referralContract.getAllRefrees(address);
  //   console.log(refrees.length);

  //   if (refrees.length === 0) {
  //     return {
  //       success: false,
  //       message: 'Not qualified!',
  //       totalUsdBusiness: 0,
  //       qualifierBusiness: 0,
  //     };
  //   }

  //   let refreesStakes = [];

  //   if (startDate && endDate) {
  //     const startDateIST = new Date(
  //       startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
  //     );
  //     const endDateIST = new Date(
  //       endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
  //     );
  //     refreesStakes = await this.StakingModel.find({
  //       walletAddress: { $in: refrees },
  //       isReferred: false,
  //       startTime: {
  //         $gte: startDateIST.getTime() / 1000,
  //         $lte: endDateIST.getTime() / 1000,
  //       },
  //     });
  //   } else
  //     refreesStakes = await this.StakingModel.find({
  //       walletAddress: { $in: refrees },
  //       isReferred: false,
  //       // startTime: { $gte: 1732991400 },
  //     });

  //   directMembersStaking = refreesStakes.reduce(
  //     (sum, stake) => sum + stake.usdAmount,
  //     0,
  //   );

  //   console.log({ directMembersStaking });

  //   if (refrees.length <= 2) {
  //     return {
  //       success: true,
  //       qualifierType: `LEGSTAKES`,
  //       qualifierBusiness: directMembersStaking,
  //       totalUsdBusiness: directMembersStaking,
  //     };
  //   }

  //   const refereeBusiness = await Promise.all(
  //     refrees.map(async (referee) => {
  //       const { USDAmount } =
  //         await this.getTotalBusinessWithSelfStakes(referee);
  //       totalUsdAmount += USDAmount;
  //       return { referee, USDAmount };
  //     }),
  //   );

  //   refereeBusiness.sort((a, b) => b.USDAmount - a.USDAmount);
  //   console.log(refrees.length);

  //   let remainingAmount = totalUsdAmount;
  //   let allocated40 = 0,
  //     allocated30_1 = 0,
  //     allocated30_2 = 0;

  //   const [maxLeg, secondMaxLeg, ...thirdLegs] = refereeBusiness;

  //   allocated40 = Math.min(maxLeg.USDAmount, totalUsdAmount * 0.4);
  //   remainingAmount -= maxLeg.USDAmount;

  //   allocated30_1 = Math.min(secondMaxLeg.USDAmount, totalUsdAmount * 0.3);
  //   remainingAmount -= secondMaxLeg.USDAmount;

  //   allocated30_2 = Math.min(remainingAmount, totalUsdAmount * 0.3);

  //   let totalQualifierBusiness = allocated40 + allocated30_1 + allocated30_2;

  //   const qualifierBusiness = Math.max(
  //     totalQualifierBusiness,
  //     directMembersStaking,
  //   );

  //   return {
  //     success: true,
  //     qualifierType: `${totalQualifierBusiness > directMembersStaking ? 'FORTYTHIRTY' : 'LEGSTAKES'}`,
  //     totalUsdBusiness: totalUsdAmount,
  //     MaxBusinessLeg: maxLeg.referee,
  //     maxUsdAmount: maxLeg.USDAmount,
  //     allocated40,
  //     SecondMaxBusinessLeg: secondMaxLeg.referee,
  //     secondMaxUsdAmount: secondMaxLeg.USDAmount,
  //     allocated30_1,
  //     allocated30_2,
  //     qualifierBusiness,
  //   };
  // }

  async getQualifiedBusinessLegs(
    address: string,
    startDate?: any,
    endDate?: any,
    qualifierAmount?: number,
  ) {
    let totalUsdAmount = 0;
    let directMembersStaking = 0;

    const referees =
      await this.ethersService.referralContract.getAllRefrees(address);
    console.log('Total referees:', referees.length);

    if (referees.length === 0) {
      return {
        success: false,
        message: 'Not qualified!',
        totalUsdBusiness: 0,
        qualifierBusiness: 0,
        refereeBusiness: [],
      };
    }

    let refereeStakes = [];

    if (startDate && endDate) {
      const startDateIST = new Date(
        startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      const endDateIST = new Date(
        endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      refereeStakes = await this.StakingModel.find({
        walletAddress: { $in: referees },
        isReferred: false,
        startTime: {
          $gte: startDateIST.getTime() / 1000,
          $lte: endDateIST.getTime() / 1000,
        },
      });
    } else {
      refereeStakes = await this.StakingModel.find({
        walletAddress: { $in: referees },
        isReferred: false,
        startTime: { $gte: 1732991400 },
      });
    }

    directMembersStaking = refereeStakes.reduce(
      (sum, stake) => sum + stake.usdAmount,
      0,
    );
    console.log({ directMembersStaking });

    if (referees.length <= 2) {
      return {
        success: true,
        qualifierType: 'LEGSTAKES',
        qualifierBusiness: directMembersStaking,
        totalUsdBusiness: directMembersStaking,
        refereeBusiness: refereeStakes.map((stake) => ({
          referee: stake.walletAddress,
          USDAmount: stake.usdAmount,
        })),
      };
    }

    console.log('ypppp');

    // Calculate total business including self-stakes
    // const refereeBusiness = await Promise.all(
    //   referees.map(async (referee) => {
    //     const { USDAmount } =
    //       await this.getTotalBusinessWithSelfStakes(referee);
    //     totalUsdAmount += USDAmount;
    //     return { referee, USDAmount };
    //   }),
    // );

    const refereeBusiness = await Promise.all(
      referees.map(async (referee) => {
        const { USDAmount } =
          await this.getTotalBusinessWithSelfStakes(referee);
        totalUsdAmount += USDAmount;
        return { referee, USDAmount };
      }),
    );

    const validReferees = refereeBusiness.filter(
      ({ USDAmount }) => USDAmount > 0,
    );

    if (validReferees.length < 3) {
      return {
        success: true,
        qualifierType: 'LEGSTAKES',
        qualifierBusiness: directMembersStaking,
        totalUsdBusiness: directMembersStaking,
        refereeBusiness: refereeStakes.map((stake) => ({
          referee: stake.walletAddress,
          USDAmount: stake.usdAmount,
        })),
      };
    }

    refereeBusiness.sort((a, b) => b.USDAmount - a.USDAmount);
    console.log('Sorted referees:', refereeBusiness.length);

    let remainingAmount = totalUsdAmount;
    let allocated40 = 0,
      allocated30_1 = 0,
      allocated30_2 = 0;

    const [maxLeg, secondMaxLeg, ...otherLegs] = refereeBusiness;

    allocated40 = Math.min(maxLeg.USDAmount, totalUsdAmount * 0.4);
    remainingAmount -= maxLeg.USDAmount;

    allocated30_1 = Math.min(secondMaxLeg.USDAmount, totalUsdAmount * 0.3);
    remainingAmount -= secondMaxLeg.USDAmount;

    allocated30_2 = Math.min(remainingAmount, totalUsdAmount * 0.3);

    const restOfMembersBusiness = otherLegs.reduce(
      (sum, leg) => sum + leg.USDAmount,
      0,
    );

    const totalQualifierBusiness = allocated40 + allocated30_1 + allocated30_2;
    const qualifierBusiness = Math.max(
      totalQualifierBusiness,
      directMembersStaking,
    );

    return {
      success: true,
      qualifierType:
        totalQualifierBusiness > directMembersStaking
          ? 'FORTYTHIRTY'
          : 'LEGSTAKES',
      totalUsdBusiness: totalUsdAmount,
      qualifierBusiness,
      MaxBusinessLeg: {
        referee: maxLeg.referee,
        usdAmount: maxLeg.USDAmount,
        allocated40,
      },
      SecondMaxBusinessLeg: {
        referee: secondMaxLeg.referee,
        usdAmount: secondMaxLeg.USDAmount,
        allocated30_1,
      },
      restOfMembers: {
        totalUsdAmount: restOfMembersBusiness,
        allocated30_2,
      },
      directMembersStaking,
      refereeBusiness,
    };
  }

  async getQualifiedBusinessLegs2(
    address: string,
    qualifierAmount?: number,
    startDate?: any,
    endDate?: any,
  ) {
    let totalUsdAmount = 0;
    let directMembersStaking = 0;

    const referees =
      await this.ethersService.referralContract.getAllRefrees(address);
    // console.log('Total referees:', referees.length);

    if (referees.length === 0) {
      return {
        success: false,
        message: 'Not qualified!',
        totalUsdBusiness: 0,
        qualifierBusiness: 0,
        refereeBusiness: [],
      };
    }

    let refereeStakes = [];

    if (startDate && endDate) {
      const startDateIST = new Date(
        startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      const endDateIST = new Date(
        endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      refereeStakes = await this.StakingModel.find({
        walletAddress: { $in: referees },
        isReferred: false,
        startTime: {
          $gte: startDateIST.getTime() / 1000,
          $lte: endDateIST.getTime() / 1000,
        },
      });
    } else {
      refereeStakes = await this.StakingModel.find({
        walletAddress: { $in: referees },
        isReferred: false,
        // startTime: { $gte: 1732991400 },
      });
    }

    directMembersStaking = refereeStakes.reduce(
      (sum, stake) => sum + stake.usdAmount,
      0,
    );
    // console.log({ directMembersStaking });

    if (referees.length <= 2) {
      return {
        success: true,
        qualifierType: 'LEGSTAKES',
        qualifierBusiness: directMembersStaking,
        totalUsdBusiness: directMembersStaking,
        refereeBusiness: refereeStakes.map((stake) => ({
          referee: stake.walletAddress,
          USDAmount: stake.usdAmount,
        })),
      };
    }

    // console.log('Proceeding with business leg allocation');

    // Calculate total business including self-stakes for each referee
    const refereeBusiness = await Promise.all(
      referees.map(async (referee) => {
        const { USDAmount } =
          await this.getTotalBusinessWithSelfStakes(referee);
        totalUsdAmount += USDAmount;
        return { referee, USDAmount };
      }),
    );

    const validReferees = refereeBusiness.filter(
      ({ USDAmount }) => USDAmount > 0,
    );

    if (validReferees.length < 3) {
      return {
        success: true,
        qualifierType: 'LEGSTAKES',
        qualifierBusiness: directMembersStaking,
        totalUsdBusiness: directMembersStaking,
        refereeBusiness: refereeStakes.map((stake) => ({
          referee: stake.walletAddress,
          USDAmount: stake.usdAmount,
        })),
      };
    }

    // Sort referees by their USDAmount in descending order
    refereeBusiness.sort((a, b) => b.USDAmount - a.USDAmount);
    // console.log('Sorted referees:', refereeBusiness.length);

    // Ensure qualifierAmount is provided; if not, fallback to totalUsdAmount (or handle accordingly)
    if (qualifierAmount == null) {
      qualifierAmount = totalUsdAmount;
    }

    // Using the passed-in qualifierAmount to determine allocation caps.
    const [maxLeg, secondMaxLeg, ...otherLegs] = refereeBusiness;

    // Allocate up to 40% of qualifierAmount from the highest leg
    const allocated40 = Math.min(maxLeg.USDAmount, qualifierAmount * 0.4);

    // Allocate up to 30% of qualifierAmount from the second highest leg
    const allocated30_1 = Math.min(
      secondMaxLeg.USDAmount,
      qualifierAmount * 0.3,
    );

    // For the remaining legs, cap the allocation at 30% of qualifierAmount
    const otherLegsBusiness = otherLegs.reduce(
      (sum, leg) => sum + leg.USDAmount,
      0,
    );
    const allocated30_2 = Math.min(otherLegsBusiness, qualifierAmount * 0.3);

    const totalQualifierBusiness = allocated40 + allocated30_1 + allocated30_2;
    // Final qualifier business is the higher of the above or the direct staking amount
    // console.log({directMembersStaking})
    const qualifierBusiness = Math.max(
      totalQualifierBusiness,
      directMembersStaking,
    );
    console.log({
      qualifierBusiness,
      totalQualifierBusiness,
      directMembersStaking,
    });

    return {
      success: true,
      qualifierType:
        totalQualifierBusiness > directMembersStaking
          ? 'FORTYTHIRTY'
          : 'LEGSTAKES',
      totalUsdBusiness: totalUsdAmount,
      qualifierBusiness,
      MaxBusinessLeg: {
        referee: maxLeg.referee,
        usdAmount: maxLeg.USDAmount,
        allocated40,
      },
      SecondMaxBusinessLeg: {
        referee: secondMaxLeg.referee,
        usdAmount: secondMaxLeg.USDAmount,
        allocated30_1,
      },
      restOfMembers: {
        totalUsdAmount: otherLegsBusiness,
        allocated30_2,
      },
      directMembersStaking,
      refereeBusiness,
    };
  }

  async getTotalBusinessWithSelfStakes(
    address: string,
    startDate?: any,
    endDate?: any,
  ) {
    let selfStakes = [];
    let referredStakes = [];

    if (startDate && endDate) {
      const startDateIST = new Date(
        startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );
      const endDateIST = new Date(
        endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
      );

      selfStakes = await this.StakingModel.find({
        walletAddress: address,
        transactionStatus: TransactionStatusEnum.CONFIRMED,
        isReferred: false,
        startTime: { $gte: startDateIST.getTime(), $lte: endDateIST.getTime() },
      });

      referredStakes = await this.StakingModel.find({
        walletAddress: address,
        transactionStatus: TransactionStatusEnum.CONFIRMED,
        isReferred: true,
        startTime: { $gte: startDateIST.getTime(), $lte: endDateIST.getTime() },
      });
    } else {
      [selfStakes, referredStakes] = await Promise.all([
        this.StakingModel.find({
          walletAddress: address,
          transactionStatus: TransactionStatusEnum.CONFIRMED,
          isReferred: false,
          // startTime: { $gte: 1732991400 },
        }),
        this.StakingModel.find({
          walletAddress: address,
          transactionStatus: TransactionStatusEnum.CONFIRMED,
          isReferred: true,
          // startTime: { $gte: 1732991400 },
        }),
      ]);
    }

    // Calculate total self-stake amount and USD amount
    const { stakeAmount, stakeAmountInUSD } = selfStakes.reduce(
      (acc, stake) => {
        acc.stakeAmount += stake.amount;
        acc.stakeAmountInUSD += stake.usdAmount;
        return acc;
      },
      { stakeAmount: 0, stakeAmountInUSD: 0 },
    );

    // Fetch and calculate referred stakes in parallel using map
    // const referredStakeResults = await Promise.all(
    //   referredStakes.map((stake) =>
    //     this.StakingModel.findOne({
    //       transactionStatus: TransactionStatusEnum.CONFIRMED,
    //       stakeId: stake.refId,
    //       isReferred: false,
    //     }),
    //   ),
    // );

    const referredStakeResults = await Promise.all(
      referredStakes.map((stake) => {
        const query: any = {
          transactionStatus: TransactionStatusEnum.CONFIRMED,
          stakeId: stake.refId,
          isReferred: false,
        };

        if (startDate && endDate) {
          const startDateIST = new Date(
            startDate.getTime() - (5 * 60 + 30) * 60 * 1000,
          );
          const endDateIST = new Date(
            endDate.getTime() - (5 * 60 + 30) * 60 * 1000,
          );
          query.startTime = {
            $gte: startDateIST.getTime(),
            $lte: endDateIST.getTime(),
          };
        } else {
          query.startTime = { $gte: 1732991400 };
        }

        return this.StakingModel.findOne(query);
      }),
    );

    // Filter out null values (if any referred stake doesn't exist)
    const validReferredStakes = referredStakeResults.filter(Boolean);

    const { referredStakeAmount, referredStakeAmopuntInUsd } =
      validReferredStakes.reduce(
        (acc, stake) => {
          acc.referredStakeAmount += stake.amount;
          acc.referredStakeAmopuntInUsd += stake.usdAmount;
          return acc;
        },
        { referredStakeAmount: 0, referredStakeAmopuntInUsd: 0 },
      );

    const totalFit24Amount = stakeAmount + referredStakeAmount;
    const totalUSDAmount = stakeAmountInUSD + referredStakeAmopuntInUsd;

    // console.log({
    //   address,
    //   stakeAmount,
    //   referredStakeAmount,
    //   stakeAmountInUSD,
    //   referredStakeAmopuntInUsd,
    //   Fit24Amount: totalFit24Amount,
    //   USDAmount: totalUSDAmount,
    // });

    return {
      Fit24Amount: totalFit24Amount,
      USDAmount: totalUSDAmount,
    };
  }
}
