import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { Roles } from '../../common/decorators/roles.decorator';

interface JwtUser {
  id: number;
  role: string;
}

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    return this.inquiriesService.findAllByUser(req.user.id);
  }

  @Post()
  create(@Request() req: { user: JwtUser }, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.inquiriesService.findOne(id, req.user.id);
  }
}

@Controller('admin/inquiries')
@Roles('admin', 'super_admin')
export class AdminInquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  findAll() {
    return this.inquiriesService.findAllForAdmin();
  }

  @Post(':id/answer')
  answer(@Param('id', ParseIntPipe) id: number, @Body() dto: AnswerInquiryDto) {
    return this.inquiriesService.answerInquiry(id, dto);
  }
}
