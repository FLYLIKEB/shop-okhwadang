import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { MembershipService } from './membership.service';
import { CreateMembershipTierDto } from './dto/create-membership-tier.dto';
import { UpdateMembershipTierDto } from './dto/update-membership-tier.dto';

@ApiTags('관리자 - 회원 등급')
@Controller('admin/membership-tiers')
@Roles('admin', 'super_admin')
export class AdminMembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '등급 목록 조회', description: '전체 회원 등급 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '등급 목록 조회 성공' })
  findAll() {
    return this.membershipService.findAllTiers();
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '등급 단건 조회' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '등급 조회 성공' })
  @ApiResponse({ status: 404, description: '등급을 찾을 수 없음' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membershipService.findOneTier(id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '등급 생성', description: '새 회원 등급을 생성합니다.' })
  @ApiResponse({ status: 201, description: '등급 생성 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 등급명' })
  create(@Body() dto: CreateMembershipTierDto) {
    return this.membershipService.createTier(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '등급 수정', description: '회원 등급 정보를 수정합니다.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '등급 수정 성공' })
  @ApiResponse({ status: 404, description: '등급을 찾을 수 없음' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMembershipTierDto) {
    return this.membershipService.updateTier(id, dto);
  }
}
