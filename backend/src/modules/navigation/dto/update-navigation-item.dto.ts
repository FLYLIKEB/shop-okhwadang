import { PartialType } from '@nestjs/swagger';
import { CreateNavigationItemDto } from './create-navigation-item.dto';

export class UpdateNavigationItemDto extends PartialType(CreateNavigationItemDto) {}
