import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction } from 'ethers';
import { TransactionSchema } from 'src/webhook/schema/transaction.schema';
import { EthersModule } from 'src/ethers/ethers.module';
import { EthersService } from 'src/ethers/ethers.service';
import { TransactionService } from 'src/transaction/transaction.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    EthersModule,
    TransferModule,
  ],
  providers: [TransferService, EthersService, TransactionService],
})
export class TransferModule {}
