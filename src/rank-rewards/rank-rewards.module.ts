import { Module } from '@nestjs/common';
import { RankRewardsService } from './rank-rewards.service';
import { RankRewardsController } from './rank-rewards.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import {
  StakingTransaction,
  StakingTransactionSchema,
} from 'src/staking-transaction/schema/stakingTransaction.schema';
import { RankRewards, RankRewardsSchema } from './entities/rank-reward.entity';
import { User, UserSchema } from 'src/users/schema/user.schema';
import { Staking, StakingSchema } from 'src/staking/schema/staking.schema';
import { S3Service } from 'src/utils/s3Sevice';
import { EthersService } from 'src/ethers/ethers.service';
import { RewardsModule } from 'src/rewards/rewards.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: StakingTransaction.name, schema: StakingTransactionSchema },
      { name: RankRewards.name, schema: RankRewardsSchema },
      { name: User.name, schema: UserSchema },
      { name: Staking.name, schema: StakingSchema },
    ]),
    RewardsModule,
  ],
  controllers: [RankRewardsController],
  providers: [RankRewardsService, S3Service, EthersService],
})
export class RankRewardsModule {}
