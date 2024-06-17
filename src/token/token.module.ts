import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { EthersModule } from 'src/ethers/ethers.module';
import { EthersService } from 'src/ethers/ethers.service';

@Module({
  imports: [EthersModule],
  controllers: [TokenController],
  providers: [TokenService, EthersService],
})
export class TokenModule {}
