import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private User: Model<User>,
    private jwtService: JwtService,
  ) {}

  async login(request: LoginDto) {
    const user = await this.User.findOne({
      walletAddress: { $regex: request.walletAddress, $options: 'i' },
    });
    if (!user) return this.createUser(request.walletAddress);
    return this.signToken(request.walletAddress);
  }

  async createUser(walletAddress: string) {
    try {
      const user = new this.User({
        walletAddress: walletAddress,
      });
      await user.save();
      return this.signToken(user.walletAddress);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async signToken(walletAddress: string) {
    const accessToken = await this.jwtService.signAsync(
      { walletAddress },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );
    return { accessToken };
  }
}
