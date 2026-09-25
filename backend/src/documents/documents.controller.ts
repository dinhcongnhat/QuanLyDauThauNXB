import {
  BadRequestException, Controller, Get, Post, Param, Body, Query, Res, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Public } from '../auth/public.decorator';
import { DocumentsService } from './documents.service';
import { ApprovalTargetType, DocType, ProcurementType } from '@prisma/client';
import { ApprovalsService } from '../approvals/approvals.service';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import {
  appendDocxAttachment,
  validateDocxAttachmentForMerge,
} from '../utils/docx-template-renderer';
import * as JSZip from 'jszip';

class CreateDocumentDto {
  @IsEnum(DocType) type: DocType;
  @IsObject() data: any;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() sourceDocumentId?: string;
}

class CreateDuToanBatchDto {
  @IsObject() ttData: any;
  @IsObject() qdData: any;
  @IsString() assignedTo: string;
  @IsOptional() @IsString() projectId?: string;
}

class PreviewDocumentDto {
  @IsString() type: string;
  @IsObject() data: Record<string, any>;
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
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(
  'feature:book-procurement',
  'feature:equipment-procurement',
)
export class DocumentsController {
  constructor(
    private readonly svc: DocumentsService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateDocumentDto, @Request() req: any) {
    const document = await this.svc.create(
      req.user.sub,
      dto.type,
      dto.data,
      dto.parentId,
      undefined,
      dto.projectId,
      dto.sourceDocumentId,
    );
    if (
      dto.assignedTo
      && (dto.type === DocType.QD_DUTOAN || dto.type === DocType.QD_KHLCNT)
    ) {
      await this.approvals.submit(req.user.sub, {
        targetType: ApprovalTargetType.DOCUMENT,
        targetId: document.id,
        approverId: dto.assignedTo,
      });
      return this.svc.findOne(document.id);
    }
    return document;
  }

  @Post('create-du-toan-batch')
  async createDuToanBatch(@Body() dto: CreateDuToanBatchDto, @Request() req: any) {
    const result = await this.svc.createDuToanBatch(
      req.user.sub,
      dto.ttData,
      dto.qdData,
      undefined,
      dto.projectId,
    );
    await this.approvals.submit(req.user.sub, {
      targetType: ApprovalTargetType.DOCUMENT,
      targetId: result.qdDoc.id,
      approverId: dto.assignedTo,
    });
    return {
      ttDoc: result.ttDoc,
      qdDoc: await this.svc.findOne(result.qdDoc.id),
    };
  }

  @Post('preview')
  async preview(@Body() dto: PreviewDocumentDto, @Res() res: Response) {
    const buffer = await this.svc.generatePreviewDocx(dto.type, dto.data);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'inline; filename="preview.docx"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Post('preview-pdf')
  async previewPdf(@Body() dto: PreviewDocumentDto, @Res() res: Response) {
    const docxBuffer = await this.svc.generatePreviewDocx(dto.type, dto.data);
    const buffer = convertDocxToPdf(docxBuffer);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Post('preview-pdf-with-attachment')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async previewPdfWithAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; data?: string },
    @Res() res: Response,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn phụ lục khái toán');
    if (!file.originalname.toLocaleLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Phụ lục khái toán phải là tệp DOCX');
    }
    let data: Record<string, any>;
    try {
      data = JSON.parse(body.data || '{}');
    } catch {
      throw new BadRequestException('Dữ liệu biểu mẫu không hợp lệ');
    }
    try {
      await validateDocxAttachmentForMerge(file.buffer);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Phụ lục DOCX không hợp lệ hoặc không thể ghép',
      );
    }
    const document = await this.svc.generatePreviewDocx(body.type || '', data);
    const merged = await appendDocxAttachment(document, file.buffer);
    const buffer = convertDocxToPdf(merged);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview-with-appendix.pdf"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Get('stats')
  async getStats() {
    return this.svc.getStats();
  }

  @Get('approved')
  async getApproved(@Query('projectId') projectId?: string) {
    return this.svc.getApprovedDecisions(projectId);
  }

  @Get('by-type')
  async findByType(
    @Query('types') types: string,
    @Query('projectId') projectId: string,
    @Query('procurementType') procurementType: ProcurementType,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const typeList = types.split(',') as DocType[];
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.svc.findByType(
      typeList,
      req.user.sub,
      req.user.role,
      projectId,
      pageNum,
      limitNum,
      procurementType,
    );
  }

  @Get('by-project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.svc.findByProject(projectId);
  }

  @Get('by-parent/:parentId')
  async findByParent(@Param('parentId') parentId: string) {
    return this.svc.findByParent(parentId);
  }

  @Get('template-fields')
  async getTemplateFields(@Query('type') type: DocType) {
    return this.svc.getTemplateFields(type);
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

  @Get(':id/download-bundle')
  async downloadBundle(@Param('id') id: string, @Res() res: Response) {
    const bundle = await this.svc.generateDocumentBundle(id);
    const zip = new JSZip();
    bundle.files.forEach((file) => zip.file(file.filename, file.buffer));
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const encoded = encodeURIComponent(bundle.filename);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents.zip"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/download-cover')
  async downloadCover(@Param('id') id: string, @Res() res: Response) {
    const { filename, buffer } = await this.svc.generateCoverDocx(id);
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="cover.docx"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/preview-cover-pdf')
  async previewCoverPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer } = await this.svc.generateCoverDocx(id);
    const pdfBuffer = convertDocxToPdf(buffer);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="cover-preview.pdf"',
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store, max-age=0',
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

  @Post(':id/khai-toan-attachment')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadKhaiToanAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new Error('Chưa chọn file');
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.svc.uploadKhaiToanAttachment(id, req.user.sub, {
      buffer: file.buffer,
      originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get(':id/khai-toan-attachment')
  async getKhaiToanAttachment(@Param('id') id: string, @Request() req: any) {
    return this.svc.getKhaiToanAttachmentUrl(id, req.user.sub);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() dto: ApproveDto, @Request() req: any) {
    return this.approvals.approveTarget(
      ApprovalTargetType.DOCUMENT,
      id,
      req.user.sub,
      dto.comment,
    );
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectDto, @Request() req: any) {
    return this.approvals.rejectTarget(
      ApprovalTargetType.DOCUMENT,
      id,
      req.user.sub,
      dto.comment,
    );
  }

  @Post(':id/resubmit')
  async resubmit(@Param('id') id: string, @Body() dto: ResubmitDto, @Request() req: any) {
    return this.svc.resubmit(id, req.user.sub, dto.data);
  }

  @Post('delegate/:parentId')
  async delegate(@Param('parentId') parentId: string, @Body() dto: DelegateDto, @Request() req: any) {
    return this.svc.delegate(parentId, req.user.sub, dto.employeeId);
  }
}
