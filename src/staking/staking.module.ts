import { Module } from '@nestjs/common';
import { StakingController } from './staking.controller';
import { StakingService } from './staking.service';
import { EthersModule } from 'src/ethers/ethers.module';
import { EthersService } from 'src/ethers/ethers.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Staking, StakingSchema } from './schema/staking.schema';
import {
  StakeDuration,
  StakeDurationSchema,
} from './schema/stakeDuration.schema';
import {
  ClaimedRewardForStakeHistory,
  ClaimedRewardForStakeHistorySchema,
} from './schema/claimedRewardForStakeHistory.schema';
import {
  ClaimedHistory,
  ClaimedHistorySchema,
} from './schema/claimedHistory.schema';

@Module({
  imports: [
    EthersModule,
    MongooseModule.forFeature([
      { name: Staking.name, schema: StakingSchema },
      { name: StakeDuration.name, schema: StakeDurationSchema },
      {
        name: ClaimedRewardForStakeHistory.name,
        schema: ClaimedRewardForStakeHistorySchema,
      },
      {
        name: ClaimedHistory.name,
        schema: ClaimedHistorySchema,
      },
    ]),
  ],
  controllers: [StakingController],
  providers: [StakingService, EthersService],
  exports: [StakingService],
})
export class StakingModule {}
