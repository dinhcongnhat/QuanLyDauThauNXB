import {
  Controller, Get, Post, Param, Body, Query, Res, UseGuards, Request,
} from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { DocumentsService } from './documents.service';
import { DocType } from '@prisma/client';
import { convertDocxToPdf } from '../utils/docx-to-pdf';

class CreateDocumentDto {
  @IsEnum(DocType) type: DocType;
  @IsObject() data: any;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

class CreateDuToanBatchDto {
  @IsObject() ttData: any;
  @IsObject() qdData: any;
  @IsString() assignedTo: string;
}

class RejectDto {
  @IsString() comment: string;
}

class ApproveDto {
  @IsOptional() @IsString() comment?: string;
}

class ResubmitDto {
  @IsOptional() @IsObject() data?: any;
}

class DelegateDto {
  @IsString() employeeId: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Post()
  async create(@Body() dto: CreateDocumentDto, @Request() req: any) {
    return this.svc.create(req.user.sub, req.user.role, dto.type, dto.data, dto.parentId, dto.assignedTo);
  }

  @Post('create-du-toan-batch')
  async createDuToanBatch(@Body() dto: CreateDuToanBatchDto, @Request() req: any) {
    return this.svc.createDuToanBatch(req.user.sub, req.user.role, dto.ttData, dto.qdData, dto.assignedTo);
  }

  @Get('stats')
  async getStats() {
    return this.svc.getStats();
  }

  @Get('approved')
  async getApproved() {
    return this.svc.getApprovedDecisions();
  }

  @Get('by-type')
  async findByType(@Query('types') types: string, @Request() req: any) {
    const typeList = types.split(',') as DocType[];
    return this.svc.findByType(typeList, req.user.sub, req.user.role);
  }

  @Get('by-parent/:parentId')
  async findByParent(@Param('parentId') parentId: string) {
    return this.svc.findByParent(parentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.svc.findOne(id);
    const buffer = await this.svc.generateDocx(id);
    const filename = this.svc.getDocFilename(doc.type, doc.data as any);
    const encoded = encodeURIComponent(`${filename}.docx`);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="document.docx"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/download-pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.svc.findOne(id);
    const docxBuffer = await this.svc.generateDocx(id);
    const pdfBuffer = convertDocxToPdf(docxBuffer);
    const filename = this.svc.getDocFilename(doc.type, doc.data as any);
    const encoded = encodeURIComponent(`${filename}.pdf`);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Public()
  @Get(':id/download-public')
  async downloadPublic(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    this.svc.verifyDownloadToken(token, id);
    const doc = await this.svc.findOne(id);
    const buffer = await this.svc.generateDocx(id);
    const filename = this.svc.getDocFilename(doc.type, doc.data as any);
    const encoded = encodeURIComponent(`${filename}.docx`);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="document.docx"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/onlyoffice-config')
  async getOnlyofficeConfig(@Param('id') id: string) {
    return this.svc.getOnlyofficeConfig(id);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.svc.approve(id, req.user.sub, req.user.role, dto.comment);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectDto, @Request() req: any) {
    return this.svc.reject(id, req.user.sub, req.user.role, dto.comment);
  }

  @Post(':id/resubmit')
  async resubmit(@Param('id') id: string, @Body() dto: ResubmitDto, @Request() req: any) {
    return this.svc.resubmit(id, req.user.sub, req.user.role, dto.data);
  }

  @Post('delegate/:parentId')
  async delegate(@Param('parentId') parentId: string, @Body() dto: DelegateDto, @Request() req: any) {
    return this.svc.delegate(parentId, req.user.sub, req.user.role, dto.employeeId);
  }
}
