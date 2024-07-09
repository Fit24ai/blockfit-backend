import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Contract, LogDescription } from 'ethers';
import { Model } from 'mongoose';
import {
  ChainEnum,
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
    return `0x${address.slice(2)}`;
    // return address;
  }

  async verifyTransactionConditions(
    logs: LogDescription,
    amount: string,
    user: string,
  ) {
    if (BigInt(logs.args[0]) === BigInt(amount) && logs.args[2].toLowerCase() === user.toLowerCase()) {
      return true;
    } else {
      return false;
    }
  }

  private async verifyTransaction(
    chain: ChainEnum,
    transactionHash: string,
    amount: string,
    user: string,
  ) {
    switch (chain) {
      case ChainEnum.ETHEREUM:
        const providerReceiptEth =
          await this.ethersService.ethereumProvider.getTransactionReceipt(
            transactionHash,
          );
        const EthLogs = this.ethersService.paymentInterface.parseLog(
          providerReceiptEth?.logs[providerReceiptEth.logs.length - 1]!,
        );
        return this.verifyTransactionConditions(EthLogs, amount, user);

      case ChainEnum.BINANCE:
        const providerReceiptBinance =
          await this.ethersService.binanceProvider.getTransactionReceipt(
            transactionHash,
          );
        const BinanceLogs = this.ethersService.paymentInterface.parseLog(
          providerReceiptBinance?.logs[providerReceiptBinance.logs.length - 1]!,
        );
        return this.verifyTransactionConditions(BinanceLogs, amount, user);
      default:
        throw new Error('Unsupported chain');
    }
  }

  async paymentReceived(paymentReceived: PaymentReceivedDto) {
      const paymentReceivedFormatted: PaymentReceivedDto = {
        id: this.formatAddress(paymentReceived.id),
        amount: paymentReceived.amount,
        token: this.formatAddress(paymentReceived.token),
        user: this.formatAddress(paymentReceived.user),
        block_number: paymentReceived.block_number,
        block_timestamp: paymentReceived.block_timestamp,
        transaction_hash: this.formatAddress(paymentReceived.transaction_hash),
      };

      const transaction = await this.Transaction.findOne({
        transactionHash: {
          $regex: paymentReceivedFormatted.transaction_hash,
          $options: 'i',
        },
        distributionStatus: DistributionStatusEnum.PENDING,
      });

      if (!transaction) {
        throw new BadRequestException({
          success: false,
          message: 'Transaction not found',
        });
      }


      const isValid = await this.verifyTransaction(
        transaction.chain,
        transaction.transactionHash,
        paymentReceivedFormatted.amount,
        paymentReceivedFormatted.user,
      );

      if (!isValid) {
        throw new BadRequestException({
          success: false,
          message: 'Invalid transaction',
        });
      }

      transaction.transactionStatus = TransactionStatusEnum.CONFIRMED;
      transaction.amountBigNumber = String(paymentReceived.amount);
      transaction.tokenAddress = paymentReceivedFormatted.token;

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
  }
}
