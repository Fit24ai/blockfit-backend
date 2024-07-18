import {
  Body,
  Controller,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { PaymentReceivedDto } from './dto/paymentReceived.dto';
import { ChainEnum } from 'src/types/transaction';
import { ReferralReceivedDto } from './dto/referralReceived.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment-received')
  handleWebhook(
    @Body('data') data: PaymentReceivedDto[],
    @Query('chain') chain: ChainEnum,
  ) {
    console.log({paymentReceived: data});
    return this.webhookService.paymentReceived(data[0], chain);
  }

  @Post('referral-received')
  handleReferralWebhook(
    @Body('data') data: ReferralReceivedDto[],
    @Query('chain') chain: ChainEnum,
  ) {
    console.log({referralReceived: data});
    return this.webhookService.referralReceived(data[0],chain);
  }
}
