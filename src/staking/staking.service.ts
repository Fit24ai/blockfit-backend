import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Staking } from './schema/staking.schema';
import { Model } from 'mongoose';
import BigNumber from 'bignumber.js';
import {
  Contract,
  formatUnits,
  getAddress,
  JsonRpcProvider,
  LogDescription,
  Wallet,
} from 'ethers';
import { StakeDuration } from './schema/stakeDuration.schema';
import { ClaimedRewardForStakeHistory } from './schema/claimedRewardForStakeHistory.schema';
import { IRefStakeLogs, IClaimedRewardForStake } from './types/logs';
import { TransactionStatusEnum } from 'src/types/transaction';
import { ClaimedHistory } from './schema/claimedHistory.schema';

@Injectable()
export class StakingService {
  constructor(
    private readonly ethersService: EthersService,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(StakeDuration.name)
    private StakeDurationModel: Model<StakeDuration>,
    @InjectModel(ClaimedRewardForStakeHistory.name)
    private claimedRewardForStakeModel: Model<ClaimedRewardForStakeHistory>,
    @InjectModel(ClaimedHistory.name)
    private claimedHistotyModel: Model<ClaimedHistory>,
  ) {}

  private BigIntToNumber(value: BigInt) {
    return Number(value) / Math.pow(10, 18);
  }
  private BigToNumber(value: BigInt): number {
    const bigNumberValue = new BigNumber(value.toString());
    return bigNumberValue.dividedBy(new BigNumber(10).pow(18)).toNumber();
  }

  async createStake(txHash: string, walletAddress: string, poolType: number) {
    const isStakeExist = await this.StakingModel.findOne({
      txHash,
      walletAddress: { $regex: walletAddress, $options: 'i' },
    });
    console.log(1)

    if (isStakeExist) {
      throw new ConflictException('Transaction already exists');
    }
    console.log(2)
    const stakeDuration = await this.StakeDurationModel.findOne({
      poolType,
    });
    if (!stakeDuration) {
      throw new Error('Stake duration not found');
    }
    const stake = await this.StakingModel.create({
      txHash: txHash,
      walletAddress,
      startTime: Math.floor(Date.now() / 1000),
      stakeDuration: stakeDuration.duration,
    });
    console.log(3)
    return {
      message: 'Stake create successfully',
    };
  }

  async verifyStakingRecord(txHash: string, walletAddress: string) {
    console.log('verify');

    const transaction = await this.StakingModel.findOne({
      txHash,
      walletAddress: { $regex: walletAddress, $options: 'i' },
    });

    if (!transaction) {
      throw new ConflictException("transaction doesn't exists");
    }

    if (transaction.stakeId !== 0) {
      throw new ConflictException('transaction already exists');
    }
    const receipt =
      await this.ethersService.binanceProvider.getTransactionReceipt(txHash);

    console.log('receipt', receipt);

    const stakedLogs2 = receipt.logs.filter(
      (log) => log.topics[0] === process.env.STAKED_TOPIC,
    );

    console.log('Filtered Staked Logs:', stakedLogs2);

    let stakedLogs;
    for (const log of stakedLogs2) {
      try {
        const parsedLog = this.ethersService.stakingInterface.parseLog(log);
        stakedLogs = parsedLog;
        console.log('Parsed Log:', parsedLog.args);
      } catch (error) {
        console.error('Failed to parse filtered log:', error);
      }
    }

    const filteredLogs = receipt.logs.filter(
      (log) => log.topics[0] === process.env.REFERRAL_TOPIC,
    );
    


    const stakeDuration = await this.StakeDurationModel.findOne({
      poolType: Number(stakedLogs.args[3]),
    });

    if (!stakeDuration) {
      throw new Error('Stake duration not found');
    }


    if (filteredLogs.length > 0) {
      const refStakedLogs = await Promise.all(
        filteredLogs.map(async (log) => {
          const parsedLog =
            this.ethersService.stakingInterface.parseLog(log).args;

          const idToStake = await this.ethersService.icoContract.idToStake(
            Number(parsedLog[2]),
          );
          console.log(idToStake);

          const formattedReferralLog: IRefStakeLogs = {
            stakeId: Number(parsedLog[2]),
            walletAddress: parsedLog[0],
            amount: this.BigToNumber(parsedLog[1]),
            apr: Number(idToStake[2]) / 10,
            poolType: Number(idToStake[3]),
            startTime: Number(stakedLogs.args[4]), // Changed from stakedLogs.args[4] to parsedLog[4]
            stakeDuration: stakeDuration.duration,
            txHash,
            isReferred: true,
            level: Number(parsedLog[3]),
            refId: Number(parsedLog[4]),
            transactionStatus:
              receipt.status === 1
                ? TransactionStatusEnum.CONFIRMED
                : TransactionStatusEnum.FAILED,
          };

          return formattedReferralLog;
        }),
      );

      console.log(refStakedLogs);
      await this.StakingModel.insertMany(refStakedLogs);
    }

    const idToStake = await this.ethersService.icoContract.idToStake(
      Number(Number(stakedLogs.args[5])),
    );

    const updateRecord = await this.StakingModel.findByIdAndUpdate(
      transaction._id,
      {
        stakeId: Number(stakedLogs.args[5]),
        walletAddress: stakedLogs.args[0],
        amount: this.BigToNumber(stakedLogs.args[1]),
        apr: Number(idToStake[2]) / 10,
        poolType: Number(idToStake[3]),
        startTime: Number(stakedLogs.args[4]),
        stakeDuration: stakeDuration.duration,
        txHash,
        isReferred: false,
        transactionStatus:
          receipt.status === 1
            ? TransactionStatusEnum.CONFIRMED
            : TransactionStatusEnum.FAILED,
      },
      {
        new: true,
      },
    );
    console.log(updateRecord);
    return { stake: updateRecord };
  }

