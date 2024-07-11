import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EthersService } from 'src/ethers/ethers.service';
import { Staking } from './schema/staking.schema';
import { Model } from 'mongoose';
import { LogDescription } from 'ethers';
import { StakeDuration } from './schema/stakeDuration.schema';

@Injectable()
export class StakingService {
  constructor(
    private readonly ethersService: EthersService,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(StakeDuration.name) private StakeDurationModel: Model<StakeDuration>,
  ) {}

  private BigIntToNumber(value: BigInt) {
    return Number(value) / Math.pow(10, 18);
  }

  async createStakingRecord(txHash: string) {
    const receipt =
      await this.ethersService.binanceProvider.getTransactionReceipt(txHash);
    const logs: LogDescription = this.ethersService.stakingInterface.parseLog(
      receipt?.logs[receipt.logs.length - 1],
    );

    const stakeDuration = await this.StakeDurationModel.findOne({poolType:Number(logs.args[3])})
    if(!stakeDuration){
      throw new Error('Stake duration not found')
    }

    const createRecord = await this.StakingModel.create({
      stakeId: Number(logs.args[5]),
      walletAddress: logs.args[0],
      amount: this.BigIntToNumber(logs.args[1]),
      apr: Number(logs.args[2])/10,
      poolType: Number(logs.args[3]),
      startTime: Number(logs.args[4]),
      stakeDuration:stakeDuration.duration,
      txHash
    });
    return { stake: createRecord };
  }

  async getAllStakesByUser(walletAddress: string) {
    const stakes = await this.StakingModel.find({
      walletAddress: {
        $regex: walletAddress,
        $options: 'i',
      },
    }).sort({startTime:-1});
    return { stakes };
  }

  async createStakeDuration(stakeDuration:{poolType:number, duration:number}) {
    const createRecord = await this.StakeDurationModel.create(stakeDuration);
    return { stakeDuration: createRecord };
  }

}
