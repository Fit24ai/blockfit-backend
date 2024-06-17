import { Injectable } from '@nestjs/common';
import { Contract, Interface, JsonRpcProvider, Wallet } from 'ethers';
import {
  BinancePaymentContract,
  EthereumPaymentContract,
  IcoContract,
} from './libs/contracts';
import icoAbi from './libs/abi/icoAbi';
import paymentAbi from './libs/abi/paymentAbi';

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
}
