import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Staking } from './schema/staking.schema';
import { Model } from 'mongoose';
import { LogDescription } from 'ethers';
import { StakeDuration } from './schema/stakeDuration.schema';
import { ClaimedRewardForStakeHistory } from './schema/claimedRewardForStakeHistory.schema';
import { IRefStakeLogs, IClaimedRewardForStake } from './types/logs';

@Injectable()
export class StakingService {
  constructor(
    private readonly ethersService: EthersService,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(StakeDuration.name)
    private StakeDurationModel: Model<StakeDuration>,
    @InjectModel(ClaimedRewardForStakeHistory.name)
    private claimedRewardForStakeModel: Model<ClaimedRewardForStakeHistory>,
  ) {}

  private BigIntToNumber(value: BigInt) {
    return Number(value) / Math.pow(10, 18);
  }

  async createStakingRecord(txHash: string) {
    const txExist = await this.StakingModel.find({
      txHash
    })

    if(txExist) {
      throw new ConflictException("transaction already exists")
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
        };

        return formattedReferralLog;
      });

      await this.StakingModel.insertMany(refStakedLogs);
    }

    const createRecord = await this.StakingModel.create({
      stakeId: Number(stakedLogs.args[5]),
      walletAddress: stakedLogs.args[0],
      amount: this.BigIntToNumber(stakedLogs.args[1]),
      apr: Number(stakedLogs.args[2]) / 10,
      poolType: Number(stakedLogs.args[3]),
      startTime: Number(stakedLogs.args[4]),
      stakeDuration: stakeDuration.duration,
      txHash,
      isReferred: false,
    });
    return { stake: createRecord };
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
    const txExist = await this.claimedRewardForStakeModel.find({
      txHash
    })
    if(txExist) {
      throw new ConflictException("transaction already exists")
    }
    const receipt =
      await this.ethersService.binanceProvider.getTransactionReceipt(txHash);

    const filteredLogs = receipt.logs.filter(
      (log) => log.topics[0] === process.env.REWARD_CLAIMED_TOPIC,
    );

    if (!filteredLogs.length) {
      throw new NotFoundException('No Reward found');
    }

    const claimedRewards: IClaimedRewardForStake[] = filteredLogs.map((log) => {
      const parsedLog = this.ethersService.stakingInterface.parseLog(log).args;
      const formattedClaimedLog: IClaimedRewardForStake = {
        stakeId: Number(parsedLog[0]),
        walletAddress: parsedLog[1],
        amount: this.BigIntToNumber(parsedLog[2]),
        timestamp: Number(parsedLog[3]),
        txHash,
      };

      return formattedClaimedLog;
    });

    return this.claimedRewardForStakeModel.insertMany(claimedRewards);
  }

  async getAllClaimedRewardsByUser(walletAddress: string) {
    const allStakedClaims = await this.claimedRewardForStakeModel.find({
      walletAddress,
    });

    return allStakedClaims.length ? allStakedClaims : [];
  }

  async getReferralStream(walletAddress: string) {
    const referralStream = await this.StakingModel.find({
      isReferred: true,
      walletAddress,
    });
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

    return result.length ? result : [];
  }
}
