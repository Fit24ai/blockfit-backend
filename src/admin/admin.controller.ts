import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/adminLogin.dto';
import { AdminJwtAuthGuard } from 'src/passport/passport.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/login')
  @UsePipes(ValidationPipe)
  login(@Body() requestBody: AdminLoginDto): {} {
    return this.adminService.login(requestBody);
  }
  @Post('/create')
  @UsePipes(ValidationPipe)
  create(@Body() requestBody: AdminLoginDto): {} {
    return this.adminService.create(requestBody);
  }
  @Post('/verify')
  @UsePipes(ValidationPipe)
  verifyAdmin(@Body() body: { token: string }): {} {
    return this.adminService.verifyAdmin(body.token);
  }

  @Get('/total-network-staked-users')
  // @UseGuards(AdminAuthGuard)
  getTotalNetworkStakedUsers() {
    return this.adminService.getTotalNetworkStakedUsers();
  }
  // @Get('/daily-network-staked-users')
  // async getDailyNetworkStakedUsers(@Query('date') date?: string) {
  //   let parsedDate: Date | undefined;
  //   if (date) {
  //     parsedDate = new Date(date);
  //     if (isNaN(parsedDate.getTime())) {
  //       throw new Error('Invalid date format');
  //     }
  //   }
  //   const result =
  //     await this.adminService.getDailyNetworkStakedUsers(parsedDate);
  //   return result;
  // }

  @Get('/daily-network-staked-users')
  async getDailyNetworkStakedUsers(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    let parsedFromDate: Date | undefined;
    let parsedToDate: Date | undefined;

    // Parse the fromDate query parameter
    if (fromDate) {
      parsedFromDate = new Date(fromDate);
      if (isNaN(parsedFromDate.getTime())) {
        throw new Error('Invalid fromDate format');
      }
    }

    // Parse the toDate query parameter
    if (toDate) {
      parsedToDate = new Date(toDate);
      if (isNaN(parsedToDate.getTime())) {
        throw new Error('Invalid toDate format');
      }
    }

    // Call the service with the parsed dates
    const result = await this.adminService.getStakedUsersInDateRange(
      parsedFromDate,
      parsedToDate,
    );
    return result;
  }

  @Get('/total-network-withdrawals')
  // @UseGuards(AdminAuthGuard)
  getTotalNetworkWithdrawals() {
    return this.adminService.getTotalNetworkWithdrawals();
  }

  // @Get('/daily-withdrawals')
  // async getDailyClaimedUsers(@Query('date') date?: string) {
  //   let parsedDate: Date | undefined;
  //   if (date) {
  //     parsedDate = new Date(date);
  //     if (isNaN(parsedDate.getTime())) {
  //       throw new Error('Invalid date format');
  //     }
  //   }
  //   return await this.adminService.getDailyClaimedUsers(parsedDate);
  // }

  @Get('/daily-withdrawals')
  async getDailyWithdrawals(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('address') address?: string,
  ) {
    let parsedFromDate: Date | undefined;
    let parsedToDate: Date | undefined;

    if (fromDate) {
      parsedFromDate = new Date(fromDate);
      if (isNaN(parsedFromDate.getTime())) {
        throw new Error('Invalid fromDate format');
      }
    }

    if (toDate) {
      parsedToDate = new Date(toDate);
      if (isNaN(parsedToDate.getTime())) {
        throw new Error('Invalid toDate format');
      }
    }

    return await this.adminService.getDailyClaimedUsers(
      parsedFromDate,
      parsedToDate,
      address,
    );
  }

  @Get('/get-user-info/:address')
  getUserInfo(
    @Param('address') address: string,
    @Query('level') level?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const specificLevel = level ? parseInt(level, 10) : undefined;

    const fromDate = dateFrom ? new Date(dateFrom + 'Z') : undefined;
    const toDate = dateTo ? new Date(dateTo + 'Z') : undefined;
    console.log(fromDate, toDate);

    return this.adminService.getUserInfo2(
      address,
      specificLevel,
      fromDate,
      toDate,
    );
  }

  @Get('filter-users')
  async getUsersBasedOnStakes(
    @Query('stakeAmount') stakeAmount: number,
    @Query('refStakeAmount') refStakeAmount: number,
    @Query('condition') condition: string,
    @Query('dateFrom') dateFrom?: string, // Optional dateFrom query parameter
    @Query('dateTo') dateTo?: string,
  ) {
    const fromDate = dateFrom ? new Date(dateFrom + 'Z') : undefined; // Append 'Z' to treat it as UTC/GMT
    const toDate = dateTo ? new Date(dateTo + 'Z') : undefined;
    return this.adminService.getUsersBasedOnStakes2(
      stakeAmount,
      refStakeAmount,
      condition,
      fromDate,
      toDate,
    );
  }

  @Put('block-unblock-user')
  async blockOrUnblockUser(
    @Query('walletAddress') walletAddress: string,
    @Query('block') block: boolean,
  ) {
    return this.adminService.blockOrUnblockUser(walletAddress, block);
  }

  @Get('/dashboard')
  @UseGuards(AdminJwtAuthGuard)
  getAdminDashboard() {
    return {
      message: 'Welcome Admin!',
    };
  }
}
