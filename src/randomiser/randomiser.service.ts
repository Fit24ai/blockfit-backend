import { Injectable } from '@nestjs/common';
import * as math from 'math';
import { Randomiser } from './schema/randomiser.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class RandomiserService {
  constructor(
    @InjectModel(Randomiser.name) private RandomiserModel: Model<Randomiser>,
  ) {}

  async createRandomiser() {
    const aPRData = [
      74, 72, 72, 72, 72, 72, 74, 72, 72, 72, 73, 72, 73, 72, 73, 73, 74, 72,
      74, 73, 72, 72, 73, 86, 72, 73, 72, 72, 72, 96, 72, 72, 74, 72, 74, 72,
      72, 73, 72, 73, 73, 73, 72, 72, 72, 72, 73, 72, 72, 72, 73, 73, 74, 73,
      72, 74, 74, 72, 73, 73, 81, 73, 73, 72, 72, 74, 74, 72, 73, 74, 72, 72,
      73, 73, 72, 73, 73, 72, 73, 74, 74, 72, 72, 72, 73, 74, 72, 73, 72, 73,
      73, 74, 72, 72, 74, 73, 72, 74, 72, 72,
    ];
    const randomiser = await this.RandomiserModel.create({
      default: aPRData,
      randomiser: aPRData,
    });

    return {
      message: 'Created Successfully',
    };
  }
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  async getRandomNumber() {
    const randomiserId = process.env.RANDOMISER_ID;
    const randomiserData = await this.RandomiserModel.findById(randomiserId);

    if (!randomiserData.randomiser.length) {
      randomiserData.randomiser = [...randomiserData.default];
    }
    const randomIndex = this.getRandomInt(
      0,
      randomiserData.randomiser.length - 1,
    );

    const apr = randomiserData.randomiser[randomIndex];

    randomiserData.randomiser.splice(randomIndex, 1);

    randomiserData.count = randomiserData.count + 1;

    randomiserData.sum = randomiserData.sum + apr;

    const average = randomiserData.sum / randomiserData.count;

    await randomiserData.save();

    return { APR: apr, Average: average };
  }
}
