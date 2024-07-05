import { Module } from '@nestjs/common';
import { RandomiserService } from './randomiser.service';
import { RandomiserController } from './randomiser.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Randomiser, RandomiserSchema } from './schema/randomiser.schema';
import { APRList } from './utils/APRList';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([{ name: Randomiser.name, schema: RandomiserSchema }]),
  ],
  providers: [RandomiserService,APRList],
  controllers: [RandomiserController]
})
export class RandomiserModule {}
