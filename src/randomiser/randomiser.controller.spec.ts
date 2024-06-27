import { Test, TestingModule } from '@nestjs/testing';
import { RandomiserController } from './randomiser.controller';

describe('RandomiserController', () => {
  let controller: RandomiserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RandomiserController],
    }).compile();

    controller = module.get<RandomiserController>(RandomiserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
