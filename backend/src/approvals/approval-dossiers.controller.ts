import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ApprovalDossiersService } from './approval-dossiers.service';
import {
  CreateApprovalDossierDto,
  DossierDecisionDto,
  DossierTransitionDto,
  RejectDossierDto,
  UpdateDossierItemDto,
} from './dto/approval-dossier.dto';

@Controller('approval-dossiers')
@UseGuards(JwtAuthGuard)
export class ApprovalDossiersController {
  constructor(private readonly dossiers: ApprovalDossiersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateApprovalDossierDto) {
    return this.dossiers.create(req.user.sub, dto);
  }

  @Get()
  listAssigned(@Request() req: any) {
    return this.dossiers.listAssigned(req.user.sub);
  }

  @Get(':id')
  getOne(@Request() req: any, @Param('id') id: string) {
    return this.dossiers.getOne(id, req.user.sub);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDossierItemDto,
  ) {
    return this.dossiers.updateItem(id, itemId, req.user.sub, dto);
  }

  @Post(':id/items/:itemId/file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadItemFile(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('expectedVersion') expectedVersionValue: string,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp DOCX');
    const expectedVersion = Number.parseInt(expectedVersionValue, 10);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('expectedVersion không hợp lệ');
    }
    return this.dossiers.uploadItemFile(
      id,
      itemId,
      req.user.sub,
      expectedVersion,
      file,
    );
  }

  @Get(':id/items/:itemId/preview-pdf')
  async previewPdf(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.dossiers.getPreviewPdf(
      id,
      itemId,
      req.user.sub,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="dossier-preview.pdf"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Get(':id/items/:itemId/download')
  async downloadItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.dossiers.getItemDocx(
      id,
      itemId,
      req.user.sub,
    );
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="dossier-item.docx"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Get(':id/items/:itemId/onlyoffice-config')
  getOnlyOfficeConfig(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.dossiers.getOnlyOfficeConfig(id, itemId, req.user.sub);
  }

  @Public()
  @Get(':id/items/:itemId/content')
  async getItemContent(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const buffer = await this.dossiers.getItemContent(id, itemId, token);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'inline; filename="dossier-item.docx"',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(buffer);
  }

  @Public()
  @Post(':id/items/:itemId/onlyoffice-callback')
  onlyOfficeCallback(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query('token') token: string,
    @Body() body: any,
  ) {
    return this.dossiers.handleOnlyOfficeCallback(id, itemId, token, body);
  }

  @Post(':id/submit')
  submit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DossierTransitionDto,
  ) {
    return this.dossiers.submit(id, req.user.sub, dto);
  }

  @Post(':id/resubmit')
  resubmit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DossierTransitionDto,
  ) {
    return this.dossiers.resubmit(id, req.user.sub, dto);
  }

  @Post(':id/return')
  returnToPreviousSender(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DossierDecisionDto,
  ) {
    return this.dossiers.returnToPreviousSender(id, req.user.sub, dto);
  }
}

@Controller('approval-requests')
@UseGuards(JwtAuthGuard)
export class ApprovalRequestDossierController {
  constructor(private readonly dossiers: ApprovalDossiersService) {}

  @Post(':id/forward')
  forward(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DossierTransitionDto,
  ) {
    return this.dossiers.forward(id, req.user.sub, dto);
  }

  @Post(':id/final-approve')
  finalApprove(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DossierDecisionDto,
  ) {
    return this.dossiers.finalApprove(id, req.user.sub, dto);
  }

  @Post(':id/reject')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectDossierDto,
  ) {
    return this.dossiers.reject(id, req.user.sub, dto);
  }
}
