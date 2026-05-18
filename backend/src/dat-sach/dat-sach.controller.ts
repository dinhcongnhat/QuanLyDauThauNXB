import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DatSachService } from './dat-sach.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';
const AdmZip = require('adm-zip');

// ─── Template-based DOCX Generator (inline) ──────────────────────────────────────

function replacePlaceholdersInXML(content: string, replacements: Record<string, string>) {
  return content.replace(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g, (runMatch, runContent) => {
    const textPieces: string[] = [];
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(runContent)) !== null) {
      textPieces.push(tMatch[1]);
    }
    if (textPieces.length === 0) return runMatch;
    const combinedText = textPieces.join('');
    const hasPlaceholder = Object.keys(replacements).some(key => combinedText.includes('{{' + key + '}}'));
    if (!hasPlaceholder) return runMatch;
    let newText = combinedText;
    for (const key of Object.keys(replacements)) {
      const val = String(replacements[key]);
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newText = newText.replace(new RegExp('\\{\\{' + escaped + '\\}\\}', 'g'), val);
      newText = newText.replace(new RegExp('\\}\\}\\s*\\{\\{' + escaped + '\\}\\}', 'g'), val);
    }
    if (newText === combinedText) return runMatch;
    const rPrMatch = runContent.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '';
    const xmlEscaped = newText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscaped}</w:t></w:r>`;
  });
}

function generateFromTemplate(templatePath: string, replacements: Record<string, string>): Buffer {
  const zip = new AdmZip(templatePath);
  const zipEntries = zip.getEntries();
  let docContent = '';
  for (const entry of zipEntries) {
    if (entry.entryName === 'word/document.xml') {
      docContent = entry.getData().toString('utf8');
    }
  }
  if (!docContent) throw new Error('word/document.xml not found in template: ' + templatePath);
  const newDocContent = replacePlaceholdersInXML(docContent, replacements);
  zip.updateFile('word/document.xml', Buffer.from(newDocContent, 'utf8'));
  return zip.toBuffer();
}

// ─── Controller ───────────────────────────────────────────────────────────────────

@Controller('dat-sach')
@UseGuards(JwtAuthGuard)
export class DatSachController {
  constructor(
    private readonly datSachService: DatSachService,
    private readonly jwtService: JwtService,
  ) {}

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
    @Body() body: { parentId?: string; tenDuAn: string; procurementType: string; projectId?: string },
    @Request() req: any,
  ) {
    return this.datSachService.createProject(
      body.parentId || 'project-based',
      body.tenDuAn,
      body.procurementType as any,
      req.user.userId,
      body.projectId,
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

    const data: any = { ...(gdn.data as object), assignments: gdn.assignments };
    const totalSL = (data.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/giay_de_nghi_in.docx');
    const replacements: Record<string, string> = {
      TenSach: data.tenSach || data.TenSach || '',
      TacGia: data.tacGia || data.TacGia || '',
      BBT: data.bbt || data.BBT || '',
      NamXB: data.namXB || data.NamXB || '',
      SoTrang: data.soTrang || data.SoTrang || '',
      KhoSach: data.khoSach || data.KhoSach || '',
      GiaBia: data.giaBia || data.GiaBia || '',
      SoLuongTon: data.soLuongTon || data.SoLuongTon || '',
      SLDeNghiIn: totalSL ? String(totalSL) : (data.slDeNghiIn || data.SLDeNghiIn || ''),
      ThoiGianCanSach: data.thoiGianCanSach || data.ThoiGianCanSach || '',
      DeNghiNoiIn: data.deNghiNoiIn || data.DeNghiNoiIn || '',
      GhiChu: data.ghiChu || data.GhiChu || '',
      'VuKH-TKBT': data.vuKHTKBT || data.VuKHTKBT || '',
      BanBienTap: data.banBienTap || data.BanBienTap || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
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

    const data: any = pcdi.data as object;
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/phieu_chi_dinh_co_so_in.docx');
    const replacements: Record<string, string> = {
      BBT: data.bbt || data.BBT || '',
      PhuongThuc: data.phuongThuc || data.PhuongThuc || '',
      TenSach: data.tenSach || data.TenSach || '',
      TacGia: data.tacGia || data.TacGia || '',
      SoTrang: data.soTrang || data.SoTrang || '',
      KhoSach: data.khoSach || data.KhoSach || '',
      SoLuongIn: data.soLuongIn || data.SoLuongIn || '',
      GiaTriHopDong: data.giaTriHopDong || data.GiaTriHopDong || '',
      CoSoIn: data.coSoIn || data.CoSoIn || '',
      ThongSoKyThuat: data.thongSoKyThuat || data.ThongSoKyThuat || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    const filename = `PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`;

    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  @Patch('project/:id/qd')
  async saveQdData(@Param('id') id: string, @Body() body: { qdData: any }) {
    return this.datSachService.saveQdData(id, body.qdData);
  }

  @Post('project/:id/approve-qd')
  async approveQD(@Param('id') id: string) {
    return this.datSachService.approveQD(id);
  }

  @Get('project/:id/download-qd')
  async downloadQD(@Param('id') id: string, @Request() req: any) {
    const project = await this.datSachService.getProjectForGenerate(id);
    const pcdi = project.pcdiDocuments[0];
    // Merge pcdi data and qd data — qdData may contain merged pcdi fields
    const qdData: any = project.qdData as object || {};
    const pcdiData: any = pcdi ? (pcdi.data as object) : {};
    // Prefer qdData for shared fields, fallback to pcdiData
    const templateData = { ...pcdiData, ...qdData };
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/quyet_dinh.docx');
    const replacements: Record<string, string> = {
      TacGia: templateData.tacGia || templateData.TacGia || '',
      NgonNgu: templateData.ngonNgu || templateData.NgonNgu || '',
      khuonKho: templateData.khuonKho || templateData.KhuonKho || '',
      SoTrangCuaXuatBanPhamIn: templateData.soTrangCuaXuatBanPhamIn || templateData.SoTrangCuaXuatBanPhamIn || templateData.soTrang || templateData.SoTrang || '',
      SoLuongIn: templateData.soLuongIn || templateData.SoLuongIn || '',
      DoiTacLienKetXuatBan: templateData.doiTacLienKet || templateData.doiTacLienKetXuatBan || '',
      TenBienTapVien: templateData.tenBienTapVien || templateData.TenBienTapVien || '',
      CoSoIn: templateData.coSoIn || templateData.CoSoIn || '',
      'MaSoCachTieuChuanQuocTe - ISBN': templateData.isbn || templateData.ISBN || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    const filename = `QuyetDinhDatSach_${project.tenDuAn.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  // ─── My Assignments ─────────────────────────────────────────

  @Get('my-assignments')
  async getMyAssignments(@Request() req: any) {
    return this.datSachService.getMyAssignments(req.user.userId);
  }

  // ─── OnlyOffice Config ──────────────────────────────────────
  @Get('gdn/:id/onlyoffice-config')
  async getOnlyofficeConfigForGdn(@Param('id') id: string) {
    return this.datSachService.getOnlyofficeConfigForGdn(id);
  }

  @Get('pcdi/:id/onlyoffice-config')
  async getOnlyofficeConfigForPcdi(@Param('id') id: string) {
    return this.datSachService.getOnlyofficeConfigForPcdi(id);
  }

  @Get('project/:id/onlyoffice-config')
  async getOnlyofficeConfigForQD(@Param('id') id: string) {
    return this.datSachService.getOnlyofficeConfigForQD(id);
  }

  // ─── Public Download (for OnlyOffice) ────────────────────────
  @Get('gdn/:id/download-public')
  async downloadGDNPublic(@Param('id') id: string, @Query('token') token: string, @Request() req: any) {
    this.datSachService['prisma'].$transaction;
    const AdmZip = require('adm-zip');
    try {
      const payload = this.jwtService.verify(token);
      if (payload.gdnId !== id || payload.purpose !== 'download') {
        throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ');
      }
    } catch {
      throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ hoặc đã hết hạn');
    }

    const gdn = await this.datSachService['prisma'].gDNInSach.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!gdn) throw new (require('@nestjs/common').NotFoundException)('Không tìm thấy GDN');

    const data: any = { ...(gdn.data as object), assignments: gdn.assignments };
    const totalSL = (data.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/giay_de_nghi_in.docx');
    const replacements: Record<string, string> = {
      TenSach: data.tenSach || data.TenSach || '',
      TacGia: data.tacGia || data.TacGia || '',
      BBT: data.bbt || data.BBT || '',
      NamXB: data.namXB || data.NamXB || '',
      SoTrang: data.soTrang || data.SoTrang || '',
      KhoSach: data.khoSach || data.KhoSach || '',
      GiaBia: data.giaBia || data.GiaBia || '',
      SoLuongTon: data.soLuongTon || data.SoLuongTon || '',
      SLDeNghiIn: totalSL ? String(totalSL) : (data.slDeNghiIn || data.SLDeNghiIn || ''),
      ThoiGianCanSach: data.thoiGianCanSach || data.ThoiGianCanSach || '',
      DeNghiNoiIn: data.deNghiNoiIn || data.DeNghiNoiIn || '',
      GhiChu: data.ghiChu || data.GhiChu || '',
      'VuKH-TKBT': data.vuKHTKBT || data.VuKHTKBT || '',
      BanBienTap: data.banBienTap || data.BanBienTap || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''GiayDeNghiIn_${gdn.id.slice(0, 8)}.docx`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  @Get('pcdi/:id/download-public')
  async downloadPCDIPublic(@Param('id') id: string, @Query('token') token: string, @Request() req: any) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.pcdiId !== id || payload.purpose !== 'download') {
        throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ');
      }
    } catch {
      throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ hoặc đã hết hạn');
    }

    const pcdi = await this.datSachService['prisma'].pCDICoSoIn.findUnique({ where: { id } });
    if (!pcdi) throw new (require('@nestjs/common').NotFoundException)('Không tìm thấy PCDI');

    const data: any = pcdi.data as object;
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/phieu_chi_dinh_co_so_in.docx');
    const replacements: Record<string, string> = {
      BBT: data.bbt || data.BBT || '',
      PhuongThuc: data.phuongThuc || data.PhuongThuc || '',
      TenSach: data.tenSach || data.TenSach || '',
      TacGia: data.tacGia || data.TacGia || '',
      SoTrang: data.soTrang || data.SoTrang || '',
      KhoSach: data.khoSach || data.KhoSach || '',
      SoLuongIn: data.soLuongIn || data.SoLuongIn || '',
      GiaTriHopDong: data.giaTriHopDong || data.GiaTriHopDong || '',
      CoSoIn: data.coSoIn || data.CoSoIn || '',
      ThongSoKyThuat: data.thongSoKyThuat || data.ThongSoKyThuat || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  @Get('project/:id/download-qd-public')
  async downloadQDPublic(@Param('id') id: string, @Query('token') token: string, @Request() req: any) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.projectId !== id || payload.purpose !== 'download') {
        throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ');
      }
    } catch {
      throw new (require('@nestjs/common').ForbiddenException)('Token không hợp lệ hoặc đã hết hạn');
    }

    const project = await this.datSachService.getProjectForGenerate(id);
    const pcdi = project.pcdiDocuments[0];
    const qdData: any = project.qdData as object || {};
    const pcdiData: any = pcdi ? (pcdi.data as object) : {};
    const templateData = { ...pcdiData, ...qdData };
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/quyet_dinh.docx');
    const replacements: Record<string, string> = {
      TacGia: templateData.tacGia || templateData.TacGia || '',
      NgonNgu: templateData.ngonNgu || templateData.NgonNgu || '',
      khuonKho: templateData.khuonKho || templateData.KhuonKho || '',
      SoTrangCuaXuatBanPhamIn: templateData.soTrangCuaXuatBanPhamIn || templateData.SoTrangCuaXuatBanPhamIn || templateData.soTrang || templateData.SoTrang || '',
      SoLuongIn: templateData.soLuongIn || templateData.SoLuongIn || '',
      DoiTacLienKetXuatBan: templateData.doiTacLienKet || templateData.doiTacLienKetXuatBan || '',
      TenBienTapVien: templateData.tenBienTapVien || templateData.TenBienTapVien || '',
      CoSoIn: templateData.coSoIn || templateData.CoSoIn || '',
      'MaSoCachTieuChuanQuocTe - ISBN': templateData.isbn || templateData.ISBN || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''QuyetDinhDatSach_${project.tenDuAn.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }

  // ─── Auto-fill Endpoints ───────────────────────────────────

  @Get('project/:projectId/auto-fill/pcdi')
  async getAutoFillForPCDI(@Param('projectId') projectId: string) {
    const data = await this.datSachService.getAutoFillForPCDI(projectId);
    if (!data) {
      throw new (require('@nestjs/common').BadRequestException)(
        'Cần hoàn thành và duyệt GDN trước khi auto-fill PCDI',
      );
    }
    return data;
  }

  @Get('project/:projectId/auto-fill/dutoan')
  async getAutoFillForDutoan(@Param('projectId') projectId: string) {
    const data = await this.datSachService.getAutoFillForDutoan(projectId);
    if (!data) {
      throw new (require('@nestjs/common').BadRequestException)(
        'Cần hoàn thành và duyệt GDN trước khi auto-fill Dự toán',
      );
    }
    return data;
  }

  @Get('project/:projectId/auto-fill/khlcnt')
  async getAutoFillForKHLcnt(@Param('projectId') projectId: string) {
    return this.datSachService.getAutoFillForKHLcnt(projectId);
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

    const gdnData: any = { ...(gdn.data as object), assignments: gdn.assignments };
    const pcdiData: any = pcdi.data as object;
    const templatePath = path.resolve(process.env.FILEMAU_PATH || '/app/FileMau', 'DatSach/quyet_dinh.docx');
    const replacements: Record<string, string> = {
      TacGia: pcdiData.tacGia || pcdiData.TacGia || '',
      NgonNgu: pcdiData.ngonNgu || pcdiData.NgonNgu || '',
      khuonKho: pcdiData.khuonKho || pcdiData.KhuonKho || '',
      SoTrangCuaXuatBanPhamIn: pcdiData.soTrangCuaXuatBanPhamIn || pcdiData.SoTrangCuaXuatBanPhamIn || pcdiData.soTrang || pcdiData.SoTrang || '',
      SoLuongIn: pcdiData.soLuongIn || pcdiData.SoLuongIn || '',
      DoiTacLienKetXuatBan: pcdiData.doiTacLienKet || pcdiData.doiTacLienKetXuatBan || '',
      TenBienTapVien: pcdiData.tenBienTapVien || pcdiData.TenBienTapVien || '',
      CoSoIn: pcdiData.coSoIn || pcdiData.CoSoIn || '',
      'MaSoCachTieuChuanQuocTe - ISBN': pcdiData.isbn || pcdiData.maSoISBN || '',
    };
    const buffer = generateFromTemplate(templatePath, replacements);
    const filename = `QuyetDinhDatSach_${project.tenDuAn.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    req.res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    req.res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    req.res.end(buffer);
  }
}
