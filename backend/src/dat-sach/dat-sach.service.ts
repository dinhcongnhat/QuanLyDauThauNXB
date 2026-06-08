import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementType, NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DatSachService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private jwtService: JwtService,
  ) {}

  async createProject(
    parentId: string,
    tenDuAn: string,
    procurementType: ProcurementType,
    createdBy: string,
    projectId?: string,
  ) {
    return this.prisma.datSachProject.create({
      data: {
        parentId,
        tenDuAn,
        procurementType,
        creator: { connect: { id: createdBy } },
        ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async getProject(id: string) {
    const project = await this.prisma.datSachProject.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        gdnDocuments: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignments: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        pcdiDocuments: {
          include: { creator: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }

  async getProjectsByParent(parentId: string) {
    return this.prisma.datSachProject.findMany({
      where: { parentId },
      include: {
        creator: { select: { id: true, name: true, email: true, role: true } },
        gdnDocuments: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignments: true,
          },
        },
        pcdiDocuments: {
          include: { creator: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── GDN In Sách ────────────────────────────────────────────

  async createGDNInSach(projectId: string, data: any, createdBy: string) {
    const project = await this.prisma.datSachProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.gDNInSach.create({
      data: { datSachProjectId: projectId, data, createdBy, status: 'DRAFT' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async updateGDNInSach(id: string, data: any) {
    const existing = await this.prisma.gDNInSach.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy GDN');
    return this.prisma.gDNInSach.update({
      where: { id },
      data: { data: { ...(existing.data as object), ...data } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async assignUsersForSL(gdnId: string, userIds: string[], assignedBy: string) {
    const existing = await this.prisma.gDNInSach.findUnique({ where: { id: gdnId } });
    if (!existing) throw new NotFoundException('Không tìm thấy GDN');

    await this.prisma.gDNAssignment.deleteMany({ where: { gdnInSachId: gdnId } });

    const assignments = await Promise.all(
      userIds.map((userId) =>
        this.prisma.gDNAssignment.create({
          data: { gdnInSachId: gdnId, userId, assignedBy },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      ),
    );

    await this.prisma.gDNInSach.update({
      where: { id: gdnId },
      data: { status: 'ASSIGNED' },
    });

    // Notify assigned users
    const project = await this.prisma.datSachProject.findUnique({
      where: { id: existing.datSachProjectId },
    });
    await Promise.all(
      userIds.map((userId) =>
        this.notificationService.create(userId, {
          type: NotificationType.ASSIGNMENT,
          title: 'Bạn được giao nhập số lượng',
          message: `Bạn được giao nhập số lượng cho dự án "${project?.tenDuAn || ''}". Vui lòng kiểm tra và nhập số lượng.`,
          link: '/dashboard/mua-sam/sach/dat-sach',
        }),
      ),
    );

    return assignments;
  }

  async fillSL(gdnId: string, userId: string, soLuong: number) {
    // Validate user is assigned to this GDN
    const assignment = await this.prisma.gDNAssignment.findUnique({
      where: { gdnInSachId_userId: { gdnInSachId: gdnId, userId } },
    });
    if (!assignment) throw new ForbiddenException('Bạn không được giao nhiệm vụ nhập số lượng cho GDN này');

    // Validate GDN is not yet approved
    const gdn = await this.prisma.gDNInSach.findUnique({ where: { id: gdnId } });
    if (gdn?.status === 'APPROVED') {
      throw new BadRequestException('GDN đã được phê duyệt, không thể thay đổi số lượng');
    }

    return this.prisma.gDNAssignment.update({
      where: { gdnInSachId_userId: { gdnInSachId: gdnId, userId } },
      data: {
        soLuong,
        completedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async getMyAssignments(userId: string) {
    const assignments = await this.prisma.gDNAssignment.findMany({
      where: { userId },
      include: {
        gdnInSach: {
          include: {
            datSachProject: {
              include: { creator: { select: { id: true, name: true, email: true } } },
            },
            creator: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    return assignments;
  }

  async approveGDN(gdnId: string) {
    const gdn = await this.prisma.gDNInSach.findUnique({
      where: { id: gdnId },
      include: { assignments: true },
    });
    if (!gdn) throw new NotFoundException('Không tìm thấy GDN');
    const updated = await this.prisma.gDNInSach.update({
      where: { id: gdnId },
      data: { status: 'APPROVED' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    await this.notificationService.create(updated.createdBy, {
      type: NotificationType.GDN_APPROVED,
      title: 'GDN đã được phê duyệt',
      message: `Phiếu giao nhận sách (GDN) của bạn đã được phê duyệt.`,
      link: '/dashboard/mua-sam/sach/dat-sach',
    });

    return updated;
  }

  // ─── PCDI Cơ Sở In ─────────────────────────────────────────

  async createPCDI(projectId: string, data: any, createdBy: string) {
    const project = await this.prisma.datSachProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return this.prisma.pCDICoSoIn.create({
      data: { datSachProjectId: projectId, data, createdBy, status: 'DRAFT' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updatePCDI(id: string, data: any) {
    const existing = await this.prisma.pCDICoSoIn.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy PCDI');
    return this.prisma.pCDICoSoIn.update({
      where: { id },
      data: { data: { ...(existing.data as object), ...data } },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async approvePCDI(pcdiId: string) {
    const pcdi = await this.prisma.pCDICoSoIn.findUnique({ where: { id: pcdiId } });
    if (!pcdi) throw new NotFoundException('Không tìm thấy PCDI');
    const updated = await this.prisma.pCDICoSoIn.update({
      where: { id: pcdiId },
      data: { status: 'APPROVED' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await this.notificationService.create(updated.createdBy, {
      type: NotificationType.PCDI_APPROVED,
      title: 'PCDI đã được phê duyệt',
      message: `Phiếu đề nghị cơ sở in (PCDI) của bạn đã được phê duyệt.`,
      link: '/dashboard/mua-sam/sach/dat-sach',
    });

    return updated;
  }

  async markProjectCompleted(projectId: string) {
    const updated = await this.prisma.datSachProject.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });
    // Notify all project stakeholders
    const project = await this.prisma.datSachProject.findUnique({
      where: { id: projectId },
      include: { gdnDocuments: true, pcdiDocuments: true },
    });
    if (project) {
      const userIds = [
        project.createdBy,
        ...project.gdnDocuments.map((g: any) => g.createdBy),
        ...project.pcdiDocuments.map((p: any) => p.createdBy),
      ].filter((v, i, a) => a.indexOf(v) === i);
      await Promise.all(
        userIds.map((uid) =>
          this.notificationService.create(uid, {
            type: NotificationType.PROJECT_COMPLETED,
            title: 'Dự án đặt sách đã hoàn thành',
            message: `Dự án "${project.tenDuAn}" đã được đánh dấu hoàn thành.`,
            link: '/dashboard/mua-sam/sach/dat-sach',
          }),
        ),
      );
    }
    return updated;
  }

  async saveQdData(projectId: string, qdData: any) {
    return this.prisma.datSachProject.update({
      where: { id: projectId },
      data: { qdData },
    });
  }

  async approveQD(projectId: string) {
    const project = await this.prisma.datSachProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    const updated = await this.prisma.datSachProject.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });

    await this.notificationService.create(project.createdBy, {
      type: NotificationType.QD_APPROVED,
      title: 'Quyết định đặt sách đã được phê duyệt',
      message: `Quyết định đặt sách cho dự án "${project.tenDuAn}" đã được phê duyệt.`,
      link: '/dashboard/mua-sam/sach/dat-sach',
    });

    return updated;
  }

  // ─── Auto-fill Data ────────────────────────────────────────
  /**
   * Lấy dữ liệu GDN đã duyệt để auto-fill cho PCDI.
   * Các trường trùng: BBT, TenSach, TacGia, SoTrang, KhoSach
   */
  async getAutoFillForPCDI(projectId: string) {
    const gdn = await this.prisma.gDNInSach.findFirst({
      where: {
        datSachProjectId: projectId,
        status: 'APPROVED',
      },
      include: { assignments: true },
    });
    if (!gdn) return null;

    // Check that all assignments have been filled
    const unfilledAssignments = gdn.assignments.filter(a => !a.soLuong || a.soLuong <= 0);
    if (unfilledAssignments.length > 0) {
      throw new BadRequestException(
        `Còn ${unfilledAssignments.length} user(s) chưa nhập số lượng. Cần hoàn thành tất cả assignment trước khi auto-fill PCDI.`,
      );
    }

    const d: any = gdn.data as object;
    const totalSL = (gdn.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
    return {
      // GDN fields mapped to PCDI placeholders
      BBT: d.bbt || d.BBT || '',
      TenSach: d.tenSach || d.TenSach || '',
      TacGia: d.tacGia || d.TacGia || '',
      SoTrang: d.soTrang || d.SoTrang || '',
      KhoSach: d.khoSach || d.KhoSach || '',
      GiaBia: d.giaBia || d.GiaBia || '',
      SoLuongIn: totalSL ? String(totalSL) : (d.slDeNghiIn || d.SLDeNghiIn || ''),
      SoLuongTon: d.soLuongTon || d.SoLuongTon || '',
      ThoiGianCanSach: d.thoiGianCanSach || d.ThoiGianCanSach || '',
      DeNghiNoiIn: d.deNghiNoiIn || d.DeNghiNoiIn || '',
      // GDN source reference
      gdnId: gdn.id,
      gdnStatus: gdn.status,
    };
  }

  /**
   * Lấy dữ liệu GDN + PCDI đã duyệt để auto-fill cho Dự toán.
   * Các trường trùng: TenSach, TacGia, nguonVon, giaTri...
   */
  async getAutoFillForDutoan(projectId: string) {
    const gdn = await this.prisma.gDNInSach.findFirst({
      where: {
        datSachProjectId: projectId,
        status: 'APPROVED',
      },
      include: { assignments: true },
    });
    const pcdi = await this.prisma.pCDICoSoIn.findFirst({
      where: {
        datSachProjectId: projectId,
        status: 'APPROVED',
      },
    });
    if (!gdn) return null;
    const gd: any = gdn.data as object;
    const pd: any = pcdi ? (pcdi.data as object) : {};
    const totalSL = (gdn.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
    // Dự toán fields: TenDuAn, TenGoiThau, ChuDauTu, NguonVon, giaTriDuToanDuyet, etc.
    return {
      TenDuAn: gd.tenDuAn || gd.TenDuAn || '',
      TenGoiThau: gd.tenSach || gd.TenSach || '',
      ChuDauTu: 'Nhà xuất bản Chính trị Quốc gia Sự thật',
      NguonVon: pd.nguonVon || pd.NguonVon || 'Ngân sách nhà nước',
      DiaDiemThucHien: pd.diaDiem || pd.DiaDiem || 'Hà Nội',
      // Giá trị từ PCDI nếu có
      giaTriDuToanDuyet: pd.giaTriHopDong || pd.GiaTriHopDong || '',
      GiaTriHopDong: pd.giaTriHopDong || pd.GiaTriHopDong || '',
      CoSoIn: pd.coSoIn || pd.CoSoIn || '',
      PhuongThuc: pd.phuongThuc || pd.PhuongThuc || '',
      // GDN info
      TenSach: gd.tenSach || gd.TenSach || '',
      TacGia: gd.tacGia || gd.TacGia || '',
      BBT: gd.bbt || gd.BBT || '',
      SoLuongIn: totalSL ? String(totalSL) : '',
      // QĐ fields from PCDI
      NgonNgu: pd.ngonNgu || pd.NgonNgu || '',
      khuonKho: pd.khuonKho || pd.KhuonKho || '',
      SoTrangCuaXuatBanPhamIn: pd.soTrangCuaXuatBanPhamIn || pd.SoTrangCuaXuatBanPhamIn || '',
      doiTacLienKet: pd.doiTacLienKet || pd.doiTacLienKetXuatBan || '',
      TenBienTapVien: pd.tenBienTapVien || pd.TenBienTapVien || '',
      isbn: pd.isbn || pd.ISBN || '',
      // Source references
      gdnId: gdn.id,
      gdnStatus: gdn.status,
      pcdiId: pcdi?.id || null,
      pcdiStatus: pcdi?.status || null,
    };
  }

  /**
   * Lấy tất cả dữ liệu từ GDN + PCDI + Dự toán để auto-fill cho KHLCNT.
   */
  async getAutoFillForKHLcnt(projectId: string) {
    const dutoan = await this.prisma.document.findFirst({
      where: {
        projectId,
        type: 'QD_DUTOAN',
        status: 'APPROVED',
      },
    });
    const duToanData: any = dutoan ? (dutoan.data as object) : {};
    const autoFill = await this.getAutoFillForDutoan(projectId);
    return {
      // QD_DUTOAN fields → KHLCNT fields
      tenDuAn: duToanData.tenDuAn || duToanData.TenDuAn || autoFill?.TenDuAn || '',
      chuDauTu: duToanData.chuDauTu || duToanData.ChuDauTu || autoFill?.ChuDauTu || '',
      tongMucDauTu: duToanData.giaTriDuToanDuyet || duToanData.giaTriDuToan || autoFill?.giaTriDuToanDuyet || 0,
      nguonVon: duToanData.nguonVon || duToanData.NguonVon || autoFill?.NguonVon || '',
      diaDiem: duToanData.diaDiemThucHien || duToanData.DiaDiemThucHien || autoFill?.DiaDiemThucHien || '',
      thoiGianThucHien: duToanData.thoiGianThucHien || duToanData.ThoiGianThucHien || '',
      // Từ GDN/PCDI
      tenGoiThau: autoFill?.TenSach || '',
      tacGia: autoFill?.TacGia || '',
      nguonVonKHLcnt: duToanData.nguonVon || duToanData.NguonVon || '',
      // Source refs
      qdDutoanId: dutoan?.id || null,
      qdDutoanStatus: dutoan?.status || null,
      gdnId: autoFill?.gdnId || null,
      pcdiId: autoFill?.pcdiId || null,
    };
  }

  // ─── Generate Quyết Định ────────────────────────────────────
  async getProjectForGenerate(projectId: string) {
    const project = await this.prisma.datSachProject.findUnique({
      where: { id: projectId },
      include: {
        gdnDocuments: {
          where: { status: 'APPROVED' },
          include: {
            assignments: true,
          },
        },
        pcdiDocuments: {
          where: { status: 'APPROVED' },
        },
      },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');
    return project;
  }

  // ─── OnlyOffice Preview ───────────────────────────────────
  async getOnlyofficeConfigForGdn(gdnId: string) {
    const gdn = await this.prisma.gDNInSach.findUnique({
      where: { id: gdnId },
      include: { assignments: true },
    });
    if (!gdn) throw new NotFoundException('Không tìm thấy GDN');

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'https://jtsconlyoffice.duckdns.org';
    const onlyofficeSecret = process.env.ONLYOFFICE_JWT_SECRET || '10122002';
    const docKey = `gdn_${gdnId}_${Date.now()}`;

    const data: any = { ...(gdn.data as object), assignments: gdn.assignments };
    const totalSL = (data.assignments || []).reduce((sum: number, a: any) => sum + (a.soLuong || 0), 0);
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

    const downloadToken = this.jwtService.sign(
      { gdnId, purpose: 'download' },
      { expiresIn: '1h' },
    );

    const editorConfig: any = {
      document: {
        fileType: 'docx',
        key: docKey,
        title: `GiayDeNghiIn_${gdn.id.slice(0, 8)}.docx`,
        url: `${appUrl}/api/dat-sach/gdn/${gdnId}/download-public?token=${downloadToken}`,
      },
      documentType: 'word',
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };

    const token = this.jwtService.sign(editorConfig, {
      secret: onlyofficeSecret,
      expiresIn: '1h',
    });

    return { onlyofficeUrl, editorConfig: { ...editorConfig, token }, replacements };
  }

  async getOnlyofficeConfigForPcdi(pcdiId: string) {
    const pcdi = await this.prisma.pCDICoSoIn.findUnique({ where: { id: pcdiId } });
    if (!pcdi) throw new NotFoundException('Không tìm thấy PCDI');

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'https://jtsconlyoffice.duckdns.org';
    const onlyofficeSecret = process.env.ONLYOFFICE_JWT_SECRET || '10122002';
    const docKey = `pcdi_${pcdiId}_${Date.now()}`;
    const data: any = pcdi.data as object;

    const downloadToken = this.jwtService.sign(
      { pcdiId, purpose: 'download' },
      { expiresIn: '1h' },
    );

    const editorConfig: any = {
      document: {
        fileType: 'docx',
        key: docKey,
        title: `PhieuChiDinhCoSoIn_${pcdi.id.slice(0, 8)}.docx`,
        url: `${appUrl}/api/dat-sach/pcdi/${pcdiId}/download-public?token=${downloadToken}`,
      },
      documentType: 'word',
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };

    const token = this.jwtService.sign(editorConfig, {
      secret: onlyofficeSecret,
      expiresIn: '1h',
    });

    return { onlyofficeUrl, editorConfig: { ...editorConfig, token } };
  }

  async getOnlyofficeConfigForQD(projectId: string) {
    const project = await this.getProjectForGenerate(projectId);
    const pcdi = project.pcdiDocuments[0];
    const qdData: any = project.qdData as object || {};
    const pcdiData: any = pcdi ? (pcdi.data as object) : {};
    const templateData = { ...pcdiData, ...qdData };

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const onlyofficeUrl = process.env.ONLYOFFICE_URL || 'https://jtsconlyoffice.duckdns.org';
    const onlyofficeSecret = process.env.ONLYOFFICE_JWT_SECRET || '10122002';
    const docKey = `qd_${projectId}_${Date.now()}`;

    const downloadToken = this.jwtService.sign(
      { projectId, purpose: 'download' },
      { expiresIn: '1h' },
    );

    const editorConfig: any = {
      document: {
        fileType: 'docx',
        key: docKey,
        title: `QuyetDinhDatSach_${project.tenDuAn.replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
        url: `${appUrl}/api/dat-sach/project/${projectId}/download-qd-public?token=${downloadToken}`,
      },
      documentType: 'word',
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };

    const token = this.jwtService.sign(editorConfig, {
      secret: onlyofficeSecret,
      expiresIn: '1h',
    });

    return { onlyofficeUrl, editorConfig: { ...editorConfig, token }, templateData };
  }
}
