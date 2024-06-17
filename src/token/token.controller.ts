import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { TokenService } from './token.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';

@ApiTags('token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('raised-amount')
  getRaisedAmount() {
    return this.tokenService.getRaisedAmount();
  }

  @Get('current-stage')
  getCurrentStage() {
    return this.tokenService.getCurrentStage();
  }

  @Get('user-tokens')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getUserTokens(@Request() req: UserRequest) {
    return this.tokenService.getUserTokens(req.user.walletAddress);
  }

  @Get('user-referral-income')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getUserReferralIncome(@Request() req: UserRequest) {
    return this.tokenService.getUserReferralIncome(req.user.walletAddress);
  }
}
