import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/createNotification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('create')
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  async findAll() {
    return this.notificationService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }
}
