import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CouponRulesService } from './coupon-rules.service';
import { CreateCouponRuleDto } from './dto/create-coupon-rule.dto';
import { UpdateCouponRuleDto } from './dto/update-coupon-rule.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 쿠폰 규칙')
@Controller('admin/coupon-rules')
@Roles('admin', 'super_admin')
export class AdminCouponRulesController {
  constructor(private readonly couponRulesService: CouponRulesService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 규칙 목록 조회' })
  @ApiResponse({ status: 200, description: '목록 조회 성공' })
  findAll() {
    return this.couponRulesService.findAll();
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 규칙 단건 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '규칙 없음' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponRulesService.findOne(id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 규칙 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  create(@Body() dto: CreateCouponRuleDto) {
    return this.couponRulesService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 규칙 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  @ApiResponse({ status: 404, description: '규칙 없음' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponRuleDto) {
    return this.couponRulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '쿠폰 규칙 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '규칙 없음' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponRulesService.remove(id);
  }
}