  async getAllStakesByUser(walletAddress: string) {
    const stakes = await this.StakingModel.find({
      walletAddress: { $regex: walletAddress, $options: 'i' },
      isReferred: false,
    }).sort({ startTime: -1 });
    return { stakes };
  }

  async createStakeDuration(stakeDuration: {
    poolType: number;
    duration: number;
  }) {
    const createRecord = await this.StakeDurationModel.create(stakeDuration);
    return { stakeDuration: createRecord };
  }

  async createClaimedRewardForStake(txHash: string) {
    // console.log(txHash);
    const txExist = await this.claimedRewardForStakeModel.find({
      txHash: { $regex: txHash, $options: 'i' },
    });
    if (txExist.length) {
      throw new ConflictException('transaction already exists');
    }
    const receipt =
      await this.ethersService.binanceProvider.getTransactionReceipt(txHash);

    // console.log(receipt.logs)

    const filteredLogs = receipt.logs.filter(
      (log) => log.topics[0] === process.env.REWARD_CLAIMED_TOPIC,
    );

    // console.log(filteredLogs);

    if (!filteredLogs.length) {
      throw new NotFoundException('No Reward found');
    }

    const claimedRewards: IClaimedRewardForStake[] = filteredLogs.map((log) => {
      const parsedLog = this.ethersService.stakingInterface.parseLog(log).args;
      // console.log(log);
      // console.log('parsed', parsedLog);
      const formattedClaimedLog: IClaimedRewardForStake = {
        stakeId: Number(parsedLog[0]),
        walletAddress: parsedLog[1],
        amount: this.BigToNumber(parsedLog[2]),
        // timestamp: Number(parsedLog[3]),
        timestamp: Math.floor(Date.now() / 1000),
        txHash,
      };

      // console.log(formattedClaimedLog);

      return formattedClaimedLog;
    });

    // console.log(claimedRewards);

    // for (const log of claimedRewards) {
    //   try {
    //     const stake = await this.StakingModel.findOne({ stakeId: log.stakeId });
    //     if (stake) {
    //       log.poolType = stake.poolType;
    //       log.isReferred = stake.isReferred;
    //     }
    //   } catch (error) {
    //     console.error(
    //       `Error processing log with stakeId ${log.stakeId}:`,
    //       error,
    //     );
    //   }
    // }
    console.log(claimedRewards);

    claimedRewards.map(async (reward) => {
      const stake = await this.StakingModel.findOne({
        stakeId: reward.stakeId,
      });
      if (stake) {
        console.log(stake);
        reward.poolType = stake.poolType;
        reward.isReferred = stake.isReferred;
      }
      await this.claimedHistotyModel.create(reward);
      if (stake) {
        stake.totalClaimed = stake.totalClaimed + reward.amount;
        await stake.save();
      }
    });

    // return this.claimedHistotyModel.insertMany(claimedRewards);
    // console.log(txHash);
    // const txExist = await this.claimedRewardForStakeModel.find({
    //   txHash: { $regex: txHash, $options: 'i' },
    // });
    // if (txExist.length) {
    //   throw new ConflictException('transaction already exists');
    // }
    // const receipt =
    //   await this.ethersService.binanceProvider.getTransactionReceipt(txHash);

    //   // console.log(receipt.logs)

    // const filteredLogs = receipt.logs.filter(
    //   (log) => log.topics[0] === process.env.REWARD_CLAIMED_TOPIC,
    // );

    // console.log(filteredLogs)

    // if (!filteredLogs.length) {
    //   throw new NotFoundException('No Reward found');
    // }

    // const claimedRewards: IClaimedRewardForStake[] = filteredLogs.map((log) => {
    //   const parsedLog = this.ethersService.stakingInterface.parseLog(log).args;
    //   console.log(log)
    //   console.log("parsed",parsedLog)
    //   const formattedClaimedLog: IClaimedRewardForStake = {
    //     // stakeId: Number(parsedLog[0]),
    //     walletAddress: parsedLog[0],
    //     amount: this.BigIntToNumber(parsedLog[1]),
    //     timestamp: Number(parsedLog[2]),
    //     txHash,
    //   };

    //   console.log(formattedClaimedLog)

    //   return formattedClaimedLog;
    // });

    // console.log(claimedRewards)

    // // for (const log of claimedRewards) {
    // //   try {
    // //     const stake = await this.StakingModel.findOne({ stakeId: log.stakeId });
    // //     if (stake) {
    // //       log.poolType = stake.poolType;
    // //       log.isReferred = stake.isReferred;
    // //     }
    // //   } catch (error) {
    // //     console.error(
    // //       `Error processing log with stakeId ${log.stakeId}:`,
    // //       error,
    // //     );
    // //   }
    // // }
    // console.log(claimedRewards)
    // return this.claimedRewardForStakeModel.insertMany(claimedRewards);
  }

