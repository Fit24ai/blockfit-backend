import { ClaimedHistory } from './../staking/schema/claimedHistory.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin } from './schema/admin.schema';
import { Model, ObjectId } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto } from './dto/adminLogin.dto';
import { error } from 'console';
import * as bcrypt from 'bcrypt';
import { Staking } from 'src/staking/schema/staking.schema';
import { EthersService } from 'src/ethers/ethers.service';
import { formatUnits, getAddress } from 'ethers';
import { User } from 'src/users/schema/user.schema';
import { StakingTransaction } from 'src/staking-transaction/schema/stakingTransaction.schema';
import { DistributionStatusEnum } from 'src/types/transaction';

@Injectable()
export class AdminService {
  constructor(
    private readonly ethersService: EthersService,
    @InjectModel(Admin.name) private Admin: Model<Admin>,
    @InjectModel(User.name) private User: Model<User>,
    @InjectModel(Staking.name) private StakingModel: Model<Staking>,
    @InjectModel(StakingTransaction.name)
    private Transaction: Model<StakingTransaction>,
    @InjectModel(ClaimedHistory.name)
    private ClaimedHistoryModel: Model<ClaimedHistory>,
    private jwtService: JwtService,
  ) {}

  async findAdminById(id: ObjectId): Promise<Admin | null> {
    return this.Admin.findById(id);
  }

  async login(request: AdminLoginDto) {
    const admin = await this.Admin.findOne({
      username: { $regex: request.username, $options: 'i' },
    });

    if (!admin || !(await bcrypt.compare(request.password, admin.password))) {
      return { success: false, error: 'Invalid username or password' };
    }

    // return { success: false, error: 'Invalid username or password' };

    return this.signToken(admin._id.toString());
  }

  async create(request: AdminLoginDto) {
    const existingAdmin = await this.Admin.findOne({
      username: { $regex: String(request.username), $options: 'i' },
    });

    if (existingAdmin) {
      return { success: false, error: 'Admin already exists' };
    }

    const hashedPassword = await bcrypt.hash(request.password, 10);

    const newAdmin = new this.Admin({
      username: request.username,
      password: hashedPassword,
    });

    await newAdmin.save();

    return this.signToken(newAdmin._id.toString());
  }

