import {
  Body,
  Controller,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @UseGuards(JwtAuthGuard)
  @Post('pay-with-referral')
  payWithReferral(@Body('amount') amount: bigint, @Request() req: UserRequest) {
    return this.referralService.payWithReferral(amount, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('register-refferer')
  async registerRefferer(
    @Query('refId') refId: string,
    @Request() req: UserRequest,
  ) {
    return this.referralService.registerReferrer(req.user, refId);
  }
}