  async getAllClaimedRewardsByUser(walletAddress: string) {
    const allStakedClaims = await this.claimedHistotyModel
      .find({
        walletAddress,
      })
      .sort({ timestamp: -1 });

    return allStakedClaims.length ? allStakedClaims : [];
  }

  async getAllRefrralRewardClaimed(walletAddress: string) {
    let count = 0;
    const referralStream = await this.StakingModel.find({
      isReferred: true,
      walletAddress,
    }).sort({ startTime: -1 });

    for (const referral of referralStream) {
      const amount = await this.ethersService.icoContract.stakeRewardClaimed(
        referral.stakeId,
      );
      count = Number(amount) + count;
    }
    return { rewards: Number(formatUnits(count.toString(), 18)) };
  }
  async getAllStakeRewardClaimed(walletAddress: string) {
    let count = 0;
    const referralStream = await this.StakingModel.find({
      isReferred: false,
      walletAddress,
    }).sort({ startTime: -1 });

    for (const referral of referralStream) {
      const amount = await this.ethersService.icoContract.stakeRewardClaimed(
        referral.stakeId,
      );
      count = Number(amount) + count;
    }
    return { rewards: Number(formatUnits(count.toString(), 18)) };
  }

  async getReferralStream(walletAddress: string, level?: number) {
    // const referralStream = await this.StakingModel.find({
    //   isReferred: true,
    //   walletAddress,
    // }).sort({ startTime: -1 });

    let result = [];

    // Fetch referrals based on level
    if (level) {
      result = await this.getReferralsByLevel(walletAddress, level);
    } else {
      // If no level is provided, fetch all referral levels
      const referralStream = await this.StakingModel.find({
        isReferred: true,
        walletAddress,
      }).sort({ startTime: -1 });

      // console.log(referralStream)

      for (const referral of referralStream) {
        const referredUser = await this.StakingModel.findOne({
          stakeId: referral.refId,
        }).exec();

        // console.log(referredUser)

        if (referredUser) {
          result.push({
            referralDetails: referral,
            referreDetails: {
              referre: referredUser.walletAddress,
              amount: referredUser.amount,
            },
          });
        }
      }
    }

    return result.length ? result : [];
  }

  private async getReferralsByLevel(walletAddress: string, level: number) {
    let result = [];
    const referralStream = await this.StakingModel.find({
      isReferred: true,
      walletAddress,
      level: level,
    }).sort({ startTime: -1 });

    for (const referral of referralStream) {
      const referredUser = await this.StakingModel.findOne({
        stakeId: referral.refId,
      }).exec();

      // console.log(referredUser)

      if (referredUser) {
        result.push({
          referralDetails: referral,
          referreDetails: {
            referre: referredUser.walletAddress,
            amount: referredUser.amount,
          },
        });
      }
    }
    return result;
  }

  private async getAllReferrals(referralStream: any[]) {
    const result = [];

    for (const referral of referralStream) {
      const referredUser = await this.StakingModel.findOne({
        stakeId: referral.refId,
      }).exec();

      if (referredUser) {
        result.push({
          referralDetails: referral,
          referreDetails: {
            referre: referredUser.walletAddress,
            amount: referredUser.amount,
          },
        });
      }
    }

    return result;
  }

