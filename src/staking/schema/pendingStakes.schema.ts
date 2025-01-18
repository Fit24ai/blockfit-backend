import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TransactionStatusEnum } from 'src/types/transaction';

export type PendingStakesDocument = HydratedDocument<PendingStakes>;

@Schema({ timestamps: true, collection: 'pending-stakes' })
export class PendingStakes {
  @Prop({ type: Number, required: true, default: 0 })
  stakeId: number;
  @Prop({ type: String, required: true })
  walletAddress: string;

  @Prop({ type: String, required: true })
  txHash: string;

}

export const PendingStakesSchema = SchemaFactory.createForClass(PendingStakes);
