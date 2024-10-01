import { Controller, Post } from '@nestjs/common';
import { ListenerService } from './listener.service';

@Controller('listener')
export class ListenerController {
  constructor(private readonly listenerService: ListenerService) {}


  @Post()
  async addListener() {
    // return this.listenerService.addListener();
  }
}
