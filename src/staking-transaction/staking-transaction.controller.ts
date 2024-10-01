import { Body, Controller, Get, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { StakingTransactionService } from './staking-transaction.service';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import { UserRequest } from 'src/types/user';

@Controller('staking-transaction')
export class StakingTransactionController {
  constructor(private readonly stakingTransactionService: StakingTransactionService) {
    
  }
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  createTransaction(
    @Body() transaction: CreateTransactionDto,
    @Request() req: UserRequest,
  ) {
    return this.stakingTransactionService.createTransaction(transaction, req.user._id);
  }

  @Get()
  getTransaction(@Query('tx') transactionHash: string) {
    return this.stakingTransactionService.getTransaction(transactionHash);
  }

}

