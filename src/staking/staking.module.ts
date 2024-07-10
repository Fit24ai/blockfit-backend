import { Module } from '@nestjs/common';
import { StakingController } from './staking.controller';
import { StakingService } from './staking.service';
import { EthersModule } from 'src/ethers/ethers.module';
import { EthersService } from 'src/ethers/ethers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Staking, StakingSchema } from './schema/staking.schema';

@Module({
  imports: [
    EthersModule,
    MongooseModule.forFeature([{ name: Staking.name, schema: StakingSchema }]),
  ],
  controllers: [StakingController],
  providers: [StakingService, EthersService],
})
export class StakingModule {}
