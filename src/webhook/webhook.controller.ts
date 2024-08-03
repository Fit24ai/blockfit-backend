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

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment-received')
  handleWebhook(
    @Body('data') data: PaymentReceivedDto[],
    @Query('chain') chain: ChainEnum,
  ) {
    console.log(data);
    return this.webhookService.paymentReceived(data[0], chain);
  }
}