  async verifyAdmin(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const admin = await this.Admin.findById(payload.id);

      if (!admin) {
        return { success: false, error: 'Invalid token' };
      }

      return { success: true, payload };
    } catch (error) {
      return { success: false, error: 'Token verification failed' };
    }
  }

  async signToken(id: string) {
    const accessToken = await this.jwtService.signAsync(
      { id },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );
    return { success: true, accessToken };
  }

  //   async getTotalNetworkStakedUsers() {
  //     let data = [];
  //     const members = await this.ethersService.icoContract.getAllUsers();
  //     console.log(members.length);
  //     members.map(async (member) => {
  //       const staking = await this.StakingModel.find({
  //         walletAddress: member,
  //         isReferred: false,
  //       });
  //       console.log(staking);
  //       if (staking.length > 0) {
  //         data.push({
  //           address: member,
  //           stakeCount: staking.length,
  //           stakes: staking,
  //         });
  //       }
  //     });

  //     return {
  //       data,
  //       totalMembers: data.length,
  //     };
  //   }

  async getTotalNetworkStakedUsers() {
    let data = [];
    const members = await this.ethersService.icoContract.getAllUsers();
    // console.log(members.length);

    const stakingData = await Promise.all(
      members.map(async (member) => {
        const staking = await this.StakingModel.find({
          walletAddress: member,
          isReferred: false,
        });
        let count = 0;

        if (staking.length > 0) {
          staking.map((stake) => {
            stake.amount;
            count += stake.amount;
          });
          return {
            address: member,
            stakeCount: staking.length,
            totalStakeAmount: count,
            stakes: staking,
          };
        }
        return null;
      }),
    );

    data = stakingData.filter((item) => item !== null);

    return {
      totalMembers: data.length,
      data,
    };
  }

  // async getDailyNetworkStakedUsers(date?: Date) {
  //   const selectedDate = date || new Date();

  //   const timezoneOffset = selectedDate.getTimezoneOffset() * 60 * 1000;

  //   const startOfDay =
  //     new Date(
  //       selectedDate.getFullYear(),
  //       selectedDate.getMonth(),
  //       selectedDate.getDate(),
  //       0,
  //       0,
  //       0,
  //       0,
  //     ).getTime() - timezoneOffset;

  //   const endOfDay =
  //     new Date(
  //       selectedDate.getFullYear(),
  //       selectedDate.getMonth(),
  //       selectedDate.getDate(),
  //       23,
  //       59,
  //       59,
  //       999,
  //     ).getTime() - timezoneOffset;

  //   let data = [];
  //   const members = await this.ethersService.icoContract.getAllUsers();

  //   const stakingData = await Promise.all(
  //     members.map(async (member) => {
  //       const staking = await this.StakingModel.find({
  //         walletAddress: member,
  //         isReferred: false,
  //         createdAt: { $gte: startOfDay, $lte: endOfDay },
  //       });

  //       let count = 0;

  //       if (staking.length > 0) {
  //         staking.map((stake) => {
  //           stake.amount;
  //           count += stake.amount;
  //         });
  //         return {
  //           address: member,
  //           stakeCount: staking.length,
  //           totalStakeAmount: count,
  //           stakes: staking,
  //         };
  //       }
  //       return null;
  //     }),
  //   );

  //   data = stakingData.filter((item) => item !== null);

  //   return {
  //     totalMembers: data.length,
  //     data,
  //   };
  // }

  async getStakedUsersInDateRange(fromDate?: Date, toDate?: Date) {
    // Use provided dates or default to the current date
    const startDate = fromDate || new Date();
    const endDate = toDate || new Date();

    const timezoneOffset = startDate.getTimezoneOffset() * 60 * 1000;

    // Set the start of the range to the beginning of the fromDate
    const startOfRange =
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0,
        0,
        0,
        0,
      ).getTime() - timezoneOffset;

    // Set the end of the range to the end of the toDate
    const endOfRange =
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999,
      ).getTime() - timezoneOffset;

    let data = [];
    const members = await this.ethersService.icoContract.getAllUsers();

    const stakingData = await Promise.all(
      members.map(async (member) => {
        const staking = await this.StakingModel.find({
          walletAddress: member,
          isReferred: false,
          createdAt: { $gte: startOfRange, $lte: endOfRange },
        });

        let count = 0;

        if (staking.length > 0) {
          staking.map((stake) => {
            count += stake.amount;
          });
          return {
            address: member,
            stakeCount: staking.length,
            totalStakeAmount: count,
            stakes: staking,
          };
        }
        return null;
      }),
    );

    data = stakingData.filter((item) => item !== null);

    return {
      totalMembers: data.length,
      data,
    };
  }

  async getTotalNetworkWithdrawals() {
    const members = await this.ethersService.icoContract.getAllUsers();
    const claimedData = await Promise.all(
      members.map(async (member) => {
        const claimed = await this.ClaimedHistoryModel.find({
          walletAddress: member,
        });
        let count = 0;

        if (claimed.length > 0) {
          claimed.map((claim) => {
            count += claim.amount;
          });
          return {
            address: member,
            totalClaim: count,
            claimCount: claimed.length,
            // claim: claimed,
          };
        }
        return null;
      }),
    );
    const claimedAmount = await this.ethersService.icoContract.totalClaimed();
    return {
      totalClaimedMembers: claimedData.filter((item) => item !== null).length,
      totalAmountClaimed: Number(formatUnits(claimedAmount, 18)),
      data: claimedData.filter((item) => item !== null),
    };

    // console.log(tokens);
    // return Number(formatUnits(tokens, 18));
  }

  // async getDailyClaimedUsers(date?: Date) {
  //   const selectedDate = date || new Date();

  //   const timezoneOffset = selectedDate.getTimezoneOffset() * 60 * 1000;

  //   const startOfDay =
  //     new Date(
  //       selectedDate.getFullYear(),
  //       selectedDate.getMonth(),
  //       selectedDate.getDate(),
  //       0,
  //       0,
  //       0,
  //       0,
  //     ).getTime() - timezoneOffset;

  //   const endOfDay =
  //     new Date(
  //       selectedDate.getFullYear(),
  //       selectedDate.getMonth(),
  //       selectedDate.getDate(),
  //       23,
  //       59,
  //       59,
  //       999,
  //     ).getTime() - timezoneOffset;

  //   let claimedAmount = 0;

  //   const members = await this.ethersService.icoContract.getAllUsers();

  //   const claimedData = await Promise.all(
  //     members.map(async (member) => {
  //       const claimed = await this.ClaimedHistoryModel.find({
  //         walletAddress: member,
  //         createdAt: {
  //           $gte: new Date(startOfDay),
  //           $lte: new Date(endOfDay),
  //         },
  //       });

  //       let totalAmount = 0;

  //       if (claimed.length > 0) {
  //         claimed.map((claim) => {
  //           totalAmount += claim.amount;
  //         });

  //         claimedAmount += totalAmount;

  //         return {
  //           address: member,
  //           totalClaim: totalAmount,
  //           claimCount: claimed.length,
  //         };
  //       }

  //       return null;
  //     }),
  //   );

  //   const filteredData = claimedData.filter((item) => item !== null);

  //   return {
  //     totalClaimedMembers: filteredData.length,
  //     totalAmountClaimed: claimedAmount,
  //     data: filteredData,
  //   };
  // }

  async getDailyClaimedUsers(fromDate?: Date, toDate?: Date, address?: string) {
    console.log(fromDate, toDate);
    const startDate = fromDate || new Date();
    const endDate = toDate || new Date();

    const timezoneOffset = startDate.getTimezoneOffset() * 60 * 1000;

    const startOfDay =
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0,
        0,
        0,
        0,
      ).getTime() - timezoneOffset;

    const endOfDay =
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999,
      ).getTime() - timezoneOffset;

    let claimedAmount = 0;

    if (!address) {
      const members = await this.ethersService.icoContract.getAllUsers();

      const claimedData = await Promise.all(
        members.map(async (member) => {
          const claimed = await this.ClaimedHistoryModel.find({
            walletAddress: member,
            createdAt: {
              $gte: new Date(startOfDay),
              $lte: new Date(endOfDay),
            },
          });

          let totalAmount = 0;

          if (claimed.length > 0) {
            claimed.forEach((claim) => {
              totalAmount += claim.amount;
            });

            claimedAmount += totalAmount;

            return {
              address: member,
              totalClaim: totalAmount,
              claimCount: claimed.length,
            };
          }

          return null;
        }),
      );

      const filteredData = claimedData.filter((item) => item !== null);

      return {
        totalClaimedMembers: filteredData.length,
        totalAmountClaimed: claimedAmount,
        data: filteredData,
      };
    } else {
      const user = await this.User.findOne({ walletAddress: address });
      if (!user)
        return { totalClaimedMembers: 0, totalAmountClaimed: 0, data: [] };
      const claimed = await this.ClaimedHistoryModel.find({
        walletAddress: address,
        createdAt: {
          $gte: new Date(startOfDay),
          $lte: new Date(endOfDay),
        },
      });

      let totalAmount = 0;

      if (claimed.length > 0) {
        claimed.forEach((claim) => {
          totalAmount += claim.amount;
        });

        claimedAmount += totalAmount;
      }

      return {
        totalClaimedMembers: 1,
        totalAmountClaimed: totalAmount,
        data: [
          {
            address: address,
            totalClaim: totalAmount,
            claimCount: claimed.length,
          },
        ],
      };
    }
  }

  // async getUserInfo(walletAddress: string) {
  //   const user = await this.User.findOne({ walletAddress: walletAddress });
  //   if (!user) return { success: false, error: 'User not found' };
  //   const result = [];
  //   let totalStakeAmount = 0;
  //   let totalRefStakeAmount = 0;
  //   const selfStakes = await this.StakingModel.find({
  //     walletAddress: walletAddress,
  //     isReferred: false,
  //   });
  //   selfStakes.map((stake) => {
  //     totalStakeAmount += stake.amount;
  //   });
  //   const referredStakes = await this.StakingModel.find({
  //     walletAddress: walletAddress,
  //     isReferred: true,
  //   }).sort({ startTime: -1 });

  //   referredStakes.map((stake) => {
  //     totalRefStakeAmount += stake.amount;
  //   });

  //   for (const referral of referredStakes) {
  //     const referredUser = await this.StakingModel.findOne({
  //       stakeId: referral.refId,
  //     }).exec();

  //     if (referredUser) {
  //       result.push({
  //         referralDetails: referral,
  //         referreDetails: {
  //           referre: referredUser.walletAddress,
  //           amount: referredUser.amount,
  //         },
  //       });
  //     }
  //   }

  //   const tokens =
  //     await this.ethersService.icoContract.userTotalTokenStaked(walletAddress);

  //   return {
  //     success: true,
  //     user,
  //     totalStakeAmount: Number(formatUnits(tokens, 18)),
  //     totalRefStakeAmount,
  //     selfStakes,
  //     referredStakes: result,
  //   };
  // }

  // async getUsersBasedOnStakes(stakeAmount: number, refStakeAmount: number) {
  //   const users = await this.ethersService.icoContract.getAllUsers();
  //   console.log(users)
  //   const result = [];
  //   users.map(async (user) => {
  //     let refStakeTokens = 0;
  //     const selfStakeTokens =
  //       await this.ethersService.icoContract.userTotalTokenStaked(user);

  //       console.log(formatUnits(selfStakeTokens, 18))

  //     const refStakes = await this.StakingModel.find({
  //       walletAddress: user,
  //       isReferred: true,
  //     });

  //     refStakes.map((stake) => {
  //       refStakeTokens += stake.amount;
  //     });
  //     if (
  //       Number(formatUnits(selfStakeTokens, 18)) >= stakeAmount &&
  //       refStakeTokens >= refStakeAmount
  //     ) {
  //       result.push(user);
  //     }
  //   });

  //   return result;
  // }
  // async getUsersBasedOnStakes(stakeAmount: number, refStakeAmount: number) {
  //   const users = await this.ethersService.icoContract.getAllUsers();

  //   // Use Promise.all to handle all users in parallel
  //   const userResults = await Promise.all(
  //     users.map(async (user) => {
  //       let refStakeTokens = 0;

  //       // Fetch the user's self-stake tokens
  //       const selfStakeTokens =
  //         await this.ethersService.icoContract.userTotalTokenStaked(user);
  //       console.log(formatUnits(selfStakeTokens, 18));

  //       // Fetch referred stakes for this user
  //       const refStakes = await this.StakingModel.find({
  //         walletAddress: user,
  //         isReferred: true,
  //       });

  //       // Calculate total referred stakes
  //       refStakes.forEach((stake) => {
  //         refStakeTokens += stake.amount;
  //       });

  //       // Return user if they meet the conditions, otherwise return null
  //       if (
  //         Number(formatUnits(selfStakeTokens, 18)) >= stakeAmount &&
  //         refStakeTokens >= refStakeAmount
  //       ) {
  //         return user;
  //       }

  //       return null; // Return null if the user doesn't meet the condition
  //     }),
  //   );

  //   // Filter out null values
  //   return {
  //     totalUsers: userResults.filter((user) => user !== null).length,
  //     data: userResults.filter((user) => user !== null),
  //   };
  // }

  // async getUserInfo(walletAddress: string, specificLevel?: number) {
  //   console.log(specificLevel);

  //   // Fetch the user details
  //   const user = await this.User.findOne({ walletAddress: walletAddress });
  //   if (!user) return { success: false, error: 'User not found' };

  //   const userTokens = await this.getUserTotalTokenStaked(walletAddress);
  //   let tokensLevel = 0;

  //   if (userTokens.tokens >= 12500) {
  //     const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
  //     tokensLevel += additionalLevels;
  //   }

  //   if (tokensLevel > 24) {
  //     tokensLevel = 24;
  //   }

  //   const directMembers =
  //     await this.ethersService.referralContract.getAllRefrees(walletAddress);

  //   let levelCount = directMembers.length >= 24 ? 24 : directMembers.length;

  //   if (levelCount <= tokensLevel) {
  //     levelCount = tokensLevel;
  //   }

  //   const result = {};
  //   let totalStakeAmount = 0;
  //   let totalRefStakeAmount = 0;

  //   // Fetch self stakes (direct stakes from the user)
  //   const selfStakes = await this.StakingModel.find({
  //     walletAddress: walletAddress,
  //     isReferred: false,
  //   });

  //   // Accumulate total self stake amount
  //   selfStakes.forEach((stake) => {
  //     totalStakeAmount += stake.amount;
  //   });

  //   // Recursive function to fetch referred stakes by level
  //   const getReferredStakesByLevel = async (
  //     walletAddress: string,
  //     currentLevel: number,
  //   ) => {
  //     // Skip levels lower than the specific level if specified
  //     if (specificLevel && currentLevel < specificLevel) {
  //       // Continue recursion without fetching stakes until we reach the specific level
  //       const directMembers =
  //         await this.ethersService.referralContract.getAllRefrees(
  //           walletAddress,
  //         );
  //       for (const member of directMembers) {
  //         await getReferredStakesByLevel(member, currentLevel + 1);
  //       }
  //       return;
  //     }

  //     // Stop if level exceeds 24 or if we have passed the specific level
  //     if (currentLevel > 24 || (specificLevel && currentLevel > specificLevel))
  //       return;

  //     // Fetch direct referrals for the current wallet address
  //     const directMembers =
  //       await this.ethersService.referralContract.getAllRefrees(walletAddress);

  //     // Ensure result object has an array for the current level
  //     if (!result[currentLevel]) {
  //       result[currentLevel] = [];
  //     }

  //     for (const member of directMembers) {
  //       // Fetch the self stakes of each referred member
  //       const memberSelfStakes = await this.StakingModel.find({
  //         walletAddress: member,
  //         isReferred: false,
  //       });

  //       // Add member's stakes to the result at the current level
  //       memberSelfStakes.forEach((stake) => {
  //         if (currentLevel <= levelCount) {
  //           result[currentLevel].push({
  //             stake,
  //           });
  //           totalRefStakeAmount += stake.amount;
  //         }
  //       });

  //       // Continue recursion if specificLevel is not provided (fetch all levels)
  //       if (!specificLevel) {
  //         await getReferredStakesByLevel(member, currentLevel + 1);
  //       }
  //     }
  //   };

  //   // If specific level is provided, only fetch for that level, otherwise start at level 1
  //   if (specificLevel) {
  //     await getReferredStakesByLevel(walletAddress, 1); // Start from level 1 but skip lower levels
  //   } else {
  //     await getReferredStakesByLevel(walletAddress, 1); // Fetch all levels recursively
  //   }

  //   // Fetch the user's total staked tokens from the ICO contract
  //   const tokens =
  //     await this.ethersService.icoContract.userTotalTokenStaked(walletAddress);

  //   return {
  //     success: true,
  //     user,
  //     totalStakeAmount: Number(formatUnits(tokens, 18)), // Convert total staked tokens
  //     totalRefStakeAmount, // Total referred stakes across levels
  //     selfStakes, // User's direct self stakes
  //     referredStakes: result, // Referred stakes grouped by level
  //   };
  // }

  // async getUserInfo(walletAddress: string, specificLevel?: number) {
  //   console.log(specificLevel);

  //   // Fetch the user details
  //   const user = await this.User.findOne({ walletAddress: walletAddress });
  //   if (!user) return { success: false, error: 'User not found' };

  //   const userTokens = await this.getUserTotalTokenStaked(walletAddress);
  //   let tokensLevel = 0;

  //   if (userTokens.tokens >= 12500) {
  //     const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
  //     tokensLevel += additionalLevels;
  //   }

  //   if (tokensLevel > 24) {
  //     tokensLevel = 24;
  //   }

  //   const directMembers =
  //     await this.ethersService.referralContract.getAllRefrees(walletAddress);
  //   let levelCount = Math.min(24, directMembers.length);

  //   if (levelCount <= tokensLevel) {
  //     levelCount = tokensLevel;
  //   }

  //   const result = {};
  //   let totalStakeAmount = 0;
  //   let totalRefStakeAmount = 0;

  //   // Fetch self stakes (direct stakes from the user)
  //   const selfStakes = await this.StakingModel.find({
  //     walletAddress: walletAddress,
  //     isReferred: false,
  //   });

  //   // Accumulate total self stake amount
  //   selfStakes.forEach((stake) => {
  //     totalStakeAmount += stake.amount;
  //   });

  //   // Optimized recursive function to fetch referred stakes by level
  //   const getReferredStakesByLevel = async (
  //     walletAddress: string,
  //     currentLevel: number,
  //   ) => {
  //     // Skip levels lower than the specific level if specified
  //     if (specificLevel && currentLevel < specificLevel) {
  //       const directMembers =
  //         await this.ethersService.referralContract.getAllRefrees(
  //           walletAddress,
  //         );
  //       await Promise.all(
  //         directMembers.map((member) =>
  //           getReferredStakesByLevel(member, currentLevel + 1),
  //         ),
  //       );
  //       return;
  //     }

  //     // Stop if level exceeds 24 or if we have passed the specific level
  //     if (currentLevel > 24 || (specificLevel && currentLevel > specificLevel))
  //       return;

  //     const directMembers =
  //       await this.ethersService.referralContract.getAllRefrees(walletAddress);

  //     if (!result[currentLevel]) {
  //       result[currentLevel] = [];
  //     }

  //     const stakePromises = directMembers.map(async (member) => {
  //       const memberSelfStakes = await this.StakingModel.find({
  //         walletAddress: member,
  //         isReferred: false,
  //       });

  //       memberSelfStakes.forEach((stake) => {
  //         if (currentLevel <= levelCount) {
  //           result[currentLevel].push({ stake });
  //           totalRefStakeAmount += stake.amount;
  //         }
  //       });

  //       if (!specificLevel) {
  //         await getReferredStakesByLevel(member, currentLevel + 1);
  //       }
  //     });

  //     await Promise.all(stakePromises);
  //   };

  //   // Start fetching referred stakes based on the specified or default level
  //   await getReferredStakesByLevel(walletAddress, 1);

  //   // Fetch the user's total staked tokens from the ICO contract
  //   const tokens =
  //     await this.ethersService.icoContract.userTotalTokenStaked(walletAddress);
  //   const referedBy =
  //     await this.ethersService.referralContract.referedBy(walletAddress);

  //   return {
  //     success: true,
  //     user,
  //     referedBy,
  //     totalStakeAmount: Number(formatUnits(tokens, 18)), // Convert total staked tokens
  //     totalRefStakeAmount, // Total referred stakes across levels
  //     selfStakes, // User's direct self stakes
  //     referredStakes: result, // Referred stakes grouped by level
  //   };
  // }

  async getUserInfo(
    walletAddress: string,
    specificLevel?: number,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    // console.log(specificLevel);

    // console.log(dateFrom);
    // console.log(dateTo);

    // Fetch the user details
    const user = await this.User.findOne({ walletAddress: walletAddress });
    if (!user) return { success: false, error: 'User not found' };

    const userTokens = await this.getUserTotalTokenStaked(walletAddress);
    let tokensLevel = 0;

    if (userTokens.tokens >= 12500) {
      const additionalLevels = Math.floor(userTokens.tokens / 12500) * 6;
      tokensLevel += additionalLevels;
    }

    if (tokensLevel > 24) {
      tokensLevel = 24;
    }

    const directMembers =
      await this.ethersService.referralContract.getAllRefrees(walletAddress);
    let levelCount = Math.min(24, directMembers.length);

    if (levelCount <= tokensLevel) {
      levelCount = tokensLevel;
    }

    const result = {};
    let totalStakeAmount = 0;
    let totalRefStakeAmount = 0;

    // Fetch self stakes (direct stakes from the user)
    const selfStakes = await this.StakingModel.find({
      walletAddress: walletAddress,
      isReferred: false,
      // ...(dateFrom &&
      //   dateTo && {
      //     createdAt: {
      //       $gte: dateFrom,
      //       $lte: dateTo,
      //     },
      //   }),
    });

    // Accumulate total self stake amount
    selfStakes.forEach((stake) => {
      totalStakeAmount += stake.amount;
    });

    // Optimized recursive function to fetch referred stakes by level with date filtering
    const getReferredStakesByLevel = async (
      walletAddress: string,
      currentLevel: number,
    ) => {
      // Skip levels lower than the specific level if specified
      if (specificLevel && currentLevel < specificLevel) {
        const directMembers =
          await this.ethersService.referralContract.getAllRefrees(
            walletAddress,
          );
        await Promise.all(
          directMembers.map((member) =>
            getReferredStakesByLevel(member, currentLevel + 1),
          ),
        );
        return;
      }

      // Stop if level exceeds 24 or if we have passed the specific level
      if (currentLevel > 24 || (specificLevel && currentLevel > specificLevel))
        return;

      const directMembers =
        await this.ethersService.referralContract.getAllRefrees(walletAddress);

      if (!result[currentLevel]) {
        result[currentLevel] = [];
      }
      const dateFromTimestamp = dateFrom
        ? new Date(dateFrom).getTime() / 1000 // Use UTC timestamp directly
        : null;

      const dateToTimestamp = dateTo
        ? new Date(dateTo).getTime() / 1000 // Use UTC timestamp directly
        : null;

      const stakePromises = directMembers.map(async (member) => {
        const memberSelfStakes = await this.StakingModel.find({
          walletAddress: member,
          isReferred: false,
          ...(dateFromTimestamp &&
            dateToTimestamp && {
              startTime: {
                $gte: dateFromTimestamp,
                $lte: dateToTimestamp,
              },
            }),
        });

        memberSelfStakes.forEach((stake) => {
          if (currentLevel <= levelCount) {
            result[currentLevel].push({ stake });
            totalRefStakeAmount += stake.amount;
          }
        });

        if (!specificLevel) {
          await getReferredStakesByLevel(member, currentLevel + 1);
        }
      });

      await Promise.all(stakePromises);
    };

    // Start fetching referred stakes based on the specified or default level
    await getReferredStakesByLevel(walletAddress, 1);

    // Fetch the user's total staked tokens from the ICO contract
    const tokens =
      await this.ethersService.icoContract.userTotalTokenStaked(walletAddress);
    const referedBy =
      await this.ethersService.referralContract.referedBy(walletAddress);

    return {
      success: true,
      user,
      referedBy,
      totalStakeAmount: Number(formatUnits(tokens, 18)), // Convert total staked tokens
      totalRefStakeAmount, // Total referred stakes across levels
      selfStakes, // User's direct self stakes
      referredStakes: result, // Referred stakes grouped by level
    };
  }

  // async getUserInfo2(
  //   walletAddress: string,
  //   specificLevel?: number,
  //   dateFrom?: Date,
  //   dateTo?: Date,
  // ) {
  //   console.log(dateFrom);
  //   console.log(dateTo);
  //   const user = await this.User.findOne({ walletAddress: walletAddress });
  //   if (!user) return { success: false, error: 'User not found' };
  //   let totalStakeAmount = 0;
  //   let totalRefStakeAmount = 0;

  //   const referedBy =
  //     await this.ethersService.referralContract.referedBy(walletAddress);
  //   const selfStakes = await this.StakingModel.find({
  //     walletAddress: walletAddress,
  //     isReferred: false,
  //   });

  //   selfStakes.forEach((stake) => {
  //     totalStakeAmount += stake.amount;
  //   });

  //   let referredStakes = [];
  //   if (specificLevel) {
  //     referredStakes = await this.StakingModel.find({
  //       walletAddress: walletAddress,
  //       isReferred: true,
  //       level: specificLevel,
  //     });
  //   } else {
  //     referredStakes = await this.StakingModel.find({
  //       walletAddress: walletAddress,
  //       isReferred: true,
  //     });
  //   }
  //   const result = {};

  //   await Promise.all(
  //     referredStakes.map(async (stake) => {
  //       const refereeStake = await this.StakingModel.findOne({
  //         stakeId: stake.refId,
  //       });
  //       if (refereeStake) {
  //         if (!result[stake.level]) {
  //           result[stake.level] = [];
  //         }
  //         result[stake.level].push({ stake: refereeStake });
  //         totalRefStakeAmount += refereeStake.amount;
  //       }
  //     }),
  //   );
  //   return {
  //     success: true,
  //     user,
  //     referedBy,
  //     totalStakeAmount,
  //     totalRefStakeAmount,
  //     selfStakes,
  //     referredStakes: result,
  //   };
  // }

  async getUserInfo2(
    walletAddress: string,
    specificLevel?: number,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    // console.log(dateFrom);
    // console.log(dateTo);

    const user = await this.User.findOne({ walletAddress: walletAddress });
    if (!user) return { success: false, error: 'User not found' };

    let totalStakeAmount = 0;
    let totalRefStakeAmount = 0;

    const referedBy =
      await this.ethersService.referralContract.referedBy(walletAddress);

    const selfStakes = await this.StakingModel.find({
      walletAddress: walletAddress,
      isReferred: false,
    });
    let usdValue = 0;

    selfStakes.forEach(async (stake) => {
      totalStakeAmount += stake.amount;
      const transaction = await this.Transaction.findOne({
        distributionHash: stake.txHash,
        distributionStatus: DistributionStatusEnum.DISTRIBUTED,
      });
      // console.log(transaction);
      if (transaction) {
        usdValue += Number(formatUnits(transaction.amountBigNumber, 18));
      }
    });

    let referredStakes = [];
    if (specificLevel) {
      referredStakes = await this.StakingModel.find({
        walletAddress: walletAddress,
        isReferred: true,
        level: specificLevel,
      });
    } else {
      referredStakes = await this.StakingModel.find({
        walletAddress: walletAddress,
        isReferred: true,
      });
    }

    const result = {};

    const dateFromStart = dateFrom
      ? new Date(
          Date.UTC(
            dateFrom.getUTCFullYear(),
            dateFrom.getUTCMonth(),
            dateFrom.getUTCDate(),
            0,
            0,
            0,
          ),
        ).getTime() / 1000
      : null;
    const dateToEnd = dateTo
      ? new Date(
          Date.UTC(
            dateTo.getUTCFullYear(),
            dateTo.getUTCMonth(),
            dateTo.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        ).getTime() / 1000
      : null;

    // console.log(dateFromStart, dateToEnd);

    await Promise.all(
      referredStakes.map(async (stake) => {
        const refereeStake = await this.StakingModel.findOne({
          stakeId: stake.refId,
          ...(dateFromStart &&
            dateToEnd && {
              startTime: { $gte: dateFromStart, $lte: dateToEnd },
            }),
        });

        if (refereeStake) {
          if (!result[stake.level]) {
            result[stake.level] = [];
          }
          // console.log(refereeStake);
          result[stake.level].push({ stake: refereeStake });
          totalRefStakeAmount += refereeStake.amount;
        }
      }),
    );

    let totalClaimedAmount = 0;
    const claimedReward = await this.ClaimedHistoryModel.find({
      walletAddress: walletAddress,
    });

    claimedReward.forEach((reward) => {
      totalClaimedAmount += reward.amount;
    });

    return {
      success: true,
      user,
      referedBy,
      totalStakeAmount,
      usdValue,
      totalRefStakeAmount,
      totalClaimedAmount,
      selfStakes,
      referredStakes: result,
    };
  }

  async getUserTotalTokenStaked(walletAddress: string) {
    const fixedAddress = getAddress(walletAddress);
    const tokens =
      await this.ethersService.icoContract.userTotalTokenStaked(fixedAddress);
    return { tokens: Number(formatUnits(tokens, 18)) };
  }

  async getUsersBasedOnStakes(
    stakeAmount: number,
    refStakeAmount: number,
    condition: string,
  ) {
    const users = await this.ethersService.icoContract.getAllUsers();
    const userResults = [];
    const memoizedReferredStakes = new Map();

    const selfStakePromises = users.map(async (user) => {
      let refStakeTokens = 0;

      if (!memoizedReferredStakes.has(user)) {
        const referredStakesResult = await this.getReferredStakesForUser(user);
        memoizedReferredStakes.set(user, referredStakesResult);
      }

      const { totalRefStakeAmount } = memoizedReferredStakes.get(user);
      refStakeTokens += totalRefStakeAmount;

      const selfStakeTokens =
        await this.ethersService.icoContract.userTotalTokenStaked(user);
      const selfStakeCondition =
        Number(formatUnits(selfStakeTokens, 18)) >= stakeAmount;
      const refStakeCondition = refStakeTokens >= refStakeAmount;

      if (
        (condition === 'or' && (selfStakeCondition || refStakeCondition)) ||
        (condition === 'and' && selfStakeCondition && refStakeCondition)
      ) {
        userResults.push(user);
      }
    });

    await Promise.all(selfStakePromises);

    return {
      totalUsers: userResults.length,
      data: userResults,
    };
  }

  // async getUsersBasedOnStakes2(
  //   stakeAmount: number,
  //   refStakeAmount: number,
  //   condition: string,
  //   dateFrom?: Date,
  //   dateTo?: Date,
  // ) {
  //   const dateFromStart = dateFrom
  //     ? new Date(
  //         Date.UTC(
  //           dateFrom.getUTCFullYear(),
  //           dateFrom.getUTCMonth(),
  //           dateFrom.getUTCDate(),
  //           0,
  //           0,
  //           0,
  //         ),
  //       ).getTime() / 1000
  //     : null;
  //   const dateToEnd = dateTo
  //     ? new Date(
  //         Date.UTC(
  //           dateTo.getUTCFullYear(),
  //           dateTo.getUTCMonth(),
  //           dateTo.getUTCDate(),
  //           23,
  //           59,
  //           59,
  //           999,
  //         ),
  //       ).getTime() / 1000
  //     : null;

  //   console.log(dateFromStart, dateToEnd);
  //   const users = await this.ethersService.icoContract.getAllUsers();
  //   console.log(users);
  //   console.log(users.length);
  //   const userResults = [];

  //   const stakes = await this.StakingModel.find({
  //     walletAddress: { $in: users },
  //   });
  //   console.log(stakes);

  //   const refStakesMap: Map<string, number> = new Map();
  //   const selfStakesMap: Map<string, number> = new Map();

  //   for (const stake of stakes) {
  //     if (!stake.isReferred) {
  //       if (selfStakesMap.has(stake.walletAddress)) {
  //         selfStakesMap.set(
  //           stake.walletAddress,
  //           selfStakesMap.get(stake.walletAddress) + stake.amount,
  //         );
  //         continue;
  //       }
  //       selfStakesMap.set(stake.walletAddress, stake.amount);
  //     } else {
  //       // const refereeStake = await this.StakingModel.findOne({
  //       //   stakeId: stake.refId,
  //       //   ...(dateFromStart &&
  //       //     dateToEnd && {
  //       //       startTime: { $gte: dateFromStart, $lte: dateToEnd },
  //       //     }),
  //       // });
  //       const refereeStake = stakes.find((s) => s.stakeId === stake.refId);
  //       if (refereeStake) {
  //         if (refStakesMap.has(stake.walletAddress)) {
  //           refStakesMap.set(
  //             stake.walletAddress,
  //             refStakesMap.get(stake.walletAddress) + refereeStake.amount,
  //           );
  //           continue;
  //         }
  //         refStakesMap.set(stake.walletAddress, refereeStake.amount);
  //       }
  //     }
  //   }

  //   console.log(selfStakesMap, refStakesMap);

  //   return {
  //     totalUsers: userResults.length,
  //     data: userResults,
  //   };
  // }

  // async getUsersBasedOnStakes2(
  //   stakeAmount: number,
  //   refStakeAmount: number,
  //   condition: string,
  //   dateFrom?: Date,
  //   dateTo?: Date,
  // ) {
  //   const dateFromStart = dateFrom
  //     ? new Date(
  //         Date.UTC(
  //           dateFrom.getUTCFullYear(),
  //           dateFrom.getUTCMonth(),
  //           dateFrom.getUTCDate(),
  //           0,
  //           0,
  //           0,
  //         ),
  //       ).getTime() / 1000
  //     : null;
  //   const dateToEnd = dateTo
  //     ? new Date(
  //         Date.UTC(
  //           dateTo.getUTCFullYear(),
  //           dateTo.getUTCMonth(),
  //           dateTo.getUTCDate(),
  //           23,
  //           59,
  //           59,
  //           999,
  //         ),
  //       ).getTime() / 1000
  //     : null;

  //   console.log(dateFromStart, dateToEnd);
  //   const users = await this.ethersService.icoContract.getAllUsers();
  //   console.log(users);
  //   console.log(users.length);
  //   const userResults = [];

  //   // await Promise.all(

  //   //   users.map(async (user) => {
  //   //     const stakes = await this.StakingModel.find({ walletAddress: user });

  //   //     const selfStakeTokens = stakes
  //   //       .filter((stake) => !stake.isReferred)
  //   //       .reduce((sum, stake) => sum + stake.amount, 0);

  //   //     const refStakeTokens = await stakes
  //   //       .filter((stake) => stake.isReferred)
  //   //       .reduce(async (accumPromise, stake) => {
  //   //         const accum = await accumPromise;
  //   //         const refereeStake = await this.StakingModel.findOne({
  //   //           stakeId: stake.refId,
  //   //           ...(dateFromStart &&
  //   //             dateToEnd && {
  //   //               startTime: { $gte: dateFromStart, $lte: dateToEnd },
  //   //             }),
  //   //         });
  //   //         return accum + (refereeStake ? refereeStake.amount : 0);
  //   //       }, Promise.resolve(0));

  //   //     const selfStakeCondition = selfStakeTokens >= stakeAmount;
  //   //     const refStakeCondition = refStakeTokens >= refStakeAmount;

  //   //     if (
  //   //       (condition === 'or' && (selfStakeCondition || refStakeCondition)) ||
  //   //       (condition === 'and' && selfStakeCondition && refStakeCondition)
  //   //     ) {
  //   //       // console.log(user);
  //   //       userResults.push(user);
  //   //     }
  //   //   }),
  //   // );

  //   const stakes = await this.StakingModel.find({
  //     walletAddress: { $in: users },
  //   });
  //   console.log(stakes);

  //   const refStakesMap: Map<string, number> = new Map();
  //   const selfStakesMap: Map<string, number> = new Map();

  //   for (const stake of stakes) {
  //     if (!stake.isReferred) {
  //       if (selfStakesMap.has(stake.walletAddress)) {
  //         selfStakesMap.set(
  //           stake.walletAddress,
  //           selfStakesMap.get(stake.walletAddress) + stake.amount,
  //         );
  //         continue;
  //       }
  //       selfStakesMap.set(stake.walletAddress, stake.amount);
  //     } else {
  //       // const refereeStake = await this.StakingModel.findOne({
  //       //   stakeId: stake.refId,
  //       //   ...(dateFromStart &&
  //       //     dateToEnd && {
  //       //       startTime: { $gte: dateFromStart, $lte: dateToEnd },
  //       //     }),
  //       // });
  //       const refereeStake = stakes.find((s) => s.stakeId === stake.refId);
  //       if (refereeStake) {
  //         if (refStakesMap.has(stake.walletAddress)) {
  //           refStakesMap.set(
  //             stake.walletAddress,
  //             refStakesMap.get(stake.walletAddress) + refereeStake.amount,
  //           );
  //           continue;
  //         }
  //         refStakesMap.set(stake.walletAddress, refereeStake.amount);
  //       }
  //     }
  //   }

  //   console.log(selfStakesMap, refStakesMap);

  //   return {
  //     totalUsers: userResults.length,
  //     data: userResults,
  //   };
  // }

  async getUsersBasedOnStakes2(
    stakeAmount: number,
    refStakeAmount: number,
    condition: string,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    // Convert dates to Unix timestamps for range filtering
    const dateFromStart = dateFrom
      ? new Date(
          Date.UTC(
            dateFrom.getUTCFullYear(),
            dateFrom.getUTCMonth(),
            dateFrom.getUTCDate(),
            0,
            0,
            0,
          ),
        ).getTime() / 1000
      : null;
    const dateToEnd = dateTo
      ? new Date(
          Date.UTC(
            dateTo.getUTCFullYear(),
            dateTo.getUTCMonth(),
            dateTo.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        ).getTime() / 1000
      : null;

    const users = await this.ethersService.icoContract.getAllUsers();
    const userResults = [];

    // Get all stakes for users in a specified time range, if provided
    const stakes = await this.StakingModel.find({
      walletAddress: { $in: users },
      ...(dateFromStart && dateToEnd
        ? { startTime: { $gte: dateFromStart, $lte: dateToEnd } }
        : {}),
    });

    // Initialize maps to store self and referred stakes
    const refStakesMap: Map<string, number> = new Map();
    const selfStakesMap: Map<string, number> = new Map();

    // Populate self and referred stakes based on filtered results
    for (const stake of stakes) {
      if (!stake.isReferred) {
        const selfStake = selfStakesMap.get(stake.walletAddress) || 0;
        selfStakesMap.set(stake.walletAddress, selfStake + stake.amount);
      } else {
        const refereeStake = stakes.find((s) => s.stakeId === stake.refId);
        if (refereeStake) {
          const refStake = refStakesMap.get(stake.walletAddress) || 0;
          refStakesMap.set(stake.walletAddress, refStake + refereeStake.amount);
        }
      }
    }

    // console.log(selfStakesMap, refStakesMap);

    // Filter users based on stake amounts and condition
    for (const user of users) {
      const selfStakeTokens = selfStakesMap.get(user) || 0;
      const refStakeTokens = refStakesMap.get(user) || 0;

      const selfStakeCondition = selfStakeTokens >= stakeAmount;
      const refStakeCondition = refStakeTokens >= refStakeAmount;

      if (
        (condition === 'or' && (selfStakeCondition || refStakeCondition)) ||
        (condition === 'and' && selfStakeCondition && refStakeCondition)
      ) {
        userResults.push(user);
      }
    }

    return {
      totalUsers: userResults.length,
      data: userResults,
    };
  }

  private async getReferredStakesForUser(
    walletAddress: string,
    currentLevel: number = 1,
  ): Promise<{ totalRefStakeAmount: number }> {
    if (currentLevel > 24) {
      return { totalRefStakeAmount: 0 };
    }

    let totalRefStakeAmount = 0;
    const directMembers =
      await this.ethersService.referralContract.getAllRefrees(walletAddress);

    const promises = directMembers.map(async (member) => {
      const memberSelfStakes = await this.StakingModel.find({
        walletAddress: member,
        isReferred: false,
      });

      memberSelfStakes.forEach((stake) => {
        totalRefStakeAmount += stake.amount;
      });

      const referredStakesResult = await this.getReferredStakesForUser(
        member,
        currentLevel + 1,
      );
      totalRefStakeAmount += referredStakesResult.totalRefStakeAmount;
    });

    await Promise.all(promises);

    return { totalRefStakeAmount };
  }

  async blockOrUnblockUser(walletAddress: string, block: boolean) {
    // console.log(walletAddress, block);
    const user = await this.User.findOne({ walletAddress: walletAddress });
    // console.log(user);
    user.blocked = block;
    await user.save();
    return { success: true };
  }
}