  // async getTotalMembers(
  //   address: string,
  //   checkedAddresses: Set<string> = new Set(),
  // ): Promise<number> {
  //   // console.log(address);
  //   if (checkedAddresses.has(address)) {
  //     return 0;
  //   }
  //   checkedAddresses.add(address);

  //   try {
  //     const directMembers = await this.referralContract.getAllRefrees(address);
  //     let totalCount = directMembers.length;

  //     for (const member of directMembers) {
  //       totalCount += await this.getTotalMembers(member, checkedAddresses);
  //     }

  //     return totalCount;
  //   } catch (error) {
  //     console.error('Error fetching direct members:', error);
  //     throw error;
  //   }
  // }
  async getTotalMembersAndStaked(
    address: string,
    checkedAddresses: Set<string> = new Set(),
  ): Promise<{
    totalCount: number;
    totalTeamStakedAmount: number;
    stakersWithMoreThanZeroTokens: string[]; // Members with staked tokens > 0
    stakerCount: number; // Count of members with staked tokens > 0
  }> {
    // Avoid recalculating for the same address
    if (checkedAddresses.has(address)) {
      return {
        totalCount: 0,
        totalTeamStakedAmount: 0,
        stakersWithMoreThanZeroTokens: [],
        stakerCount: 0,
      };
    }

    // Mark this address as checked
    checkedAddresses.add(address);

    try {
      // Fetch direct members of the current address
      const directMembers =
        await this.ethersService.referralContract.getAllRefrees(address);
      // console.log(address);
      // console.log(directMembers);
      let totalCount = directMembers.length;
      let totalTeamStakedAmount = 0;
      let stakersWithMoreThanZeroTokens: string[] = [];

      // Loop through each direct member
      for (const member of directMembers) {
        // Fetch and accumulate the staked amount for the member
        const { tokens: memberStakedTokens } =
          await this.getUserTotalTokenStaked(member);

        // Check if the member has staked more than 0 tokens
        if (memberStakedTokens > 0) {
          totalTeamStakedAmount += memberStakedTokens;
          stakersWithMoreThanZeroTokens.push(member); // Add member with staked tokens > 0
        }

        // Recursively fetch the count and staked amounts for the member's team
        const {
          totalCount: memberCount,
          totalTeamStakedAmount: memberTeamStaked,
          stakersWithMoreThanZeroTokens: memberStakers,
          stakerCount: memberStakerCount,
        } = await this.getTotalMembersAndStaked(member, checkedAddresses);

        totalCount += memberCount;
        totalTeamStakedAmount += memberTeamStaked;
        stakersWithMoreThanZeroTokens =
          stakersWithMoreThanZeroTokens.concat(memberStakers); // Merge nested stakers
      }

      return {
        totalCount,
        totalTeamStakedAmount,
        stakersWithMoreThanZeroTokens,
        stakerCount: stakersWithMoreThanZeroTokens.length, // Count of members with staked tokens > 0
      };
    } catch (error) {
      console.error('Error fetching members or staked amounts:', error);
      throw error;
    }
  }

