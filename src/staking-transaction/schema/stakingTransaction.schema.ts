import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ChainEnum,
  DistributionStatusEnum,
  TransactionStatusEnum,
} from 'src/types/transaction';

export type StakingTransactionDocument = HydratedDocument<StakingTransaction>;

@Schema({ timestamps: true, collection: 'transaction' })
export class StakingTransaction {
  @Prop({ type: String, required: true })
  transactionHash: string;

  @Prop({ type: String })
  distributionHash: string;

  @Prop({ type: String, required: true, default: '0' })
  amountBigNumber: string;

  @Prop({ type: String })
  tokenAddress: string;

  @Prop({ type: String, enum: ChainEnum, required: true })
  chain: ChainEnum;

  @Prop({
    type: String,
    enum: TransactionStatusEnum,
    required: true,
    default: TransactionStatusEnum.PENDING,
  })
  transactionStatus: TransactionStatusEnum;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, default: '0' })
  tokenAmount: string;
  @Prop({ type: String, required: true, default: '0' })
  apr: string;
  @Prop({ type: String, required: true, default: '0' })
  poolType: string;

  @Prop({
    type: String,
    enum: DistributionStatusEnum,
    required: true,
    default: DistributionStatusEnum.PENDING,
  })
  distributionStatus: DistributionStatusEnum;
}

export const StakingTransactionSchema =
  SchemaFactory.createForClass(StakingTransaction);
