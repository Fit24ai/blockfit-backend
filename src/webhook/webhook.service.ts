import { Staking } from './../staking/schema/staking.schema';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TransferTokensDto } from '../transfer/dto/transferTokens.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Contract,
  formatUnits,
  LogDescription,
  parseEther,
  parseUnits,
} from 'ethers';
import { Model } from 'mongoose';
import {
  ChainEnum,
  DistributionStatusEnum,
  StakingStatus,
  TransactionStatusEnum,
} from 'src/types/transaction';
import { EthersService } from 'src/ethers/ethers.service';
import { PaymentReceivedDto } from './dto/paymentReceived.dto';
import tokenAbi from 'src/ethers/libs/abi/tokenAbi';
import { Transaction } from './schema/transaction.schema';
import { TransferService } from 'src/transfer/transfer.service';
import { User } from 'src/users/schema/user.schema';
import { ReferralTransaction } from './schema/referralTransaction.schema';
import { ReferralReceivedDto } from './dto/referralReceived.dto';
import { StakingTransaction } from 'src/staking-transaction/schema/stakingTransaction.schema';
import { StakingService } from 'src/staking/staking.service';
import { RedisClientType } from 'redis';
import BigNumber from 'bignumber.js';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(StakingTransaction.name)
    private Transaction: Model<StakingTransaction>,
    @InjectModel(ReferralTransaction.name)
    private referrlaTransaction: Model<ReferralTransaction>,
    @InjectModel(User.name) private User: Model<User>,
    private readonly ethersService: EthersService,
    private readonly transferService: TransferService,
    private readonly stakingService: StakingService,
    @Inject('REDIS_SERVICE')
    private readonly redisService: RedisClientType,
  ) {}

  // private formatAddress(address: string): string {
  //   return `0x${address.slice(2)}`;
  //   // return address;
  // }

  async verifyTransactionConditions(
    logs: LogDescription,
    amount: string,
    user: string,
  ) {
    if (
      BigInt(logs.args[0]) === BigInt(amount) &&
      logs.args[2].toLowerCase() === user.toLowerCase()
    ) {
      return true;
    } else {
      return false;
    }
  }

  private async verifyTransaction(
    chain: ChainEnum,
    transactionHash: string,
    amount: string,
    user: string,
  ) {
    console.log(chain);
    switch (chain) {
      case ChainEnum.ETHEREUM:
        const providerReceiptEth =
          await this.ethersService.ethereumProvider.getTransactionReceipt(
            transactionHash,
          );
        const EthLogs = this.ethersService.paymentInterface.parseLog(
          providerReceiptEth?.logs[providerReceiptEth.logs.length - 1]!,
        );

        const poolTypeEth = Number(EthLogs.args[3]);
        const aprEth = Number(EthLogs.args[4]);

        const verifyEth = this.verifyTransactionConditions(
          EthLogs,
          amount,
          user,
        );

        return { isValid: verifyEth, poolType: poolTypeEth, apr: aprEth };

      case ChainEnum.BINANCE:
        const providerReceiptBinance =
          await this.ethersService.binanceProvider.getTransactionReceipt(
            transactionHash,
          );
        console.log('providerReceiptBinance', providerReceiptBinance);
        const BinanceLogs = this.ethersService.paymentInterface.parseLog(
          providerReceiptBinance?.logs[providerReceiptBinance.logs.length - 1]!,
        );

        console.log('BinanceLogs', BinanceLogs);
        const poolTypeBinance = Number(BinanceLogs.args[3]);
        const aprBinance = Number(BinanceLogs.args[4]);

        console.log('new');

        const verifyBinance = this.verifyTransactionConditions(
          BinanceLogs,
          amount,
          user,
        );

        return {
          isValid: verifyBinance,
          poolType: poolTypeBinance,
          apr: aprBinance,
        };

      case ChainEnum.BLOKFIT:
        const providerReceiptBlokfit =
          await this.ethersService.icoProvider.getTransactionReceipt(
            transactionHash,
          );
        console.log('providerReceiptBlokfit', providerReceiptBlokfit);
        const BlokfitLogs = this.ethersService.paymentInterface.parseLog(
          providerReceiptBlokfit?.logs[providerReceiptBlokfit.logs.length - 1]!,
        );

        console.log('BlokfitLogs', BlokfitLogs);
        const poolTypeBlokfit = Number(BlokfitLogs.args[3]);
        const aprBlokfit = Number(BlokfitLogs.args[4]);

        console.log('new');

        const verifyBlokfit = this.verifyTransactionConditions(
          BlokfitLogs,
          amount,
          user,
        );

        return {
          isValid: verifyBinance,
          poolType: poolTypeBinance,
          apr: aprBinance,
        };
      default:
        throw new Error('Unsupported chain');
    }
  }

  async paymentReceived(paymentReceived: PaymentReceivedDto, chain: ChainEnum) {
    console.log(paymentReceived);
    const cache = await this.redisService.get(
      `transaction:${paymentReceived.transaction_hash}-${ChainEnum.ETHEREUM}`,
    );
    if (cache) return;
    await this.redisService.set(
      `transaction:${paymentReceived.transaction_hash}-${ChainEnum.ETHEREUM}`,
      'PROCESSING',
      {
        EX: 30,
      },
    );
    const transaction = await this.Transaction.findOne({
      transactionHash: paymentReceived.transaction_hash,
    });
    console.log('transaction');
    console.log(transaction);

    if (
      transaction.distributionStatus === DistributionStatusEnum.DISTRIBUTED ||
      transaction.distributionStatus === DistributionStatusEnum.PROCESSING
    ) {
      await this.redisService.del(
        `transaction:${transaction.transactionHash}-${chain}`,
      );
      throw new BadRequestException('Already received transaction');
    } else {
      transaction.distributionStatus = DistributionStatusEnum.PROCESSING;
      await transaction.save();
    }

    // if (!transaction) {
    //   // throw new BadRequestException({
    //   //   success: false,
    //   //   message: 'Transaction not found',
    //   // });
    //   let user = await this.User.findOne({
    //     walletAddress: paymentReceived.user,
    //   });
    //   if (!user) {
    //     user = await this.User.create({
    //       walletAddress: paymentReceived.user,
    //     });
    //   }
    //   transaction = await this.Transaction.create({
    //     transactionHash: paymentReceived.transaction_hash,
    //     amountBigNumber: paymentReceived.amount,
    //     tokenAddress: paymentReceived.token,
    //     chain: chain,
    //     user: user._id,
    //     transactionStatus: TransactionStatusEnum.CONFIRMED,
    //     distributionStatus: DistributionStatusEnum.PROCESSING,
    //   });
    // }

    console.log('valid Check');

    const { isValid, poolType, apr } = await this.verifyTransaction(
      transaction.chain,
      transaction.transactionHash,
      paymentReceived.amount,
      paymentReceived.user,
    );
    console.log(isValid);

    if (!isValid) {
      await this.redisService.del(
        `transaction:${transaction.transactionHash}-${chain}`,
      );
      transaction.distributionStatus = DistributionStatusEnum.PENDING;
      await transaction.save();
      throw new BadRequestException({
        success: false,
        message: 'Invalid transaction',
      });
    }

    transaction.poolType = poolType;
    transaction.apr = apr;
    transaction.transactionStatus = TransactionStatusEnum.CONFIRMED;
    transaction.distributionStatus = DistributionStatusEnum.PROCESSING;
    transaction.amountBigNumber = String(paymentReceived.amount);
    transaction.tokenAddress = paymentReceived.token;

    await transaction.save();
    try {
      const { txHash } = await this.transferService.transferTokens({
        walletAddress: paymentReceived.user,
        purchaseAmount:
          transaction.chain === ChainEnum.ETHEREUM
            ? parseEther(formatUnits(paymentReceived.amount, 6))
            : BigInt(paymentReceived.amount),
        transactionHash: paymentReceived.transaction_hash,
        poolType: poolType,
        apr: apr,
      });

      transaction.distributionHash = txHash;
      transaction.distributionStatus = DistributionStatusEnum.DISTRIBUTED;
      transaction.tokenAmount = paymentReceived.amount;
      await transaction.save();

      // await this.stakingService.createStake(
      //   txHash,
      //   paymentReceived.user,
      //   poolType,
      // );
      // await this.stakingService.verifyStakingRecord(
      //   txHash,
      //   paymentReceived.user,
      // );
    } catch (error) {
      console.log(error);
      transaction.distributionStatus = DistributionStatusEnum.FAILED;
      await transaction.save();
    }

    if (transaction.distributionStatus === DistributionStatusEnum.DISTRIBUTED) {
      try {
        await this.stakingService.createStake(
          transaction.distributionHash,
          paymentReceived.user,
          poolType,
        );
        await this.stakingService.verifyStakingRecord(
          transaction.distributionHash,
          paymentReceived.user,
          this.BigToNumber(
            transaction.chain === ChainEnum.ETHEREUM
              ? parseEther(formatUnits(paymentReceived.amount, 6))
              : BigInt(paymentReceived.amount),
          ),
        );
        transaction.stakingStatus = StakingStatus.STAKED;
        await transaction.save();
      } catch (error) {
        console.log(error);
        transaction.stakingStatus = StakingStatus.FAILED;
        await transaction.save();
      }
      try {
        await this.createRefIncome(
          transaction.transactionHash,
          // transaction.chain,
        );
      } catch (error) {
        console.log(error);
      }
    }

    await this.redisService.del(
      `transaction:${transaction.transactionHash}-${chain}`,
    );
    return { message: 'Success' };
  }

  async createRefIncome(tx: string) {
    const transaction = await this.Transaction.findOne({
      transactionHash: tx,
      distributionStatus: DistributionStatusEnum.DISTRIBUTED,
      stakingStatus: StakingStatus.STAKED,
    });
    console.log(transaction);
    const referaltx = await this.referrlaTransaction.findOne({
      transactionHash: tx,
    });
    console.log(referaltx);
    if (referaltx) return;
    if (transaction.chain === 'BINANCE') {
      console.log('BINANCE');
      const receipt =
        await this.ethersService.binanceProvider.getTransactionReceipt(tx);
      const paymentLogs = receipt.logs.filter(
        (log) => log.topics[0] === process.env.REFERRAL_INCOME_RECEIVED,
      );
      for (const log of paymentLogs) {
        try {
          const parsedLog = this.ethersService.paymentInterface.parseLog(log);
          console.log('Parsed Log:', parsedLog.args);
          const ref = await this.referrlaTransaction.findOne({
            transactionHash: tx,
          });
          console.log(ref);
          if (!ref) {
            await this.referrlaTransaction.create({
              transactionHash: tx,
              referrer: parsedLog.args[0],
              buyer: parsedLog.args[1],
              buyAmount: this.BigToNumber(parsedLog.args[2]),
              referralIncome: this.BigToNumber(parsedLog.args[3]),
              token: parsedLog.args[4],
              chain: ChainEnum.BINANCE,
            });
            console.log('done');
          }
        } catch (error) {
          console.error('Failed to parse filtered log:', error);
        }
      }
    } else if (transaction.chain === 'ETHEREUM') {
      console.log('ETHEREUM');
      const receipt =
        await this.ethersService.ethereumProvider.getTransactionReceipt(tx);
      const paymentLogs = receipt.logs.filter(
        (log) => log.topics[0] === process.env.REFERRAL_INCOME_RECEIVED,
      );

      for (const log of paymentLogs) {
        try {
          const parsedLog = this.ethersService.paymentInterface.parseLog(log);
          console.log('Parsed Log:', parsedLog.args);
          const ref = await this.referrlaTransaction.findOne({
            transactionHash: tx,
          });
          console.log(ref);
          if (!ref) {
            await this.referrlaTransaction.create({
              transactionHash: tx,
              referrer: parsedLog.args[0],
              buyer: parsedLog.args[1],
              buyAmount: this.BigToNumber(
                parseEther(formatUnits(parsedLog.args[2], 6)),
              ),
              referralIncome: this.BigToNumber(
                parseEther(formatUnits(parsedLog.args[3], 6)),
              ),
              token: parsedLog.args[4],
              chain: ChainEnum.ETHEREUM,
            });
            console.log('done');
          }
        } catch (error) {
          console.error('Failed to parse filtered log:', error);
        }
      }
    } else {
      console.log('BLOKFIT');
      const receipt =
        await this.ethersService.icoProvider.getTransactionReceipt(tx);
      const paymentLogs = receipt.logs.filter(
        (log) => log.topics[0] === process.env.REFERRAL_INCOME_RECEIVED,
      );
      for (const log of paymentLogs) {
        try {
          const parsedLog = this.ethersService.paymentInterface.parseLog(log);
          console.log('Parsed Log:', parsedLog.args);
          const ref = await this.referrlaTransaction.findOne({
            transactionHash: tx,
          });
          console.log(ref);
          if (!ref) {
            await this.referrlaTransaction.create({
              transactionHash: tx,
              referrer: parsedLog.args[0],
              buyer: parsedLog.args[1],
              buyAmount: this.BigToNumber(parsedLog.args[2]),
              referralIncome: this.BigToNumber(parsedLog.args[3]),
              token: parsedLog.args[4],
              chain: ChainEnum.BLOKFIT,
            });
            console.log('done');
          }
        } catch (error) {
          console.error('Failed to parse filtered log:', error);
        }
      }
    }
  }

  // async createRefIncome(tx: string, chain: string) {
  //   if (chain === ChainEnum.BINANCE) {
  //     const receipt =
  //       await this.ethersService.binanceProvider.getTransactionReceipt(tx);
  //     const paymentLogs = receipt.logs.filter(
  //       (log) => log.topics[0] === process.env.REFERRAL_INCOME_RECEIVED,
  //     );
  //     for (const log of paymentLogs) {
  //       try {
  //         const parsedLog = this.ethersService.paymentInterface.parseLog(log);
  //         console.log('Parsed Log:', parsedLog.args);
  //         const ref = await this.referrlaTransaction.findOne({
  //           transactionHash: tx,
  //         });
  //         console.log(ref);
  //         if (!ref) {
  //           await this.referrlaTransaction.create({
  //             transactionHash: tx,
  //             referrer: parsedLog.args[0],
  //             buyer: parsedLog.args[1],
  //             buyAmount: this.BigToNumber(parsedLog.args[2]),
  //             referralIncome: this.BigToNumber(parsedLog.args[3]),
  //             token: parsedLog.args[4],
  //             chain: ChainEnum.BINANCE,
  //           });
  //           console.log('done');
  //         }
  //       } catch (error) {
  //         console.error('Failed to parse filtered log:', error);
  //       }
  //     }
  //   } else {
  //     const receipt =
  //       await this.ethersService.ethereumProvider.getTransactionReceipt(tx);
  //     const paymentLogs = receipt.logs.filter(
  //       (log) => log.topics[0] === process.env.REFERRAL_INCOME_RECEIVED,
  //     );

  //     for (const log of paymentLogs) {
  //       try {
  //         const parsedLog = this.ethersService.paymentInterface.parseLog(log);
  //         console.log('Parsed Log:', parsedLog.args);
  //         const ref = await this.referrlaTransaction.findOne({
  //           transactionHash: tx,
  //         });
  //         console.log(ref);
  //         if (!ref) {
  //           await this.referrlaTransaction.create({
  //             transactionHash: tx,
  //             referrer: parsedLog.args[0],
  //             buyer: parsedLog.args[1],
  //             buyAmount: this.BigToNumber(
  //               parseEther(formatUnits(parsedLog.args[2], 6)),
  //             ),
  //             referralIncome: this.BigToNumber(
  //               parseEther(formatUnits(parsedLog.args[3], 6)),
  //             ),
  //             token: parsedLog.args[4],
  //             chain: ChainEnum.ETHEREUM,
  //           });
  //           console.log('done');
  //         }
  //       } catch (error) {
  //         console.error('Failed to parse filtered log:', error);
  //       }
  //     }
  //   }
  // }

  private BigToNumber(value: BigInt): number {
    const bigNumberValue = new BigNumber(value.toString());
    return bigNumberValue.dividedBy(new BigNumber(10).pow(18)).toNumber();
  }

  // async referralReceived(
  //   referralReceived: ReferralReceivedDto,
  //   chain: ChainEnum,
  // ) {
  //   const referralReceivedFormatted: ReferralReceivedDto = {
  //     referrer: referralReceived.referrer,
  //     buyer: referralReceived.buyer,
  //     buy_amount: referralReceived.buy_amount,
  //     referral_income: referralReceived.referral_income,
  //     token: referralReceived.token,
  //     transaction_hash: referralReceived.transaction_hash,
  //     block_number: referralReceived.block_number,
  //     block_timestamp: referralReceived.block_timestamp,
  //   };

  //   const referralTx = await this.ReferralTransaction.findOne({
  //     where: {
  //       transactionHash: referralReceivedFormatted.transaction_hash,
  //     },
  //   });

  //   if (referralTx) throw new BadRequestException('Referral Tx Already Exists');

  //   const referralTransaction = await this.ReferralTransaction.create({
  //     ...referralReceivedFormatted,
  //     buyAmount: referralReceivedFormatted.buy_amount,
  //     referralIncome: referralReceivedFormatted.referral_income,
  //     transactionHash: referralReceivedFormatted.transaction_hash,
  //     blockNumber: referralReceivedFormatted.block_number,
  //     chain: chain,
  //   });

  //   return { message: 'Success' };
  // }
}
