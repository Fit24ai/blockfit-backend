import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsletterDocument = HydratedDocument<Newsletter>;

@Schema({ timestamps: true, collection: 'newsletter' })
export class Newsletter {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
