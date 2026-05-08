import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DatSachService } from './dat-sach.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { generateGDNInSachDocx, generatePCDICoSoInDocx, generateQuyetDinhDatSachDocx } from '../documents/datsach-docx-generator';

@Controller('dat-sach')
@UseGuards(JwtAuthGuard)
export class DatSachController {
  constructor(private readonly datSachService: DatSachService) {}

  // ─── Projects ───────────────────────────────────────────────

  @Get('projects')
  async getProjects(@Query('parentId') parentId: string) {
    return this.datSachService.getProjectsByParent(parentId);
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string) {
    return this.datSachService.getProject(id);
  }

  @Post('projects')
  async createProject(
    @Body() body: { parentId: string; tenDuAn: string; procurementType: string },
    @Request() req: any,
  ) {
    return this.datSachService.createProject(
      body.parentId,
      body.tenDuAn,
      body.procurementType as any,
      req.user.userId,
    );
  }

  @Patch('projects/:id/complete')
  async markCompleted(@Param('id') id: string) {
    return this.datSachService.markProjectCompleted(id);
  }

  // ─── GDN In Sách ───────────────────────────────────────────

  @Post('gdn')
  async createGDN(
    @Body() body: { projectId: string; data: any },
    @Request() req: any,
  ) {
    return this.datSachService.createGDNInSach(body.projectId, body.data, req.user.userId);
  }

  @Patch('gdn/:id')
  async updateGDN(
    @Param('id') id: string,
    @Body() body: { data: any },
  ) {
    return this.datSachService.updateGDNInSach(id, body.data);
  }

  @Post('gdn/:id/assign')
  async assignUsers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any,
  ) {
    return this.datSachService.assignUsersForSL(id, body.userIds, req.user.userId);
  }

  @Patch('gdn/:id/fill-sl')
  async fillSL(
    @Param('id') id: string,
    @Body() body: { userId: string; soLuong: number },
  ) {
    return this.datSachService.fillSL(id, body.userId, body.soLuong);
  }

  @Post('gdn/:id/approve')
  async approveGDN(@Param('id') id: string) {
    return this.datSachService.approveGDN(id);
  }

  @Get('gdn/:id/download')
  async downloadGDN(@Param('id') id: string, @Request() req: any) {
    const gdn = await this.datSachService['prisma'].gDNInSach.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!gdn) throw new (require('@nestjs/common').NotFoundException)('Không tìm thấy GDN');

    const data = { ...(gdn.data as object), assignments: gdn.assignments };
    const buffer = await generateGDNInSachDocx(data);
    const filename = `GiayDeNghiIn_${gdn.id.slice(0, 8)}.docx`;

    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  // ─── PCDI Cơ Sở In ─────────────────────────────────────────

  @Post('pcdi')
  async createPCDI(
    @Body() body: { projectId: string; data: any },
    @Request() req: any,
  ) {
    return this.datSachService.createPCDI(body.projectId, body.data, req.user.userId);
  }

  @Patch('pcdi/:id')
  async updatePCDI(
    @Param('id') id: string,
    @Body() body: { data: any },
  ) {
    return this.datSachService.updatePCDI(id, body.data);
  }

  @Post('pcdi/:id/approve')
  async approvePCDI(@Param('id') id: string) {
    return this.datSachService.approvePCDI(id);
  }

  @Get('pcdi/:id/download')
  async downloadPCDI(@Param('id') id: string, @Request() req: any) {
    const pcdi = await this.datSachService['prisma'].pCDICoSoIn.findUnique({ where: { id } });
    if (!pcdi) throw new (require('@nestjs/common').NotFoundException)('Không tìm thấy PCDI');

    const buffer = await generatePCDICoSoInDocx(pcdi.data);
    const filename = `PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`;

    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  // ─── My Assignments ─────────────────────────────────────────

  @Get('my-assignments')
  async getMyAssignments(@Request() req: any) {
    return this.datSachService.getMyAssignments(req.user.userId);
  }

  // ─── Generate Quyết Định ───────────────────────────────────

  @Get('project/:id/generate')
  async generateQuyetDinh(@Param('id') id: string, @Request() req: any) {
    const project = await this.datSachService.getProjectForGenerate(id);
    const gdn = project.gdnDocuments[0];
    const pcdi = project.pcdiDocuments[0];
    if (!gdn || !pcdi) {
      throw new (require('@nestjs/common').BadRequestException)(
        'Cần hoàn thành GDN và PCDI trước khi generate Quyết định',
      );
    }

    const buffer = await generateQuyetDinhDatSachDocx(
      { ...(gdn.data as object), assignments: gdn.assignments },
      pcdi.data,
    );
    const filename = `QuyetDinhDatSach_${project.tenDuAn.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.end(buffer);
  }
}
