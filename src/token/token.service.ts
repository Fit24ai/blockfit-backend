import { Injectable } from '@nestjs/common';
import { formatUnits, getAddress } from 'ethers';
import { EthersService } from 'src/ethers/ethers.service';

@Injectable()
export class TokenService {
  constructor(private readonly ethersService: EthersService) {}

  async getRaisedAmount() {
    const raised = await this.ethersService.icoContract.amountRaised();
    return { raisedAmount: formatUnits(raised, 18) };
  }

  async getCurrentStage() {
    const stage = await this.ethersService.icoContract.getStage();
    const stagePrice =
      await this.ethersService.icoContract.getStagePrice(stage);
    console.log(stagePrice);
    return {
      stage: Number(stage),
      stagePrice: Number(formatUnits(stagePrice, 18)),
    };
  }

  async getUserTokens(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const tokens =
      await this.ethersService.icoContract.totalTokenBoughtUser(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
  }

  async getUserReferralIncome(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const referralIncome =
      await this.ethersService.icoContract.referalIncome(fixedAddress);
    return { referralIncome: Number(formatUnits(referralIncome, 18)) };
  }

  
}
