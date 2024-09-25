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
export class ListenerService implements OnModuleInit {
  private listeners = new Map<string, Contract>();
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


  public async onModuleInit() {
    await this.addListener();
  }

  public async addListener() {
    if (!this.listeners.has(fit24StakingContractAddress)) {
      console.log(`Adding listener for ${fit24StakingContractAddress}`);
      const pairContract = new Contract(
        fit24StakingContractAddress,
        stakingAbi,

        this.binanceProvider,
      );

      pairContract.on('Stake', async ({ data }) => {
        console.log('changes');
        console.log(data);
      });
      this.listeners.set(fit24StakingContractAddress, pairContract);
      return { message: 'Pair Added Successfully' };
    }
    throw new BadRequestException({ message: 'Pair Already Listening' });
  }
}
