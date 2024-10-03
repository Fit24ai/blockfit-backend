import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TokenModule } from './token/token.module';
import { WebhookModule } from './webhook/webhook.module';
import { UtilsModule } from './utils/utils.module';
import { EthersModule } from './ethers/ethers.module';
import { PassportModule as AuthModule } from './passport/passport.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './passport/passport.strategy';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';
import { ListsModule } from './lists/lists.module';
import { RandomiserModule } from './randomiser/randomiser.module';
import { StakingModule } from './staking/staking.module';
import { ReferralModule } from './referral/referral.module';
import { NotificationModule } from './notification/notification.module';
import { StakingTransactionModule } from './staking-transaction/staking-transaction.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    TokenModule,
    WebhookModule,
    UtilsModule,
    EthersModule,
    AuthModule,
    TransactionModule,
    TransferModule,
    ListsModule,
    RandomiserModule,
    StakingModule,
    ReferralModule,
    NotificationModule,
    StakingTransactionModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})

export class AppModule {}
