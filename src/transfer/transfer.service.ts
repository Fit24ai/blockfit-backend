import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction, formatUnits } from 'ethers';
import { Model } from 'mongoose';
import { TransactionStatusEnum } from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';
import { TransferTokensDto } from 'src/transfer/dto/transferTokens.dto';
import { TransactionService } from 'src/transaction/transaction.service';

@Injectable()
export class TransferService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly ethersService: EthersService,
  ) { }

  async transferTokens(transferBody: TransferTokensDto) {
    const { walletAddress, purchaseAmount, transactionHash } = transferBody;

    const tx = await this.ethersService.signedIcoContract.buyToken(
      purchaseAmount,
      // walletAddress,
    );

    await tx.wait();

    const receipt = await this.ethersService.icoProvider.getTransactionReceipt(
      tx.hash,
    );
    const parsedLog = this.ethersService.icoInterface.parseLog(
      receipt?.logs[2]!,
    );
    console.log({ receipt, parsedLog });
    return { txHash: tx.hash, amount: parsedLog.args[2] };
  }
}
