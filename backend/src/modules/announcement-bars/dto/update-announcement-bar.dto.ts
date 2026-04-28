import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementBarDto } from './create-announcement-bar.dto';

export class UpdateAnnouncementBarDto extends PartialType(CreateAnnouncementBarDto) {}
