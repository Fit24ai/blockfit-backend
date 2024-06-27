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
    return {
      stage: Number(stage),
      stagePrice: Number(formatUnits(stagePrice, 18)),
    };
  }

  async getAllStageInfo() {
    const contractCalls = [
      this.ethersService.icoContract.phase1Price(),
      this.ethersService.icoContract.phase1Supply(),
      this.ethersService.icoContract.phase2Price(),
      this.ethersService.icoContract.phase2Supply(),
      this.ethersService.icoContract.phase3Price(),
      this.ethersService.icoContract.phase3Supply(),
    ];

    const [
      phase1Price,
      phase1Supply,
      phase2Price,
      phase2Supply,
      phase3Price,
      phase3Supply,
    ] = await Promise.all(contractCalls);

    return {
      phase1Price: Number(formatUnits(phase1Price, 18)),
      phase1Supply: Number(formatUnits(phase1Supply, 18)),
      phase2Price: Number(formatUnits(phase2Price, 18)),
      phase2Supply: Number(formatUnits(phase2Supply, 18)),
      phase3Price: Number(formatUnits(phase3Price, 18)),
      phase3Supply: Number(formatUnits(phase3Supply, 18)),
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
