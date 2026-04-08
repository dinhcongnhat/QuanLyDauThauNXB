import {
  Controller, Get, Post, Param, Body, Res, Query, UseGuards,
  Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsString, IsObject, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import * as JSZip from 'jszip';

class CreatePaymentDto {
  @IsString() contractorSelectionId: string;
}

class UpdateStepDto {
  @IsObject() data: any;
}

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly svc: PaymentService) {}

  // ====================== LIST ======================

  @Get()
  async getAll() {
    return this.svc.getAllPayments();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.svc.searchByContractNumber(query || '');
  }

  @Get('contracts')
  async getContracts() {
    return this.svc.getCompletedContractsForPayment();
  }

  @Get('step/:stepId')
  async getStep(@Param('stepId') stepId: string) {
    return this.svc.getPaymentStep(stepId);
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.svc.getPayment(id);
  }

  // ====================== CREATE ======================

  @Post()
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.svc.createPayment(req.user.sub, dto.contractorSelectionId);
  }

  // ====================== STEP DATA ======================

  @Get('step/:stepId/auto-fill')
  async getAutoFill(@Param('stepId') stepId: string) {
    return this.svc.getAutoFillForStep(stepId);
  }

  @Post('step/:stepId/update')
  async updateStep(@Param('stepId') stepId: string, @Body() dto: UpdateStepDto) {
    return this.svc.updateStepData(stepId, dto.data);
  }

  // ====================== STEP COMPLETION ======================

  @Post('step/:stepId/complete')
  async completeStep(@Param('stepId') stepId: string) {
    return this.svc.completeStep(stepId);
  }

  @Post('step/:stepId/reopen')
  async reopenStep(@Param('stepId') stepId: string) {
    return this.svc.reopenStep(stepId);
  }

  // ====================== DOCX ======================

  @Get('step/:stepId/download')
  async downloadStepDocx(@Param('stepId') stepId: string, @Res() res: Response) {
    const step = await this.svc.getPaymentStep(stepId);
    const tenGoiThau = step.payment?.contractorSelection?.tenGoiThau || 'document';
    const filename = `${step.title} - ${tenGoiThau}.docx`;
    const buffer = await this.svc.generateStepDocx(stepId);
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('step/:stepId/generate-docx')
  async generateAndSaveDocx(@Param('stepId') stepId: string) {
    const objectName = await this.svc.generateAndSaveDocx(stepId);
    const url = await this.svc.getFileUrl(objectName);
    return { objectName, url };
  }

  // ====================== ZIP DOWNLOAD ======================

  @Get(':id/zip-preview')
  async zipPreview(@Param('id') id: string) {
    return this.svc.getZipFileList(id);
  }

  @Get(':id/download-zip')
  async downloadZip(@Param('id') id: string, @Res() res: Response) {
    const { files, zipName } = await this.svc.getZipFileList(id);
    const zip = new JSZip();
    for (const f of files) {
      try {
        if (f.source === 'generate') {
          const buffer = await this.svc.generateStepDocx(f.stepId);
          zip.file(f.filename, buffer);
        } else if (f.source === 'minio' && f.objectPath) {
          const buffer = await this.svc.downloadFile(f.objectPath);
          zip.file(f.filename, buffer);
        }
      } catch { /* skip files that fail */ }
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const encoded = encodeURIComponent(zipName);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': zipBuffer.length,
    });
    res.end(zipBuffer);
  }

  // ====================== FILE UPLOAD ======================

  @Post('step/:stepId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadAttachment(
    @Param('stepId') stepId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file uploaded');
    const objectName = await this.svc.uploadAttachment(stepId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    const url = await this.svc.getFileUrl(objectName);
    return { objectName, url };
  }

  @Post('step/:stepId/delete-attachment')
  async deleteAttachment(
    @Param('stepId') stepId: string,
    @Body() body: { path: string },
  ) {
    await this.svc.deleteAttachment(stepId, body.path);
    return { success: true };
  }

  // ====================== FILE SERVING ======================

  @Get('file/url')
  async getFileUrl(@Query('path') objectPath: string) {
    const url = await this.svc.getFileUrl(objectPath);
    return { url };
  }
}
