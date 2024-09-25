import { Test, TestingModule } from '@nestjs/testing';
import { ListenerController } from './listener.controller';
import { ListenerService } from './listener.service';

describe('ListenerController', () => {
  let controller: ListenerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListenerController],
      providers: [ListenerService],
    }).compile();

    controller = module.get<ListenerController>(ListenerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
