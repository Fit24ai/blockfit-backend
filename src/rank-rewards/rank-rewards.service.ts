import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Rewards } from 'src/rewards/entities/reward.entity';
import { StakingTransaction } from 'src/staking-transaction/schema/stakingTransaction.schema';
import { ClaimedHistory } from 'src/staking/schema/claimedHistory.schema';
import { Staking } from 'src/staking/schema/staking.schema';
import { User } from 'src/users/schema/user.schema';
import { S3Service } from 'src/utils/s3Sevice';
import { RankRewards } from './entities/rank-reward.entity';
import { RewardsService } from 'src/rewards/rewards.service';
import { formatUnits, getAddress } from 'ethers';
import { RewardClaimStatusEnum } from 'src/rewards/enum/rewardType.enum';

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
        {
          $set: {
            rewardAmount: body.rewardAmount,
            qualifierAmount: body.qualifierAmount,
          },
        },
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateSalaryText(body: any) {
    console.log({ body });
    try {
      const data = await this.rankRewardsModel.updateOne(
        { rank: body.rank },
        {
          $set: {
            salaryText: body.salaryText,
          },
        },
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateRewardsTextandQualifierText(body: any) {
    try {
      const data = await this.rankRewardsModel.updateOne(
        { rank: body.rank },
        {
          $set: {
            rewardsText: body.rewardsText,
            qualifierText: body.qualifierText,
          },
        },
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateReward(body: any) {
    try {
      const data = await this.rankRewardsModel.findOneAndUpdate(
        { rank: body.rank },
        {
          ...body,
        },
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateUniqueFeatures(body: { rank: number; uniqueFeatures: string[] }) {
    try {
      const data = await this.rankRewardsModel.updateOne(
        { rank: body.rank },
        {
          $set: {
            uniqueFeatures: body.uniqueFeatures,
          },
        },
      );

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getTotalBusinessDetails(address: string) {
    try {
      // const data = await this.rewardsService.getQualifiedBusiness2(address);
      const data = await this.getQualifiedBusinessUsd(address);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // async getAllRanksAndUserEligibilities(address: string) {
  //   const { qualifierBusinessUsd } =
  //     await this.getQualifiedBusinessUsd(address);
  //   const Ranks = await this.rankRewardsModel.find();
  // }

  // async getAllRanksAndUserEligibilities(address: string) {
  //   // Get the user's qualified business USD
  //   const { qualifierBusinessUsd } =
  //     await this.getQualifiedBusinessUsd(address);

  //   // Fetch all ranks and sort by qualifierAmount (ascending order)
  //   const ranks = await this.rankRewardsModel
  //     .find()
  //     .sort({ qualifierAmount: 1 });

  //   let currentRankTitle = 'No Rank';
  //   let currentRankIndex = 0;

  //   // Format ranks and determine the current rank
  //   const formattedRanks = ranks.map((rank, index) => {
  //     const isEligible = qualifierBusinessUsd >= rank.qualifierAmount;
  //     if (isEligible) {
  //       currentRankTitle = rank.title;
  //       currentRankIndex = index + 1;
  //     }

  //     return {
  //       title: rank.title,
  //       description: rank.description,
  //       qualifierAmount: rank.qualifierAmount,
  //       rewardAmount: rank.rewardAmount,
  //       progressPercentage: Math.min(
  //         (qualifierBusinessUsd / rank.qualifierAmount) * 100,
  //         100,
  //       ),
  //       isEligibleForClaim: isEligible,
  //     };
  //   });

  //   return {
  //     ranks: formattedRanks,
  //     currentRank: { title: currentRankTitle, index: currentRankIndex },
  //   };
  // }

  // async getAllRanksAndUserEligibilities(address: string) {
  //   const user = await this.User.findOne({ walletAddress: address });
  //   const userId = user._id.toString();
  //   console.log({ userId });
  //   const { qualifierBusiness, totalUsdBusiness } =
  //     await this.rewardsService.getQualifiedBusinessLegs(address);

  //   const ranks = await this.rankRewardsModel
  //     .find()
  //     .sort({ qualifierAmount: 1 });

  //   let currentRankTitle = 'No Rank';
  //   let currentRankIndex = 0;
  //   let remainingBusiness = qualifierBusiness;

  //   // const formattedRanks = ranks.map((rank, index) => {

  //   //   const isEligible = qualifierBusiness >= rank.qualifierAmount;

  //   //   const userClaimStatus = rank.userClaimedStatus.find(
  //   //     (entry) => entry.userId.toString() === userId,
  //   //   );
  //   //   const claimStatus = userClaimStatus?.claimStatus || null;

  //   //   if (isEligible) {
  //   //     currentRankTitle = rank.title;
  //   //     currentRankIndex = index + 1;
  //   //   }

  //   //   return {
  //   //     rank,
  //   //     progressPercentage: Math.min(
  //   //       (qualifierBusiness / rank.qualifierAmount) * 100,
  //   //       100,
  //   //     ),
  //   //     isEligibleForClaim: isEligible && !claimStatus,
  //   //     claimStatus,
  //   //   };
  //   // });

  //   const formattedRanks = ranks.map((rank, index) => {
  //     const previousQualifierAmount =
  //       index === 0 ? 0 : ranks[index - 1].qualifierAmount;
  //     const eligibilityThreshold =
  //       rank.qualifierAmount - previousQualifierAmount;

  //     // Determine how much of the remaining business applies to this rank
  //     const applicableBusiness = Math.max(
  //       0,
  //       Math.min(remainingBusiness, eligibilityThreshold),
  //     );

  //     // Calculate progress percentage
  //     const progressPercentage =
  //       (applicableBusiness / eligibilityThreshold) * 100;

  //     // Check if user is eligible
  //     const isEligible = remainingBusiness >= eligibilityThreshold;

  //     const userClaimStatus = rank.userClaimedStatus.find(
  //       (entry) => entry.userId.toString() === userId,
  //     );
  //     const claimStatus = userClaimStatus?.claimStatus || null;

  //     if (isEligible) {
  //       currentRankTitle = rank.title;
  //       currentRankIndex = index + 1;
  //     }

  //     // Deduct used business for next rank calculation
  //     remainingBusiness -= applicableBusiness;

  //     console.log({ progressPercentage });

  //     return {
  //       rank,
  //       progressPercentage,
  //       isEligibleForClaim: isEligible && !claimStatus,
  //       claimStatus,
  //     };
  //   });

  //   return {
  //     ranks: formattedRanks,
  //     currentRank: {
  //       title: currentRankTitle,
  //       index: currentRankIndex,
  //       qualifierBusinessUsd: qualifierBusiness,
  //       totalUsdBusiness,
  //     },
  //   };
  // }

  // async getAllRanksAndUserEligibilities(address: string) {
  //   const [user, { qualifierBusinessUsd, totalUsdBusiness }, ranks] =
  //     await Promise.all([
  //       this.User.findOne({ walletAddress: address }, { _id: 1 }),
  //       this.getQualifiedBusinessUsd(address),
  //       this.rankRewardsModel.find().sort({ qualifierAmount: 1 }),
  //     ]);

  //   if (!user) throw new Error('User not found');

  //   const userId = user._id.toString();
  //   let currentRankTitle = 'No Rank';
  //   let currentRankIndex = 0;

  //   const formattedRanks = ranks.map((rank, index) => {
  //     const isEligible = qualifierBusinessUsd >= rank.qualifierAmount;
  //     const userClaimStatus = rank.userClaimedStatus.find(
  //       (entry) => entry.userId.toString() === userId,
  //     );

  //     if (isEligible) {
  //       currentRankTitle = rank.title;
  //       currentRankIndex = index + 1;
  //     }

  //     return {
  //       rank,
  //       progressPercentage: Math.min(
  //         (qualifierBusinessUsd / rank.qualifierAmount) * 100,
  //         100,
  //       ),
  //       isEligibleForClaim: isEligible && !userClaimStatus?.claimStatus,
  //       claimStatus: userClaimStatus?.claimStatus || null,
  //     };
  //   });

  //   return {
  //     ranks: formattedRanks,
  //     currentRank: {
  //       title: currentRankTitle,
  //       index: currentRankIndex,
  //       qualifierBusinessUsd,
  //       totalUsdBusiness,
  //     },
  //   };
  // }

  async claimRankReward(address: string, rankId: string) {
    const user = await this.User.findOne({ walletAddress: address });
    const userId = user._id.toString();
    // Get user's qualified business USD
    const { qualifierBusiness } =
      await this.rewardsService.getQualifiedBusinessLegs(address);

    // Find the rank by ID
    const rank = await this.rankRewardsModel.findById(rankId);
    if (!rank) throw new NotFoundException('Rank not found');

    // Check if the user already claimed this rank
    const existingClaim = rank.userClaimedStatus.find(
      (entry) => entry.userId.toString() === userId,
    );

    if (existingClaim) {
      if (existingClaim.claimStatus === RewardClaimStatusEnum.PENDING) {
        throw new BadRequestException(
          'You have already claimed this rank and it is pending approval.',
        );
      }
      if (existingClaim.claimStatus === RewardClaimStatusEnum.APPROVED) {
        throw new BadRequestException('You have already claimed this rank.');
      }
    }

    // Check if user is eligible
    if (qualifierBusiness < rank.qualifierAmount) {
      throw new BadRequestException('You do not qualify for this rank yet.');
    }

    // Add claim entry
    rank.userClaimedStatus.push({
      userId: user._id,
      claimStatus: RewardClaimStatusEnum.PENDING,
    });
    await rank.save();

    return {
      success: true,
      message: 'Rank claimed successfully. Waiting for admin approval.',
    };
  }

  async getUserTotalTokenStaked(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const tokens =
      await this.ethersService.icoContract.userTotalTokenStaked(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
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
  async getQualifiedBusinessUsdCustom(
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
        startTime: { $gte: 1735669801, $lte: 1738952999 },
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
            startTime: { $gte: 1735669801, $lte: 1738952999 },
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

  async getAllUsers() {
    const result = [];
    const allUsers = await this.ethersService.icoContract.getAllUsers();
    await Promise.all(
      allUsers.map(async (user) => {
        const staking = await this.StakingModel.find({
          walletAddress: user,
          isReferred: false,
          startTime: {
            $gte: 1735669801,
            $lte: 1738952999,
          },
        });
        let usdAmount = 0;

        staking.map((stake) => {
          usdAmount += stake.usdAmount;
        });
        const { qualifierBusinessUsd } =
          await this.getQualifiedBusinessUsdCustom(user);
        if (qualifierBusinessUsd >= 10000 || usdAmount >= 2000) {
          result.push({ user, usdAmount, qualifierBusinessUsd });
        }
      }),
    );
    return {
      result,
      totalUsers: result.length,
    };
  }

  async getAllRanksAndUserEligibilities(address: string) {
    const user = await this.User.findOne({ walletAddress: address });
    const userId = user._id.toString();
    console.log({ userId });
    const {
      qualifierBusiness,
      totalUsdBusiness,
      qualifierType,
      refereeBusiness,
      MaxBusinessLeg,
      SecondMaxBusinessLeg,
      restOfMembers,
    } = await this.rewardsService.getQualifiedBusinessLegs(address);

    const ranks = await this.rankRewardsModel
      .find()
      .sort({ qualifierAmount: 1 });

    let currentRankTitle = 'No Rank';
    let currentRankIndex = 0;
    let remainingBusiness = qualifierBusiness;

    // const formattedRanks = ranks.map((rank, index) => {

    //   const isEligible = qualifierBusiness >= rank.qualifierAmount;

    //   const userClaimStatus = rank.userClaimedStatus.find(
    //     (entry) => entry.userId.toString() === userId,
    //   );
    //   const claimStatus = userClaimStatus?.claimStatus || null;

    //   if (isEligible) {
    //     currentRankTitle = rank.title;
    //     currentRankIndex = index + 1;
    //   }

    //   return {
    //     rank,
    //     progressPercentage: Math.min(
    //       (qualifierBusiness / rank.qualifierAmount) * 100,
    //       100,
    //     ),
    //     isEligibleForClaim: isEligible && !claimStatus,
    //     claimStatus,
    //   };
    // });

    const formattedRanks = ranks.map((rank, index) => {
      const previousQualifierAmount =
        index === 0 ? 0 : ranks[index - 1].qualifierAmount;
      const eligibilityThreshold =
        rank.qualifierAmount - previousQualifierAmount;

      // Determine how much of the remaining business applies to this rank
      const applicableBusiness = Math.max(
        0,
        Math.min(remainingBusiness, eligibilityThreshold),
      );

      // Calculate progress percentage
      const progressPercentage =
        (applicableBusiness / eligibilityThreshold) * 100;

      // Check if user is eligible
      const isEligible = remainingBusiness >= eligibilityThreshold;

      const userClaimStatus = rank.userClaimedStatus.find(
        (entry) => entry.userId.toString() === userId,
      );
      const claimStatus = userClaimStatus?.claimStatus || null;

      if (isEligible) {
        currentRankTitle = rank.title;
        currentRankIndex = index + 1;
      }

      // Deduct used business for next rank calculation
      remainingBusiness -= applicableBusiness;

      console.log({ progressPercentage });

      return {
        rank,
        progressPercentage,
        isEligibleForClaim: isEligible && !claimStatus,
        claimStatus,
      };
    });

    return {
      ranks: formattedRanks,
      currentRank: {
        title: currentRankTitle,
        index: currentRankIndex,
        qualifierBusinessUsd: qualifierBusiness,
        totalUsdBusiness,
      },
      breakdown: {
        qualifierType,
        refereeBusiness,
        MaxBusinessLeg,
        SecondMaxBusinessLeg,
        restOfMembers,
      },
    };
  }
}
