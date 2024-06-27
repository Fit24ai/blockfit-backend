import { BadRequestException, Injectable } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { NewsletterDto } from './dto/newsletter.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Newsletter } from './schema/newsletter.schema';
import { Model } from 'mongoose';
import { Waitlist } from './schema/waitlist.schema';

@Injectable()
export class ListsService {
  constructor(
    @InjectModel(Newsletter.name) private Newsletter: Model<Newsletter>,
    @InjectModel(Waitlist.name) private Waitlist: Model<Waitlist>,
  ) {}

  async joinWaitlist(body: JoinWaitlistDto) {
    const exists = this.Waitlist.findOne({
      walletAddress: body.walletAddress,
      email: body.email,
    });
    if (exists)
      throw new BadRequestException({
        success: false,
        message: 'You are already on the waitlist',
      });
    const waitlist = new this.Waitlist({
      walletAddress: body.email,
      email: body.firstName,
      firstName: body.firstName,
      lastName: body.lastName,
      phoneNumber: body.phoneNumber,
    });
    await waitlist.save();
    return { success: true, message: 'Successfully joined the Waitlist' };
  }

  async newsletter(body: NewsletterDto) {
    const exists = this.Newsletter.findOne({ email: body.email });
    if (exists)
      throw new BadRequestException({
        success: false,
        message: 'Already subscribed to the newsletter',
      });
    const newsletter = new this.Newsletter({
      email: body.email,
    });
    await newsletter.save();
    return {
      success: true,
      message: 'Successfully subscribed to the newsletter',
    };
  }
}
