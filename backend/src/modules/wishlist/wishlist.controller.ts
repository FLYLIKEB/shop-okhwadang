import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';

interface JwtUser {
  id: number;
  role: string;
}

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Get('check')
  check(
    @Request() req: { user: JwtUser },
    @Query('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.check(req.user.id, productId);
  }

  @Post()
  create(
    @Request() req: { user: JwtUser },
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.wishlistService.remove(id, req.user.id);
  }
}
