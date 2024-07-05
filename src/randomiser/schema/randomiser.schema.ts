import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type UserDocument = HydratedDocument<Randomiser>;
@Schema({ timestamps: true, collection: 'randomisers' })
export class Randomiser {
  @Prop({ type: [Number] })
  default: number[];

  @Prop({ type: [Number] })
  randomiser: number[];

  @Prop({type:Number, default:0})
  sum:number

  @Prop({type:Number,default: 0})
  count:number

  @Prop({type:Number})
  plan:number
}
export const RandomiserSchema = SchemaFactory.createForClass(Randomiser);
