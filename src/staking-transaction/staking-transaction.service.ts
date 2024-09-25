import EthCrypto from 'eth-crypto';
import { v4 } from 'uuid'
import { ConfigService } from '@nestjs/config'
import { User } from './../users/schema/user.schema';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Transaction } from 'src/webhook/schema/transaction.schema';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import {
    ChainEnum,
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';
import { StakingTransaction } from './schema/stakingTransaction.schema';
import { EthersService } from 'src/ethers/ethers.service';
import { formatUnits, LogDescription, parseEther, solidityPackedKeccak256 } from 'ethers';
import { StakingTransferTokensDto, TransferTokensDto } from 'src/transfer/dto/transferTokens.dto';
import { PaymentReceivedDto } from 'src/webhook/dto/paymentReceived.dto';

@Injectable()
export class StakingTransactionService {
  constructor(
    @InjectModel(StakingTransaction.name) private Transaction: Model<StakingTransaction>,
    private readonly ethersService: EthersService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private User: Model<User>,
  ) { }

  async createTransaction(
    transaction: CreateTransactionDto,
    userId: ObjectId,
  ): Promise<Transaction> {
    return this.Transaction.create({ ...transaction, user: userId });
  }

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

    if (transaction.distributionStatus === DistributionStatusEnum.DISTRIBUTED ||  transaction.distributionStatus === DistributionStatusEnum.PROCESSING)
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
        distributionStatus: DistributionStatusEnum.PROCESSING,
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
    transaction.distributionStatus = DistributionStatusEnum.PROCESSING;
    transaction.amountBigNumber = String(paymentReceived.amount);
    transaction.tokenAddress = paymentReceivedFormatted.token;

    await transaction.save();
    const { txHash, amount } = await this.transferTokens({
      walletAddress: paymentReceivedFormatted.user,
      purchaseAmount:
        transaction.chain === ChainEnum.BINANCE
          ? BigInt(paymentReceivedFormatted.amount)
          : parseEther(formatUnits(paymentReceivedFormatted.amount, 6)),
      transactionHash: paymentReceivedFormatted.transaction_hash,
      poolType: transaction.poolType,
      apr: transaction.apr,
    });

    transaction.distributionHash = txHash;
    transaction.distributionStatus = DistributionStatusEnum.DISTRIBUTED;
    transaction.tokenAmount = amount;

    await transaction.save();
    return { message: 'Success' };
  }

  async getTransaction(transactionHash: string): Promise<Transaction> {
    return this.Transaction.findOne({
      transactionHash: { $regex: transactionHash, $options: 'i' },
    });
  }

  private async signerSignature(messageHash: string) {
    const signature = EthCrypto.sign(
      this.configService.get('PRIVATE_KEY'),
      messageHash,
    );
    return signature;
  }
  async transferTokens(transferBody: StakingTransferTokensDto) {
    const { walletAddress, purchaseAmount, transactionHash, poolType, apr } = transferBody;
    try {
      const noonce = v4();
      const messageHash = solidityPackedKeccak256(
        ['string', 'address', 'uint256'],
        [noonce, walletAddress, purchaseAmount],
      );

      const tx = await this.ethersService.signedIcoContract.buyToken(
        purchaseAmount,
        walletAddress,
        poolType,
        apr,
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

  async getAllTransactions(userId: ObjectId): Promise<Transaction[]> {
    return this.Transaction.find({
      user: userId,
    }).sort({"createdAt":-1});
  }

  async updateTransaction(
    transactionHash: string,
    transactionStatus: TransactionStatusEnum,
    distributionHash?: string,
    distributionStatus?: DistributionStatusEnum,
  ) {
    const updateBody: Partial<Transaction> = {
      transactionStatus,
    };
    if (distributionHash) {
      updateBody.distributionHash = distributionHash;
    }
    if (distributionStatus) {
      updateBody.distributionStatus = distributionStatus;
    }
    return await this.Transaction.findOneAndUpdate(
      { transactionHash },
      {
        updateBody,
      },
    );
  }
}
