import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schema/transaction.schema';
import { EthersModule } from 'src/ethers/ethers.module';
import { EthersService } from 'src/ethers/ethers.service';
import { TransferService } from 'src/transfer/transfer.service';
import { TransferModule } from 'src/transfer/transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    EthersModule,
    TransferModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, EthersService, TransferService],
})
export class WebhookModule {}
