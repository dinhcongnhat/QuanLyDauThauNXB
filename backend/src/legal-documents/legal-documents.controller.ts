import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
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

  @Get(':id/original-file')
  async downloadOriginal(@Param('id') id: string, @Res() res: Response) {
    const file = await this.service.downloadOriginal(id);
    const encodedName = encodeURIComponent(file.originalName);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition':
        `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
      'Content-Length': file.buffer.length,
      'Cache-Control': 'private, max-age=300',
    });
    res.end(file.buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  create(
    @Body() dto: CreateLegalDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, file);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, file);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
