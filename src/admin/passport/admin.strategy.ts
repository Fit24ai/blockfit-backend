import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AdminService } from '../admin.service';
import { ObjectId } from 'mongoose';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly adminService: AdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { id: ObjectId }) {
    const admin = await this.adminService.findAdminById(payload.id);
    if (!admin) {
      throw new UnauthorizedException('Admin access denied');
    }
    return admin;
  }
}
