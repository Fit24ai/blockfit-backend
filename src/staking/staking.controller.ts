import { Controller, Get, Param, Post } from '@nestjs/common';
import { StakingService } from './staking.service';

@Controller('staking')
export class StakingController {
    constructor(private readonly stakingService: StakingService){}

    @Post('create/:txHash')
    async createStakingRecord(
        @Param('txHash') txHash:string
    ){
        return this.stakingService.createStakingRecord(txHash)
    }

    @Get('get-all-Stakes-by-user/:walletAddress')
    async getAllStakesByUser(
        @Param('walletAddress') walletAddress: string
    ){
        return this.stakingService.getAllStakesByUser(walletAddress)
    }
}
