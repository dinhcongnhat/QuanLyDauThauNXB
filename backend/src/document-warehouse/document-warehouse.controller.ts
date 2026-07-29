import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentWarehouseService } from './document-warehouse.service';

@Controller('document-warehouse')
@UseGuards(JwtAuthGuard)
export class DocumentWarehouseController {
  constructor(private readonly service: DocumentWarehouseService) {}

  @Get()
  search(
    @Request() request: any,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search(request.user.sub, request.user.role, {
      q,
      tag,
      projectId,
      page,
      limit,
    });
  }
}
