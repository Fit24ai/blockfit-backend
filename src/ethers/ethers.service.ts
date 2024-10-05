import { Injectable } from '@nestjs/common';
import { Contract, Interface, JsonRpcProvider, Wallet } from 'ethers';
import {
  BinancePaymentContract,
  buyContract,
  EthereumPaymentContract,
  fit24ReferralContractAddress,
  IcoContract,
} from './libs/contracts';
import icoAbi from './libs/abi/icoAbi';
import paymentAbi from './libs/abi/paymentAbi';
import { ChainEnum } from 'src/types/transaction';
import stakingAbi from './libs/abi/stakingAbi';
import { referralAbi } from './libs/abi/referralAbi';
import { buyAbi } from './libs/abi/buyAbi';

@Injectable()
export class EthersService {
  public readonly icoProvider = new JsonRpcProvider(
    process.env.ICO_PRC_PROVIDER,
  );
  public readonly ethereumProvider = new JsonRpcProvider(
    process.env.ETHEREUM_PRC_PROVIDER,
  );
  public readonly binanceProvider = new JsonRpcProvider(
    process.env.BINANCE_PRC_PROVIDER,
  );

  private readonly signer = new Wallet(
    process.env.PRIVATE_KEY,
    this.icoProvider,
  );

  public icoContract = new Contract(IcoContract, icoAbi, this.icoProvider);
  public signedIcoContract = new Contract(IcoContract, icoAbi, this.signer);
  public signedReferralContract = new Contract(
    fit24ReferralContractAddress,
    referralAbi,
    this.signer,
  )

  public signedBuyContract = new Contract(
    buyContract, buyAbi, this.signer
  )
  public referralContract = new Contract(
    fit24ReferralContractAddress,
    referralAbi,
    this.icoProvider,
  );

  public ethereumPaymentContract = new Contract(
    EthereumPaymentContract,
    paymentAbi,
    this.ethereumProvider,
  );
  public binancePaymentContract = new Contract(
    BinancePaymentContract,
    paymentAbi,
    this.binanceProvider,
  );

  public paymentInterface = new Interface(paymentAbi);
  public icoInterface = new Interface(icoAbi);
  public stakingInterface = new Interface(stakingAbi);
  public getProvider(chain: ChainEnum) {
    switch (chain) {
      case ChainEnum.ETHEREUM:
        return this.ethereumProvider;
      case ChainEnum.BINANCE:
        return this.binanceProvider;
      default:
        return this.ethereumProvider;
    }
  }
}
