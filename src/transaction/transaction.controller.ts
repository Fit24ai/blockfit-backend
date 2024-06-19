import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/passport/passport.guard';
import { UserRequest } from 'src/types/user';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  createTransaction(
    @Body() transaction: CreateTransactionDto,
    @Request() req: UserRequest,
  ) {
    return this.transactionService.createTransaction(transaction, req.user._id);
  }

  @Get()
  getTransaction(@Query('tx') transactionHash: string) {
    return this.transactionService.getTransaction(transactionHash);
  }

  @Get('get-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getAllTransactions(@Request() request: UserRequest) {
    return this.transactionService.getAllTransactions(
      request.user.walletAddress,
    );
  }
}
