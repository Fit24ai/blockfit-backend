import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WaitlistDocument = HydratedDocument<Waitlist>;

@Schema({ timestamps: true, collection: 'waitlist' })
export class Waitlist {
  @Prop({ type: String, required: true, unique: true })
  walletAddress: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  phoneNumber: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
