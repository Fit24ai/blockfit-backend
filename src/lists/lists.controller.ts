import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ListsService } from './lists.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterDto } from './dto/newsletter.dto';

@ApiTags('lists')
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post('newsletter')
  @UsePipes(ValidationPipe)
  newsletter(@Body() body: NewsletterDto) {
    return this.listsService.newsletter(body);
  }

  @Post('join-waitlist')
  @UsePipes(ValidationPipe)
  create(@Body() body: JoinWaitlistDto) {
    return this.listsService.joinWaitlist(body);
  }
}
