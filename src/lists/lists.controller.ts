import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  // @Post('join-waitlist')
  // create(@Body() createListDto: Dto) {
  //   return this.listsService.create(createListDto);
  // }


}
