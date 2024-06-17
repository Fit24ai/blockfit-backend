import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'user' })
export class User {
  @Prop({ type: String, required: true })
  walletAddress: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