  async getUserTotalTokenStaked(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const tokens =
      await this.ethersService.icoContract.userTotalTokenStaked(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
  }

  async getAllLevelMembers(
    address: string,
    targetLevel: number,
    currentLevel: number = 1,
    checkedAddresses: Set<string> = new Set(),
  ): Promise<{
    totalCount: number;
    zeroStakedCount: number;
    stakedCount: number;
    stakedData: any[];
    totalStakedAmount: number;
  }> {
    if (checkedAddresses.has(address)) {
      return {
        totalCount: 0,
        zeroStakedCount: 0,
        stakedCount: 0,
        stakedData: [],
        totalStakedAmount: 0,
      };
    }

    // Mark the address as checked
    checkedAddresses.add(address);

    let zeroStakedCount = 0;
    let stakedCount = 0;
    let totalStakedAmount = 0;
    let stakedData: any[] = [];
    let totalCount = 0;

    try {
      const directMembers =
        await this.ethersService.referralContract.getAllRefrees(address);

      if (currentLevel === targetLevel) {
        for (const member of directMembers) {
          const { tokens } = await this.getUserTotalTokenStaked(member);

          if (tokens === 0) {
            zeroStakedCount += 1;
          } else {
            stakedCount += 1;
            stakedData.push({ address: member, tokens });
            totalStakedAmount += tokens;
          }

          totalCount += 1;
        }
      } else {
        for (const member of directMembers) {
          const memberResult = await this.getAllLevelMembers(
            member,
            targetLevel,
            currentLevel + 1,
            checkedAddresses,
          );

          totalCount += memberResult.totalCount;
          zeroStakedCount += memberResult.zeroStakedCount;
          stakedCount += memberResult.stakedCount;
          stakedData = [...stakedData, ...memberResult.stakedData];
          totalStakedAmount += memberResult.totalStakedAmount; // Accumulate total staked amount
        }
      }

      return {
        totalCount,
        zeroStakedCount,
        stakedCount,
        stakedData,
        totalStakedAmount,
      };
    } catch (error) {
      console.error('Error fetching direct members or staked amounts:', error);
      throw error;
    }
  }

  async getUserLevel(
    address: string,
    checkedAddresses: Set<string> = new Set(),
  ): Promise<number> {
    // If the address has already been checked, return level 0
    if (checkedAddresses.has(address)) {
      return 0;
    }

    // Mark the address as checked
    checkedAddresses.add(address);

    try {
      // Fetch direct members (referrals)
      const directMembers =
        await this.ethersService.referralContract.getAllRefrees(address);

      if (directMembers.length === 0) {
        // If no direct members, the level is 0
        return 0;
      }

      // Start with level 1 if there are direct members
      let maxLevel = 1;

      // Recursively determine the level of each direct member
      for (const member of directMembers) {
        const memberLevel = await this.getUserLevel(member, checkedAddresses);
        maxLevel = Math.max(maxLevel, memberLevel + 1);
      }

      // Return the maximum level found
      return maxLevel;
    } catch (error) {
      console.error('Error fetching direct members:', error);
      throw error;
    }
  }

  // Example usage
  // async calculateAllStakes(address: string) {
  //   const result = await this.getAllLevelMembers(address);

  //   console.log(`Total members: ${result.totalCount}`);
  //   console.log(`Members with zero staked: ${result.zeroStakedCount}`);
  //   console.log(`Members with staked tokens: ${result.stakedCount}`);
  //   console.log(
  //     `Staked data of members with staked tokens:`,
  //     result.stakedData,
  //   );
  // }

  // Example usage
  // async calculateMemberStakes(address: string) {
  //   const result = await this.getAllLevelMembers(address);

  //   console.log(`Total members: ${result.totalCount}`);
  //   console.log(`Members with zero staked: ${result.zeroStakedCount}`);
  //   console.log(`Members with staked tokens: ${result.stakedCount}`);
  // }

  async getDirectMemberswithStakedTokens(address: string) {
    let levelCount = 0;
    let memberData = [];
    let tokensLevel = 0;
    try {
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

      for (const member of directMembers) {
        const tokens = await this.getUserTotalTokenStaked(member);

        if (tokens.tokens > 0) {
          levelCount += 1;
          memberData.push({ address: member, tokens: tokens.tokens });

          if (levelCount >= 24) {
            levelCount = 24;
            break;
          }
        }
      }

      if (levelCount <= tokensLevel) {
        levelCount = tokensLevel;
      }

      return { levelCount, memberData };
    } catch (error) {
      console.error('Error fetching level:', error);
      throw error;
    }
  }

  async getTotalNetworkMembers() {
    let totalStakedMembers = 0;
    let stakedMemberData = [];
    try {
      const members = await this.ethersService.icoContract.getAllUsers();
      for (const member of members) {
        const tokens = await this.getUserTotalTokenStaked(member);
        if (tokens.tokens > 0) {
          totalStakedMembers += 1;
          stakedMemberData.push({ address: member, tokens: tokens.tokens });
        }
      }
      return {
        totalStakedMembers,
        stakedMemberData,
        members,
        totalMembers: members.length,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async getTotalNetworkStaked() {
    const tokens = await this.ethersService.icoContract.totalStakedTokens();
    return Number(formatUnits(tokens, 18));
  }
  async getTotalNetworkWithdrawals() {
    try {
      const tokens =
        await this.ethersService.icoContract.totalWithdrawnTokens();
      // console.log(tokens);
      return Number(formatUnits(tokens, 18));
    } catch (error) {
      // console.log(error);
    }
  }

  async getRefrees(address: string) {
    // console.log(address);
    const directMembers =
      await this.ethersService.referralContract.getAllRefrees(address);
    // console.log(directMembers);
  }

  async getReferrer(address: string) {
    const referrer =
      await this.ethersService.referralContract.getReferrer(address);
    // console.log(referrer);
    return referrer;
  }
}
