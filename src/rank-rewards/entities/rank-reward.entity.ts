import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { RewardClaimStatusEnum } from 'src/rewards/enum/rewardType.enum';

@Schema({ timestamps: true, collection: 'rank-rewards' })
export class RankRewards extends Document {
  @Prop({ required: true })
  rank: number;

  @Prop({ required: true })
  title: string;

  @Prop({ nullable: true })
  imageUrl: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Number, required: true, default: 10000 })
  qualifierAmount: number;

  @Prop({ type: Number, required: true, default: 10000 })
  rewardAmount: number;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
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

export const RankRewardsSchema = SchemaFactory.createForClass(RankRewards);
