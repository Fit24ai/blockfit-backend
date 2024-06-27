import { Test, TestingModule } from '@nestjs/testing';
import { RandomiserService } from './randomiser.service';

describe('RandomiserService', () => {
  let service: RandomiserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RandomiserService],
    }).compile();

    service = module.get<RandomiserService>(RandomiserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
