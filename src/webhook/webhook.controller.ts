import { Body, Controller, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { PaymenReceivedDto } from './dto/paymentReceived.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('payment-received')
  handleWebhook(@Body() body: any) {
    console.log(body);
    return this.webhookService.paymentReceived();
  }
}
