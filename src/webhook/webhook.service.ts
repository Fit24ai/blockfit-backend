import { Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Contract } from 'ethers';
import { Model } from 'mongoose';
import {
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';
import { PaymentReceivedDto } from './dto/paymentReceived.dto';
import tokenAbi from 'src/ethers/libs/abi/tokenAbi';
import { Transaction } from './schema/transaction.schema';
import { TransferService } from 'src/transfer/transfer.service';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly ethersService: EthersService,
    private readonly transferService: TransferService,
  ) {}

  private formatAddress(address: string): string {
    console.log(address);
    return `0x${address.slice(2)}`;
  }

  async paymentReceived(paymentReceived: PaymentReceivedDto) {
    try {
      const paymentReceivedFormatted: PaymentReceivedDto = {
        id: this.formatAddress(paymentReceived.id),
        amount: paymentReceived.amount,
        token: this.formatAddress(paymentReceived.token),
        user: paymentReceived.user,
        block_number: paymentReceived.block_number,
        block_timestamp: paymentReceived.block_timestamp,
        transaction_hash: this.formatAddress(paymentReceived.transaction_hash),
      };

      const transaction = await this.Transaction.findOne({
        transactionHash: {
          $regex: paymentReceivedFormatted.transaction_hash,
          $options: 'i',
        },
      });

      transaction.transactionStatus = TransactionStatusEnum.CONFIRMED;
      transaction.amountBigNumber = String(paymentReceived.amount);

      await transaction.save();
      const { txHash, amount } = await this.transferService.transferTokens({
        walletAddress: paymentReceivedFormatted.user,
        purchaseAmount: BigInt(paymentReceivedFormatted.amount),
        transactionHash: paymentReceivedFormatted.transaction_hash,
      });

      transaction.distributionHash = txHash;
      transaction.distributionStatus = DistributionStatusEnum.DISTRIBUTED;
      transaction.tokenAmount = amount;
      
      await transaction.save();
      return { message: 'Success' };
    } catch (error) {
      console.log(error);
    }
  }
}
