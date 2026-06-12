import {
  Controller, Get, Post, Param, Body, Res, Query, UseGuards,
  Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsString, IsObject, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PaymentService } from './payment.service';
import * as JSZip from 'jszip';

class CreatePaymentDto {
  @IsString() contractorSelectionId: string;
  @IsOptional() @IsString() projectId?: string;
}

class UpdateStepDto {
  @IsObject() data: any;
}

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly svc: PaymentService) {}

  // ====================== LIST ======================

  @Get()
  async getAll(@Query('projectId') projectId?: string) {
    return this.svc.getAllPayments(projectId);
  }

  @Get('search')
  async search(@Query('q') query: string, @Query('projectId') projectId?: string) {
    return this.svc.searchByContractNumber(query || '', projectId);
  }

  @Get('contracts')
  async getContracts(@Query('projectId') projectId?: string) {
    return this.svc.getCompletedContractsForPayment(projectId);
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
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.svc.createPayment(req.user.sub, dto.contractorSelectionId, dto.projectId);
  }

  // ====================== STEP DATA ======================

  @Get('step/:stepId/auto-fill')
  async getAutoFill(@Param('stepId') stepId: string) {
    return this.svc.getAutoFillForStep(stepId);
  }

  @Post('step/:stepId/update')
  @Roles(Role.ADMIN)
  async updateStep(@Param('stepId') stepId: string, @Body() dto: UpdateStepDto, @Request() req: any) {
    return this.svc.updateStepData(stepId, dto.data, req.user.sub);
  }

  // ====================== STEP COMPLETION ======================

  @Post('step/:stepId/complete')
  @Roles(Role.ADMIN)
  async completeStep(@Param('stepId') stepId: string, @Request() req: any) {
    return this.svc.completeStep(stepId, req.user.sub);
  }

  @Post('step/:stepId/reopen')
  @Roles(Role.ADMIN)
  async reopenStep(@Param('stepId') stepId: string, @Request() req: any) {
    return this.svc.reopenStep(stepId, req.user.sub);
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
  @Roles(Role.ADMIN)
  async uploadAttachment(
    @Param('stepId') stepId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new Error('No file uploaded');
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const objectName = await this.svc.uploadAttachment(stepId, {
      buffer: file.buffer,
      originalname,
      mimetype: file.mimetype,
    }, req.user.sub);
    const url = await this.svc.getFileUrl(objectName);
    return { objectName, url };
  }

  @Post('step/:stepId/delete-attachment')
  @Roles(Role.ADMIN)
  async deleteAttachment(
    @Param('stepId') stepId: string,
    @Body() body: { path: string },
    @Request() req: any,
  ) {
    await this.svc.deleteAttachment(stepId, body.path, req.user.sub);
    return { success: true };
  }

  // ====================== FILE SERVING ======================

  @Get('file/url')
  async getFileUrl(@Query('path') objectPath: string) {
    const url = await this.svc.getFileUrl(objectPath);
    return { url };
  }
}
