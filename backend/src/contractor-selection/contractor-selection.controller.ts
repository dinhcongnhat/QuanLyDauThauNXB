import {
  Controller, Get, Post, Param, Body, Res, UseGuards, Request,
  UseInterceptors, UploadedFile, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IsString, IsNumber, IsObject, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ContractorSelectionService } from './contractor-selection.service';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import * as JSZip from 'jszip';

class CreateSelectionDto {
  @IsString() qdKhlcntId: string;
  @IsNumber() goiThauIndex: number;
  @IsOptional() @IsString() projectId?: string;
}

class UpdateStepDto {
  @IsObject() data: any;
}

class ApprovalDto {
  @IsOptional() @IsString() comment?: string;
}

class UploadDto {
  @IsOptional() @IsString() ghiChu?: string;
}

@Controller('contractor-selection')
@UseGuards(JwtAuthGuard)
export class ContractorSelectionController {
  constructor(private readonly svc: ContractorSelectionService) {}

  // ====================== LIST ENDPOINTS ======================

  /** List all LCNT processes */
  @Get()
  async getAllSelections(@Query('projectId') projectId?: string) {
    return this.svc.getAllSelections(projectId);
  }

  @Get('approved-qd')
  async getApprovedQD(@Query('projectId') projectId?: string) {
    return this.svc.getApprovedQDKHLCNT(projectId);
  }

  @Get('contracts')
  async getCompletedContracts(@Query('projectId') projectId?: string) {
    return this.svc.getCompletedContracts(projectId);
  }

  /** Steps pending approval (for director/head dashboard) */
  @Get('pending-approvals')
  async getPendingApprovals() {
    return this.svc.getPendingApprovals();
  }

  // ====================== CRUD ======================

  @Post()
  async create(@Body() dto: CreateSelectionDto, @Request() req: any) {
    return this.svc.createSelection(req.user.sub, dto.qdKhlcntId, dto.goiThauIndex, dto.projectId);
  }

  @Get(':id')
  async getSelection(@Param('id') id: string) {
    return this.svc.getSelection(id);
  }

  @Get('step/:stepId')
  async getStep(@Param('stepId') stepId: string) {
    return this.svc.getStep(stepId);
  }

  @Get('by-qd/:qdKhlcntId')
  async getByQD(@Param('qdKhlcntId') qdKhlcntId: string, @Query('projectId') projectId?: string) {
    return this.svc.getSelectionsByQD(qdKhlcntId, projectId);
  }

  // ====================== STEP DATA ======================

  /** Get auto-fill data for a step from previous completed steps */
  @Get('step/:stepId/auto-fill')
  async getAutoFill(@Param('stepId') stepId: string) {
    return this.svc.getAutoFillDataForStep(stepId);
  }

  @Post('step/:stepId/update')
  async updateStep(@Param('stepId') stepId: string, @Body() dto: UpdateStepDto, @Request() req: any) {
    return this.svc.updateStepData(stepId, dto.data, req.user.sub);
  }

  // ====================== APPROVAL WORKFLOW ======================

  /** Request approval for a step (trình lên giám đốc/trưởng phòng) */
  @Post('step/:stepId/request-approval')
  async requestApproval(
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalDto,
    @Request() req: any,
  ) {
    return this.svc.requestApproval(stepId, req.user.sub, dto.comment);
  }

  /** Approve a step */
  @Post('step/:stepId/approve')
  async approveStep(
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalDto,
    @Request() req: any,
  ) {
    return this.svc.approveStep(stepId, req.user.sub, req.user.role, dto.comment);
  }

  /** Reject a step */
  @Post('step/:stepId/reject')
  async rejectStep(
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalDto,
    @Request() req: any,
  ) {
    return this.svc.rejectStep(stepId, req.user.sub, req.user.role, dto.comment || '');
  }

  // ====================== STEP COMPLETION ======================

  @Post(':id/set-package-type')
  async setPackageType(
    @Param('id') id: string,
    @Body() body: { contractPackageType: string },
  ) {
    return this.svc.setContractPackageType(id, body.contractPackageType);
  }

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
    const step = await this.svc.getStep(stepId);
    const filename = this.svc.getStepDocFilename(step.stepKey, step.contractorSelection?.tenGoiThau || 'document') + '.docx';
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

  @Get('step/:stepId/download-pdf')
  async downloadStepPdf(@Param('stepId') stepId: string, @Res() res: Response) {
    const step = await this.svc.getStep(stepId);
    const filename = this.svc.getStepDocFilename(step.stepKey, step.contractorSelection?.tenGoiThau || 'document') + '.pdf';
    const docxBuffer = await this.svc.generateStepDocx(stepId);
    const pdfBuffer = convertDocxToPdf(docxBuffer);
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  // ====================== ZIP DOWNLOAD ======================

  /** List all downloadable files for a selection (preview before ZIP download) */
  @Get(':id/zip-preview')
  async zipPreview(@Param('id') id: string) {
    return this.svc.getZipFileList(id);
  }

  /** Download all DOCX files for a selection as ZIP */
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
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new Error('No file uploaded');
    const objectName = await this.svc.uploadAttachment(stepId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      ghiChu: dto.ghiChu,
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

  @Get('file/onlyoffice-config')
  async getOnlyofficeConfig(@Query('path') objectPath: string) {
    return this.svc.getOnlyofficeConfigForFile(objectPath);
  }

  @Public()
  @Get('file/download-public')
  async downloadPublic(@Query('token') token: string, @Res() res: Response) {
    const objectPath = this.svc.verifyFileDownloadToken(token);
    const buffer = await this.svc.downloadFile(objectPath);
    const filename = objectPath.split('/').pop() || 'file';
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const mimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    res.set({
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
