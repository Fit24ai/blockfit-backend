import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from 'src/webhook/schema/transaction.schema';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import {
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
  ) {}

  async createTransaction(
    transaction: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.Transaction.create(transaction);
  }

  async getTransaction(transactionHash: string): Promise<Transaction> {
    return this.Transaction.findOne({ transactionHash });
  }

  async getAllTransactions(walletAddress: string): Promise<Transaction[]> {
    return this.Transaction.find({ user: { walletAddress } });
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
