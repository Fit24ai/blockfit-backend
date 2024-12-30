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
import {
  StakingTransaction,
  StakingTransactionSchema,
} from 'src/staking-transaction/schema/stakingTransaction.schema';
import { User, UserSchema } from 'src/users/schema/user.schema';
import {
  ReferralTransaction,
  ReferralTransactionSchema,
} from 'src/webhook/schema/referralTransaction.schema';
import {
  ReferralTrail,
  ReferralTrailSchema,
} from './schema/referralTrail.schema';

@Module({
  imports: [
    EthersModule,
    MongooseModule.forFeature([
      { name: Staking.name, schema: StakingSchema },
      { name: StakeDuration.name, schema: StakeDurationSchema },
      { name: StakingTransaction.name, schema: StakingTransactionSchema },
      { name: ReferralTransaction.name, schema: ReferralTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: ReferralTrail.name, schema: ReferralTrailSchema },
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
