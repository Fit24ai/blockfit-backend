import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Contract,
  formatUnits,
  LogDescription,
  parseEther,
  parseUnits,
} from 'ethers';
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
import { User } from 'src/users/schema/user.schema';
import { ReferralTransaction } from './schema/referralTransaction.schema';
import { ReferralReceivedDto } from './dto/referralReceived.dto';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    @InjectModel(ReferralTransaction.name)
    private ReferralTransaction: Model<ReferralTransaction>,

    @InjectModel(User.name) private User: Model<User>,
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
    if (
      BigInt(logs.args[0]) === BigInt(amount) &&
      logs.args[2].toLowerCase() === user.toLowerCase()
    ) {
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

  async paymentReceived(paymentReceived: PaymentReceivedDto, chain: ChainEnum) {
    const paymentReceivedFormatted: PaymentReceivedDto = {
      id: this.formatAddress(paymentReceived.id),
      amount: paymentReceived.amount,
      token: this.formatAddress(paymentReceived.token),
      user: this.formatAddress(paymentReceived.user),
      block_number: paymentReceived.block_number,
      block_timestamp: paymentReceived.block_timestamp,
      transaction_hash: this.formatAddress(paymentReceived.transaction_hash),
    };

    let transaction = await this.Transaction.findOne({
      transactionHash: {
        $regex: paymentReceivedFormatted.transaction_hash,
        $options: 'i',
      },
    });

    if (transaction.distributionStatus === DistributionStatusEnum.DISTRIBUTED)
      throw new BadRequestException('Already received transaction');

    if (!transaction) {
      // throw new BadRequestException({
      //   success: false,
      //   message: 'Transaction not found',
      // });
      let user = await this.User.findOne({
        walletAddress: paymentReceived.user,
      });
      if (!user) {
        user = await this.User.create({
          walletAddress: paymentReceived.user,
        });
      }
      transaction = await this.Transaction.create({
        transactionHash: paymentReceivedFormatted.transaction_hash,
        amountBigNumber: paymentReceivedFormatted.amount,
        tokenAddress: paymentReceivedFormatted.token,
        chain: chain,
        user: user._id,
        transactionStatus: TransactionStatusEnum.CONFIRMED,
        distributionStatus: DistributionStatusEnum.PENDING,
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
      purchaseAmount:
        transaction.chain === ChainEnum.BINANCE
          ? BigInt(paymentReceivedFormatted.amount)
          : parseEther(formatUnits(paymentReceivedFormatted.amount, 6)),
      transactionHash: paymentReceivedFormatted.transaction_hash,
    });

    transaction.distributionHash = txHash;
    transaction.distributionStatus = DistributionStatusEnum.DISTRIBUTED;
    transaction.tokenAmount = amount;

    await transaction.save();
    return { message: 'Success' };
  }

  async referralReceived(
    referralReceived: ReferralReceivedDto,
    chain: ChainEnum,
  ) {
    const referralReceivedFormatted: ReferralReceivedDto = {
      referrer: this.formatAddress(referralReceived.referrer),
      buyer: this.formatAddress(referralReceived.buyer),
      buy_amount: referralReceived.buy_amount,
      referral_income: referralReceived.referral_income,
      token: this.formatAddress(referralReceived.token),
      transaction_hash: this.formatAddress(referralReceived.transaction_hash),
      block_number: referralReceived.block_number,
      block_timestamp: referralReceived.block_timestamp,
    };

    const referralTx = await this.ReferralTransaction.findOne({
      where: {
        transactionHash: referralReceivedFormatted.transaction_hash,
      },
    });

    if (referralTx) throw new BadRequestException('Referral Tx Already Exists');

    const referralTransaction = await this.ReferralTransaction.create({
      ...referralReceivedFormatted,
      buyAmount: referralReceivedFormatted.buy_amount,
      referralIncome: referralReceivedFormatted.referral_income,
      transactionHash: referralReceivedFormatted.transaction_hash,
      blockNumber: referralReceivedFormatted.block_number,
      chain: chain,
    });

    return { message: 'Success' };
  }
}
