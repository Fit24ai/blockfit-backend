import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { RewardClaimStatusEnum, RewardStatusEnum } from '../enum/rewardType.enum';

@Schema({ timestamps: true, collection: 'rewards' })
export class Rewards extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({
    required: true,
    enum: RewardStatusEnum,
    type: String,
    default: RewardStatusEnum.ACTIVE,
  })
  status: RewardStatusEnum;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Number, required: true, default: 10000 })
  qualifierAmount: number;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'user', required: true },
        claimStatus: {
          type: String,
          enum: RewardClaimStatusEnum,
          default: RewardClaimStatusEnum.PENDING,
        },
      },
    ],
    default: [],
  })
  userClaimedStatus: { userId: Types.ObjectId; claimStatus: string }[];
}

export const RewardsSchema = SchemaFactory.createForClass(Rewards);
