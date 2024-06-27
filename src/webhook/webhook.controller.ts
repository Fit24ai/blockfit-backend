import { Body, Controller, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { PaymentReceivedDto } from './dto/paymentReceived.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment-received')
  handleWebhook(@Body('data') data: PaymentReceivedDto[]) {
    console.log(data)
    return this.webhookService.paymentReceived(data[0]);
  }
}
