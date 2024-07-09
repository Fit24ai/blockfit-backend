import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Contract,
  Transaction,
  formatUnits,
  solidityPackedKeccak256,
} from 'ethers';
import { Model } from 'mongoose';
import { TransactionStatusEnum } from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';
import { TransferTokensDto } from 'src/transfer/dto/transferTokens.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { v4 } from 'uuid';
import EthCrypto from 'eth-crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransferService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly ethersService: EthersService,
    private readonly configService: ConfigService,
  ) {}

  private async signerSignature(messageHash: string) {
    const signature = EthCrypto.sign(
      this.configService.get('PRIVATE_KEY'),
      messageHash,
    );
    return signature;
  }
  async transferTokens(transferBody: TransferTokensDto) {
    const { walletAddress, purchaseAmount, transactionHash } = transferBody;
    try {
      const noonce = v4();
      const messageHash = solidityPackedKeccak256(
        ['string', 'address', 'uint256'],
        [noonce, walletAddress, purchaseAmount],
      );

      const tx = await this.ethersService.signedIcoContract.buyToken(
        purchaseAmount,
        walletAddress,
        noonce,
        await this.signerSignature(messageHash),
      );

      await tx.wait();

      const receipt =
        await this.ethersService.icoProvider.getTransactionReceipt(tx.hash);
      const parsedLog = this.ethersService.icoInterface.parseLog(
        receipt?.logs[2]!,
      );
      return { txHash: tx.hash, amount: parsedLog.args[2] };
    } catch (error) {
      console.log({error});
      throw error;
    }
  }
}
