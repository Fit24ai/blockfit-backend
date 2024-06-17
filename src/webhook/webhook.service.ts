import { Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from 'ethers';
import { Model } from 'mongoose';
import { TransactionStatusEnum } from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(Transaction.name) private Transaction: Model<Transaction>,
    private readonly ethersService: EthersService,
  ) {}
}
