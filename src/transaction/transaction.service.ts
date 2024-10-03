// import { paymentContractAddress } from 'src/staking/libs/contract'
import EthCrypto from 'eth-crypto';
import { User } from './../users/schema/user.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Transaction } from 'src/webhook/schema/transaction.schema';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import {
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, parseEther } from 'ethers';
import paymentAbi from 'src/ethers/libs/abi/paymentAbi';

@Injectable()
export class TransactionService {
  public readonly binanceProvider = new JsonRpcProvider(
    process.env.BINANCE_PRC_PROVIDER,
  );
  // public binancePaymentContract = new Contract(
  //   paymentContractAddress,
  //   paymentAbi,
  //   this.binanceProvider,
  // );
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly configService: ConfigService,
  ) {}

  async createTransaction(
    transaction: CreateTransactionDto,
    userId: ObjectId,
  ): Promise<Transaction> {
    return this.Transaction.create({ ...transaction, user: userId });
  }

  async getTransaction(transactionHash: string): Promise<Transaction> {
    return this.Transaction.findOne({
      transactionHash: { $regex: transactionHash, $options: 'i' },
    });
  }

  async getAllTransactions(userId: ObjectId): Promise<Transaction[]> {
    return this.Transaction.find({
      user: userId,
    }).sort({ createdAt: -1 });
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

  async signerSignature(messageHash: string) {
    const signature = EthCrypto.sign(
      this.configService.get('PRIVATE_KEY'),
      messageHash,
    );
    return signature;
  }

  // async getMessageHash(noonce: string, receiver: string, amount: number) {

  //   const amountInBigInt = parseEther(amount.toString());
  //   console.log(amount)
  //   console.log(amountInBigInt)
  //   const messageHash = this.binancePaymentContract.hashTransaction(
  //     noonce,
  //     receiver,
  //     amountInBigInt,
  //   );
  //   return messageHash;
  // }
}
