import { BadRequestException, Injectable } from '@nestjs/common';
import * as math from 'math';
import { Randomiser } from './schema/randomiser.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { APRList } from './utils/APRList';

@Injectable()
export class RandomiserService {
  constructor(
    @InjectModel(Randomiser.name) private RandomiserModel: Model<Randomiser>,
    private readonly APRList: APRList,
  ) {}

  async createYearPlanRandomiser(aprData: number[], plan: number) {
    const isExist = await this.RandomiserModel.findOne({ plan });
    if (isExist) {
      throw new BadRequestException({
        success: false,
        message: 'Randomiser Data already exist for this plan',
      });
    }
    return this.RandomiserModel.create({
      default: aprData,
      randomiser: aprData,
      plan,
    });
  }
  async createRandomiser(selectPlan: number) {
    if (selectPlan === 1) {
      return this.createYearPlanRandomiser(APRList.APR_1Year, selectPlan);
    } else if (selectPlan === 2) {
      return this.createYearPlanRandomiser(APRList.APR_2Year, selectPlan);
    } else if (selectPlan === 3) {
      return this.createYearPlanRandomiser(APRList.APR_3Year, selectPlan);
    }

    throw new BadRequestException({
      success: false,
      message: 'Invalid Randomiser plan selected',
    });
  }
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  async getRandomNumber(selectedPlan: number) {
    if (!selectedPlan && !(selectedPlan > 0) && !(selectedPlan <= 3)) {
      throw new BadRequestException({
        success: false,
        message: 'Please select valid plan',
      });
    }
    const randomiserData = await this.RandomiserModel.findOne({
      plan: selectedPlan,
    });

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
