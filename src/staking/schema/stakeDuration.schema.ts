import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<StakeDuration>;

@Schema({ timestamps: true, collection: 'stakeDuration' })
export class StakeDuration {
   
  @Prop({ type: Number, required: true })
  poolType: number;

  @Prop({ type: Number, required: true })
  duration: number;
}

export const StakeDurationSchema = SchemaFactory.createForClass(StakeDuration);
