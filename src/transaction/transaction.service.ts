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

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
  ) { }

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
    });
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
