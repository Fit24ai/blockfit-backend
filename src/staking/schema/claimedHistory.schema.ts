import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ClaimedRewardHistory = HydratedDocument<ClaimedHistory>;

@Schema({ timestamps: true, collection: 'claimedHistory' })
export class ClaimedHistory {
  @Prop({ type: Number, required: true })
  stakeId: number;

  @Prop({ type: String, required: true })
  walletAddress: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  timestamp: number;

  @Prop({ type: String, required: true })
  txHash: string;

  @Prop({ type: Number, required: false })
  poolType: number;

  @Prop({ type: Boolean, required: false })
  isReferred: boolean;
}

export const ClaimedHistorySchema =
  SchemaFactory.createForClass(ClaimedHistory);
