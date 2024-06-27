import { Module } from '@nestjs/common';
import { RandomiserService } from './randomiser.service';
import { RandomiserController } from './randomiser.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Randomiser, RandomiserSchema } from './schema/randomiser.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([{ name: Randomiser.name, schema: RandomiserSchema }]),
  ],
  providers: [RandomiserService],
  controllers: [RandomiserController]
})
export class RandomiserModule {}
