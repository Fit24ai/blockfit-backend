import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './schema/admin.schema';
import { JwtService } from '@nestjs/jwt';
import { Staking, StakingSchema } from 'src/staking/schema/staking.schema';
import { EthersService } from 'src/ethers/ethers.service';
import {
  ClaimedHistory,
  ClaimedHistorySchema,
} from 'src/staking/schema/claimedHistory.schema';
import { User, UserSchema } from 'src/users/schema/user.schema';
import {
  StakingTransaction,
  StakingTransactionSchema,
} from 'src/staking-transaction/schema/stakingTransaction.schema';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: StakingTransaction.name, schema: StakingTransactionSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    MongooseModule.forFeature([{ name: Staking.name, schema: StakingSchema }]),
    MongooseModule.forFeature([
      { name: ClaimedHistory.name, schema: ClaimedHistorySchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt-admin' }),
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtService, EthersService],
})
export class AdminModule {}
