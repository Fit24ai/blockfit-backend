import { Body, Controller, Get, Post } from '@nestjs/common';
import { RandomiserService } from './randomiser.service';

@Controller('randomiser')
export class RandomiserController {
  constructor(private readonly randomiserService: RandomiserService) {}

  @Post('/create')
  createRandomiser(@Body() aPRData:number[]) {
    return this.randomiserService.createRandomiser();
  }
  @Get('/getAPR')
  getRandomNumber() {
    return this.randomiserService.getRandomNumber();
  }
}
