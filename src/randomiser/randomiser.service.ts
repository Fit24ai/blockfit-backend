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
    const randomiserId = '667d015bdcb53a6e814e00cb';
    const randomiserData = await this.RandomiserModel.findById(randomiserId);
    let apr = 0;
    let randomNumber: number;
    while (apr === 0 && randomiserData.count < 100) {
      randomNumber = this.getRandomInt(0, 100);
      apr = randomiserData.randomiser[randomNumber];
    }
    randomiserData.randomiser[randomNumber] = 0;

    randomiserData.count = randomiserData.count + 1;

    randomiserData.sum = randomiserData.sum + apr;

    const average = randomiserData.sum / randomiserData.count;

    await randomiserData.save();

    return { APR: apr, Average: average };
  }
}
