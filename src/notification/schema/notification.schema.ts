import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import NotificationEnum from '../enum/notification.enum';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notification' })
export class Notification {
  @Prop({ type: String, required: true, unique: true })
  message: string;

  @Prop({ type: String, required: true, enum: NotificationEnum })
  type: NotificationEnum;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
