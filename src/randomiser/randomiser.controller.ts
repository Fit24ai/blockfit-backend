import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RandomiserService } from './randomiser.service';

@Controller('randomiser')
export class RandomiserController {
  constructor(private readonly randomiserService: RandomiserService) {}

  @Post('/create')
  createRandomiser(@Body('selectPlan') selectPlan:number) {
    console.log(selectPlan);
    return this.randomiserService.createRandomiser(selectPlan);
  }
  @Get('/getAPR')
  getRandomNumber(@Query('selectedPlan') selectedPlan:number) {
    return this.randomiserService.getRandomNumber(selectedPlan);
  }
}
