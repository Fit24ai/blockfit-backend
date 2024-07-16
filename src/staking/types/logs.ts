export interface IRefStakeLogs{
    stakeId: number;
    walletAddress: string;
    amount: number;
    apr: number;
    poolType: number;
    startTime: number;
    stakeDuration: number;
    txHash: string;
    isReferred: boolean;
    level: number;
    refId: number;
}

export interface IClaimedRewardForStake{
  stakeId: number;
  walletAddress: string;
  amount: number;
  timestamp: number;
  txHash: string;
  poolType?: number;
  isReferred?: boolean;
}
