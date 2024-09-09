import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Staking } from './schema/staking.schema';
import { Model } from 'mongoose';
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
import { referralAbi } from './libs/referralAbi';
import {
  fit24ReferralContractAddress,
  fit24StakingContractAddress,
} from './libs/contract';
import { stakingAbi } from './libs/stakingAbi';
import { ClaimedHistory } from './schema/claimedHistory.schema';

@Injectable()
export class StakingService {
  public readonly binanceProvider = new JsonRpcProvider(
    process.env.BINANCE_PRC_PROVIDER,
  );
  public referralContract = new Contract(
    fit24ReferralContractAddress,
    referralAbi,
    this.binanceProvider,
  );
  public stakingContract = new Contract(
    fit24StakingContractAddress,
    stakingAbi,
    this.binanceProvider,
  );
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

  async createStake(txHash: string, walletAddress: string, poolType: number) {
    const isStakeExist = await this.StakingModel.findOne({
      txHash,
      walletAddress: { $regex: walletAddress, $options: 'i' },
    });

    if (isStakeExist) {
      throw new ConflictException('Transaction already exists');
    }
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

    const stakedLogs: LogDescription =
      this.ethersService.stakingInterface.parseLog(
        receipt?.logs[receipt.logs.length - 1],
      );

    const filteredLogs = receipt.logs.filter(
      (log) => log.topics[0] === process.env.REFERRAL_TOPIC,
    );

    console.log('logs', filteredLogs);
    console.log('staked logs', stakedLogs);

    const stakeDuration = await this.StakeDurationModel.findOne({
      poolType: Number(stakedLogs.args[3]),
    });

    if (!stakeDuration) {
      throw new Error('Stake duration not found');
    }

    if (filteredLogs.length > 0) {
      const refStakedLogs: IRefStakeLogs[] = filteredLogs.map((log) => {
        const parsedLog =
          this.ethersService.stakingInterface.parseLog(log).args;

        const formattedReferralLog: IRefStakeLogs = {
          stakeId: Number(parsedLog[2]),
          walletAddress: parsedLog[0],
          amount: this.BigIntToNumber(parsedLog[1]),
          apr: Number(stakedLogs.args[2]) / 10,
          poolType: Number(stakedLogs.args[3]),
          startTime: Number(stakedLogs.args[4]),
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
      });

      await this.StakingModel.insertMany(refStakedLogs);
    }

    const updateRecord = await this.StakingModel.findByIdAndUpdate(
      transaction._id,
      {
        stakeId: Number(stakedLogs.args[5]),
        walletAddress: stakedLogs.args[0],
        amount: this.BigIntToNumber(stakedLogs.args[1]),
        apr: Number(stakedLogs.args[2]) / 10,
        poolType: Number(stakedLogs.args[3]),
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
    return { stake: updateRecord };
  }

  async getAllStakesByUser(walletAddress: string) {
    const stakes = await this.StakingModel.find({
      walletAddress: {
        $regex: walletAddress,
        $options: 'i',
      },
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
    console.log(txHash);
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

    console.log(filteredLogs)


    if (!filteredLogs.length) {
      throw new NotFoundException('No Reward found');
    }

    const claimedRewards: IClaimedRewardForStake[] = filteredLogs.map((log) => {
      const parsedLog = this.ethersService.stakingInterface.parseLog(log).args;
      console.log(log)
      console.log("parsed",parsedLog)
      const formattedClaimedLog: IClaimedRewardForStake = {
        // stakeId: Number(parsedLog[0]),
        walletAddress: parsedLog[0],
        amount: this.BigIntToNumber(parsedLog[1]),
        timestamp: Number(parsedLog[2]),
        txHash,
      };

      console.log(formattedClaimedLog)

      return formattedClaimedLog;
    });

    console.log(claimedRewards)

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
    console.log(claimedRewards)
    return this.claimedHistotyModel.insertMany(claimedRewards);
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

  async getReferralStream(walletAddress: string) {
    const referralStream = await this.StakingModel.find({
      isReferred: true,
      walletAddress,
    }).sort({ startTime: -1 });
    const result = [];

    // console.log(referralStream);

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

    return result.length ? result : [];
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
      const directMembers = await this.referralContract.getAllRefrees(address);
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
      await this.stakingContract.userTotalTokenStaked(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
  }

  // async getAllLevelMembers(
  //   address: string,
  //   checkedAddresses: Set<string> = new Set(),
  // ): Promise<{
  //   totalCount: number;
  //   zeroStakedCount: number;
  //   stakedCount: number;
  //   stakedData: any[]; // Collect and return staked data of members with staked tokens
  // }> {
  //   // If the address has already been checked, return 0 counts
  //   if (checkedAddresses.has(address)) {
  //     return {
  //       totalCount: 0,
  //       zeroStakedCount: 0,
  //       stakedCount: 0,
  //       stakedData: [], // Return empty staked data if address is already checked
  //     };
  //   }

  //   // Mark the address as checked
  //   checkedAddresses.add(address);

  //   let zeroStakedCount = 0;
  //   let stakedCount = 0;
  //   let stakedData: any[] = []; // Initialize an array to collect staked data

  //   try {
  //     // Fetch the staking amount for the current address
  //     const { tokens } = await this.getUserTotalTokenStaked(address);

  //     // Determine if the current address has zero or some tokens staked
  //     if (tokens === 0) {
  //       zeroStakedCount = 1;
  //     } else {
  //       stakedCount = 1;
  //       stakedData.push({ address, tokens }); // Collect staked data
  //     }

  //     // Fetch direct members (referrals)
  //     const directMembers = await this.referralContract.getAllRefrees(address);
  //     let totalCount = 1; // Start with 1 to count the current user

  //     // Recursively count for all direct members
  //     for (const member of directMembers) {
  //       const memberResult = await this.getAllLevelMembers(
  //         member,
  //         checkedAddresses,
  //       );

  //       // Accumulate counts and staked data from recursive calls
  //       totalCount += memberResult.totalCount;
  //       zeroStakedCount += memberResult.zeroStakedCount;
  //       stakedCount += memberResult.stakedCount;
  //       stakedData = [...stakedData, ...memberResult.stakedData]; // Merge staked data
  //     }

  //     // Return the total count, zero/staked counts, and staked data
  //     return {
  //       totalCount,
  //       zeroStakedCount,
  //       stakedCount,
  //       stakedData,
  //     };
  //   } catch (error) {
  //     console.error('Error fetching direct members:', error);
  //     throw error;
  //   }
  // }

  // async getAllLevelMembers(
  //   address: string,
  //   targetLevel: number, // Level you want to retrieve data for
  //   currentLevel: number = 1, // Track the current level, starting from 1
  //   checkedAddresses: Set<string> = new Set(),
  // ): Promise<{
  //   totalCount: number;
  //   zeroStakedCount: number;
  //   stakedCount: number;
  //   stakedData: any[]; // Collect and return staked data of members with staked tokens
  // }> {
  //   // If the address has already been checked, return 0 counts
  //   if (checkedAddresses.has(address)) {
  //     return {
  //       totalCount: 0,
  //       zeroStakedCount: 0,
  //       stakedCount: 0,
  //       stakedData: [],
  //     };
  //   }

  //   // Mark the address as checked
  //   checkedAddresses.add(address);

  //   let zeroStakedCount = 0;
  //   let stakedCount = 0;
  //   let stakedData: any[] = [];
  //   let totalCount = 0;

  //   try {
  //     // Fetch direct members (referrals)
  //     const directMembers = await this.referralContract.getAllRefrees(address);

  //     if (currentLevel === targetLevel) {
  //       // If at the target level, gather data for these members
  //       for (const member of directMembers) {
  //         const { tokens } = await this.getUserTotalTokenStaked(member);

  //         // Determine if the member has zero or some tokens staked
  //         if (tokens === 0) {
  //           zeroStakedCount += 1;
  //         } else {
  //           stakedCount += 1;
  //           stakedData.push({ address: member, tokens });
  //         }

  //         totalCount += 1; // Count the member at the target level
  //       }
  //     } else {
  //       // If not at the target level, recurse to the next level
  //       for (const member of directMembers) {
  //         const memberResult = await this.getAllLevelMembers(
  //           member,
  //           targetLevel,
  //           currentLevel + 1, // Move to the next level
  //           checkedAddresses
  //         );

  //         // Accumulate the results from recursive calls
  //         totalCount += memberResult.totalCount;
  //         zeroStakedCount += memberResult.zeroStakedCount;
  //         stakedCount += memberResult.stakedCount;
  //         stakedData = [...stakedData, ...memberResult.stakedData];
  //       }
  //     }

  //     // Return the counts and staked data for the specified level
  //     return {
  //       totalCount,
  //       zeroStakedCount,
  //       stakedCount,
  //       stakedData,
  //     };
  //   } catch (error) {
  //     console.error('Error fetching direct members or staked amounts:', error);
  //     throw error;
  //   }
  // }

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
      const directMembers = await this.referralContract.getAllRefrees(address);

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
      const directMembers = await this.referralContract.getAllRefrees(address);

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

    try {
      // Get user's own staked tokens
      const userTokens = await this.getUserTotalTokenStaked(address);

      // Calculate additional levels based on staked tokens, capped at 24
      if (userTokens.tokens > 12500) {
        const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
        levelCount += additionalLevels;
      }

      // Cap the levelCount at 24 levels
      if (levelCount > 24) {
        levelCount = 24;
      }

      // Fetch direct members
      const directMembers = await this.referralContract.getAllRefrees(address);

      for (const member of directMembers) {
        // Get staked tokens for each direct member
        const tokens = await this.getUserTotalTokenStaked(member);

        // If member's staked tokens are greater than 0, count them
        if (tokens.tokens > 0) {
          // Add 1 level for each direct member with staked tokens
          levelCount += 1;
          memberData.push({ address: member, tokens: tokens.tokens });

          // Ensure that levelCount does not exceed 24
          if (levelCount >= 24) {
            levelCount = 24;
            break; // Stop adding more levels once we hit 24
          }
        }
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
      const members = await this.stakingContract.getAllUsers();
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
    const tokens = await this.stakingContract.totalStakedTokens();
    return Number(formatUnits(tokens, 18));
  }
  async getTotalNetworkWithdrawals() {
    try {
      const tokens = await this.stakingContract.totalWithdrawnTokens();
      console.log(tokens)
      return Number(formatUnits(tokens, 18));
      
    } catch (error) {
      console.log(error)
    }
  }

  async getRefrees(address: string) {
    console.log(address);
    const directMembers = await this.referralContract.getAllRefrees(address);
    console.log(directMembers);
  }
}
