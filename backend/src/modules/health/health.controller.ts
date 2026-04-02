import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';

@ApiTags('헬스')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '헬스 체크', description: '서버의 헬스 상태를 확인합니다.' })
  @ApiResponse({ status: 200, description: '헬스 체크 성공' })
  async check() {
    return this.healthService.check();
  }
}
