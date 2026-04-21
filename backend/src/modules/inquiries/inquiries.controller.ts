import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { AdminInquiryQueryDto } from './dto/admin-inquiry-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

interface JwtUser {
  id: number;
  role: string;
}

@ApiTags('1:1 문의')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  @Throttle({
    global: {
      limit: 300,
      ttl: 60000,
    },
    auth: {
      limit: 300,
      ttl: 60000,
    },
  })
  @ApiCookieAuth()
  @ApiOperation({ summary: '내 문의 목록 조회', description: '현재 사용자의 1:1 문의 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '문의 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 429, description: '요청 과다' })
  findAll(@Request() req: { user: JwtUser }) {
    return this.inquiriesService.findAllByUser(req.user.id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '1:1 문의 생성', description: '새로운 1:1 문의를 생성합니다.' })
  @ApiResponse({ status: 201, description: '문의 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  create(@Request() req: { user: JwtUser }, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '내 문의 상세 조회', description: '1:1 문의 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '문의 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '본인 문의가 아니지 않음' })
  @ApiResponse({ status: 404, description: '문의를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '문의 ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.inquiriesService.findOne(id, req.user.id);
  }
}

@ApiTags('관리자 - 1:1 문의')
@Controller('admin/inquiries')
@Roles('admin', 'super_admin')
export class AdminInquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 문의 목록 조회', description: '모든 사용자의 1:1 문의 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '문의 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  findAll(@Query() query: AdminInquiryQueryDto) {
    return this.inquiriesService.findAllForAdmin(query);
  }

  @Post(':id/answer')
  @ApiCookieAuth()
  @ApiOperation({ summary: '문의 답변', description: '1:1 문의에 답변을 등록합니다.' })
  @ApiResponse({ status: 201, description: '답변 등록 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '문의를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '문의 ID' })
  answer(@Param('id', ParseIntPipe) id: number, @Body() dto: AnswerInquiryDto) {
    return this.inquiriesService.answerInquiry(id, dto);
  }
}
