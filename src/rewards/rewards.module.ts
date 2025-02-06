import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import {
  StakingTransaction,
  StakingTransactionSchema,
} from 'src/staking-transaction/schema/stakingTransaction.schema';
import { User, UserSchema } from 'src/users/schema/user.schema';
import { Staking, StakingSchema } from 'src/staking/schema/staking.schema';
import {
  ClaimedHistory,
  ClaimedHistorySchema,
} from 'src/staking/schema/claimedHistory.schema';
import { EthersService } from 'src/ethers/ethers.service';
import { Rewards, RewardsSchema } from './entities/reward.entity';
import { JwtService } from '@nestjs/jwt';
import { AdminJwtStrategy } from 'src/passport/admin-passport.strategy';
import { S3Service } from 'src/utils/s3Sevice';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: StakingTransaction.name, schema: StakingTransactionSchema },
      { name: Rewards.name, schema: RewardsSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    MongooseModule.forFeature([{ name: Staking.name, schema: StakingSchema }]),
    MongooseModule.forFeature([
      { name: ClaimedHistory.name, schema: ClaimedHistorySchema },
    ]),
  ],
  controllers: [RewardsController],
  providers: [
    RewardsService,
    EthersService,
    JwtService,
    AdminJwtStrategy,
    S3Service,
  ],
  exports: [RewardsService],
})
export class RewardsModule {}
