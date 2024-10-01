import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Contract, JsonRpcProvider } from 'ethers';
import {
  fit24ReferralContractAddress,
  fit24StakingContractAddress,
} from 'src/staking/libs/contract';
import { referralAbi } from 'src/staking/libs/referralAbi';
import { stakingAbi } from 'src/staking/libs/stakingAbi';

@Injectable()
export class ListenerService {
  private listeners;
  // public readonly binanceProvider = new JsonRpcProvider(
  //   process.env.BSC_TESTNET_PROVIDER,
  // );
  // public referralContract = new Contract(
  //   fit24ReferralContractAddress,
  //   referralAbi,
  //   this.binanceProvider,
  // );
  // public stakingContract = new Contract(
  //   fit24StakingContractAddress,
  //   stakingAbi,
  //   this.binanceProvider,
  // );

  // public async onModuleInit() {
  //   const binanceProvider = new JsonRpcProvider(
  //     process.env.BSC_TESTNET_PROVIDER,
  //   );
  //   await this.addListener();
  // }

  // public async addListener() {
  //   const binanceProvider = new JsonRpcProvider(
  //     process.env.BSC_TESTNET_PROVIDER,
  //   );
  //   console.log(process.env.BSC_TESTNET_PROVIDER);
  //   console.log(`Adding listener for ${fit24StakingContractAddress}`);
  //   const stakingContract = new Contract(
  //     fit24StakingContractAddress,
  //     stakingAbi,
  //     binanceProvider,
  //   );

  //   stakingContract.on('Staked', async (data) => {
  //     console.log('changes');
  //     console.log(data);
  //     // const activeStakes = await stakingContract.activeStakesForLevels(data);
  //     // console.log('activeStakes', activeStakes);
  //   });
  //   this.listeners = stakingContract;
  //   return { message: 'Pair Added Successfully' };
  // }
}
