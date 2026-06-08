import {
  Controller, Get, Post, Body, Param, Req, Res, UseGuards,
  UploadedFile, UseInterceptors, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { BidParticipationService } from './bid-participation.service';
import { Response } from 'express';
import * as JSZip from 'jszip';

@Controller('bid-participation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BidParticipationController {
  constructor(private readonly service: BidParticipationService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Req() req: any, @Body() body: { maThongBaoMoiThau: string; tenChuDauTu: string; tenGoiThau?: string }) {
    return this.service.create(req.user.sub, body);
  }

  @Get()
  getAll(@Req() req: any) {
    return this.service.getAll(req.user.sub);
  }

  @Get('my-contracts')
  getMyContracts(@Req() req: any) {
    return this.service.getMyContracts(req.user.sub);
  }

  // Static routes MUST be before parameterized routes
  @Get('file/url')
  getFileUrl(@Query('path') objectPath: string) {
    return this.service.getFileUrl(objectPath);
  }

  @Get('step/:stepId')
  getStep(@Param('stepId') stepId: string) {
    return this.service.getStep(stepId);
  }

  @Get('step/:stepId/download')
  async downloadDocx(@Param('stepId') stepId: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.downloadDocx(stepId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Get(':id/zip-preview')
  async zipPreview(@Param('id') id: string) {
    return this.service.getZipFileList(id);
  }

  @Get(':id/download-zip')
  async downloadZip(@Param('id') id: string, @Res() res: Response) {
    const { files, zipName } = await this.service.getZipFileList(id);
    const zip = new JSZip();
    for (const f of files) {
      try {
        if (f.source === 'generate') {
          const { buffer } = await this.service.downloadDocx(f.stepId);
          zip.file(f.filename, buffer);
        } else if (f.source === 'minio' && f.objectPath) {
          const buffer = await this.service.downloadFile(f.objectPath);
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

  @Post('step/:stepId/update')
  @Roles(Role.ADMIN, Role.HEAD_OF_DEPARTMENT, Role.DIRECTOR)
  updateStep(@Param('stepId') stepId: string, @Body() body: { data: any }) {
    return this.service.updateStep(stepId, body.data);
  }

  @Post('step/:stepId/complete')
  @Roles(Role.ADMIN, Role.HEAD_OF_DEPARTMENT, Role.DIRECTOR)
  completeStep(@Param('stepId') stepId: string) {
    return this.service.completeStep(stepId);
  }

  @Post('step/:stepId/reopen')
  @Roles(Role.ADMIN, Role.HEAD_OF_DEPARTMENT, Role.DIRECTOR)
  reopenStep(@Param('stepId') stepId: string) {
    return this.service.reopenStep(stepId);
  }

  @Post(':id/set-result')
  @Roles(Role.ADMIN)
  setBidResult(@Param('id') id: string, @Body() body: { result: 'WON' | 'LOST' }) {
    return this.service.setBidResult(id, body.result);
  }

  @Post('step/:stepId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @Roles(Role.ADMIN)
  uploadAttachment(@Param('stepId') stepId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadAttachment(stepId, file);
  }

  @Post('step/:stepId/delete-attachment')
  @Roles(Role.ADMIN)
  deleteAttachment(@Param('stepId') stepId: string, @Body() body: { path: string }) {
    return this.service.deleteAttachment(stepId, body.path);
  }

  @Post('step/:stepId/generate-docx')
  generateDocx(@Param('stepId') stepId: string) {
    return this.service.generateDocx(stepId);
  }
}
