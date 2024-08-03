import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { solidityPackedKeccak256 } from 'ethers';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schema/user.schema';
import { v4 } from 'uuid';
import EthCrypto from 'eth-crypto';
import { ConfigService } from '@nestjs/config';
import { ReferralTransaction } from 'src/webhook/schema/referralTransaction.schema';

@Injectable()
export class ReferralService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(ReferralTransaction.name) private ReferralTransaction: Model<ReferralTransaction>,

    private readonly configService: ConfigService,
  ) {}

  private async signerSignature(messageHash: string) {
    const signature = EthCrypto.sign(
      this.configService.get('PRIVATE_KEY'),
      messageHash,
    );
    return signature;
  }
  async payWithReferral(amount: bigint, user: User) {
    console.log(amount)
    if (user.referredBy === null || !user.referredBy) {
      return {
        referred: false,
        referrer: null,
        noonce: null,
        signature: null,
      };
    }
    const referrer = await this.UserModel.findOne({
      _id: user.referredBy,
    });

    if (!referrer) {
      return {
        referred: false,
        referrer: null,
        noonce: null,
        signature: null,
      };
    }

    const noonce = v4();
    console.log(noonce, amount, referrer.walletAddress);
    const messageHash = solidityPackedKeccak256(
      ['string', 'address', 'uint256'],
      [noonce, referrer.walletAddress, BigInt(amount)],
    );

    const signature = await this.signerSignature(messageHash);

    return {
      referred: true,
      referrer: referrer.walletAddress,
      noonce: noonce,
      signature: signature,
    };
  }

  async registerReferrer(user: User, refId: string) {
    if (refId === user.walletAddress) {
      throw new BadRequestException('Cannot refer yourself');
    }
    const referrer = await this.UserModel.findOne({
      walletAddress: { $regex: refId, $options: 'i' },
    });

    if (!referrer) {
      throw new BadRequestException('Referred does not exist');
    }

    const userDetails = await this.UserModel.findOne({
      walletAddress: { $regex: user.walletAddress, $options: 'i' },
    });

    if (userDetails.referredBy) {
      throw new BadRequestException('Already Referred');
    }

    userDetails.referredBy = new Types.ObjectId(referrer._id);

    userDetails.save();

    return {
      message: 'Referral registered successfully',
    };
  }

  async getUserReferralIncome(walletAddress:string){
    const referrals = await this.ReferralTransaction.find({
      referrer:{$regex:walletAddress, $options: 'i'}
    })

    return referrals.length ? referrals : []
  }
}
