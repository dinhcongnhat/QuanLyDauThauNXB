import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateLegalDocumentDto,
  LegalDocumentQueryDto,
  UpdateLegalDocumentDto,
} from './dto/legal-document.dto';
import { LegalDocumentsService } from './legal-documents.service';

@Controller('legal-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LegalDocumentsController {
  constructor(private readonly service: LegalDocumentsService) {}

  @Get()
  findAll(@Query() query: LegalDocumentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateLegalDocumentDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
