import { Module } from '@nestjs/common';
import { StakingTransactionService } from './staking-transaction.service';
import { StakingTransactionController } from './staking-transaction.controller';
import { EthersService } from 'src/ethers/ethers.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from 'src/users/schema/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StakingTransaction,
  StakingTransactionSchema,
} from './schema/stakingTransaction.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: StakingTransaction.name, schema: StakingTransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StakingTransactionController],
  providers: [StakingTransactionService, EthersService, ConfigService],
})
export class StakingTransactionModule {}
