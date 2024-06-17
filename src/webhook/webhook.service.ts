import { Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from 'ethers';
import { Model } from 'mongoose';
import { TransactionStatusEnum } from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';
import { PaymenReceivedDto } from './dto/paymentReceived.dto';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly ethersService: EthersService,
  ) {}

  private formatAddress(address: string): string {
    console.log(address)
    return `0x${address.slice(2)}`;
  }

  async paymentReceived(paymentReceived:PaymenReceivedDto){
    try {
      const paymentReceivedFormatted:PaymenReceivedDto = {
        id: this.formatAddress(paymentReceived.id),
        amount: paymentReceived.amount,
        token: this.formatAddress(paymentReceived.token),
        user: paymentReceived.user,
        block_number: paymentReceived.block_number,
        block_timestamp: paymentReceived.block_timestamp,
        transaction_hash: this.formatAddress(paymentReceived.transaction_hash),
      }

      console.log(paymentReceivedFormatted);
      return {message:"Success"}
    } catch (error) {
      console.log(error)
    }
  }
}
