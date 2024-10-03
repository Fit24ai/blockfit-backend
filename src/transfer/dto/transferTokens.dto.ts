export class TransferTokensDto {
  walletAddress: string;
  purchaseAmount: bigint;
  transactionHash: string;
  poolType: number;
  apr: number;
}
export class StakingTransferTokensDto {
  walletAddress: string;
  purchaseAmount: bigint;
  transactionHash: string;
  poolType: string;
  apr: string;
}
