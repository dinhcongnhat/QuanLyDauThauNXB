import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { ContractPackageType, NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { generatePaymentDocx, getPaymentSteps } from './payment-docx-generator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private notificationService: NotificationService,
    private jwtService: JwtService,
  ) {}

  // ====================== LIST / GET ======================

  /** Get all payments with steps */
  async getAllPayments(projectId?: string) {
    const where: any = projectId ? { projectId } : {};
    return this.prisma.payment.findMany({
      where,
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        contractorSelection: {
          select: {
            id: true, tenGoiThau: true, procurementMethod: true,
            qdKhlcnt: { select: { id: true, data: true } },
          },
        },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Search payments by contract number (maSoHD) */
  async searchByContractNumber(query: string, projectId?: string) {
    const where: any = { maSoHD: { contains: query, mode: 'insensitive' } };
    if (projectId) {
      where.projectId = projectId;
    }
    return this.prisma.payment.findMany({
      where,
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        contractorSelection: {
          select: { id: true, tenGoiThau: true, procurementMethod: true },
        },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single payment */
  async getPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true, status: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        contractorSelection: {
          select: {
            id: true, tenGoiThau: true, procurementMethod: true, data: true,
            qdKhlcnt: { select: { id: true, data: true } },
            steps: { where: { stepKey: 'hop_dong' }, select: { data: true } },
          },
        },
        creator: { select: { id: true, name: true, role: true } },
      },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy hồ sơ thanh toán');
    return payment;
  }

  /** Get a payment step */
  async getPaymentStep(stepId: string) {
    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: {
        payment: {
          include: {
            project: { select: { id: true, tenDuAn: true, procurementType: true, status: true } },
            contractorSelection: {
              select: {
                id: true, tenGoiThau: true, procurementMethod: true, data: true,
                qdKhlcnt: { select: { id: true, data: true } },
              },
            },
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước thanh toán');
    return step;
  }

  /** Get contracts that have been completed (hop_dong step COMPLETED with contractPackageType set) */
  async getCompletedContractsForPayment(projectId?: string) {
    const where: any = {
      contractPackageType: { not: null },
      steps: { some: { stepKey: 'hop_dong', status: 'COMPLETED' } },
    };
    if (projectId) {
      where.projectId = projectId;
    }
    const selections = await this.prisma.contractorSelection.findMany({
      where,
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        qdKhlcnt: { select: { id: true, data: true } },
        steps: { where: { stepKey: 'hop_dong' }, select: { data: true, completedAt: true } },
        payments: { select: { id: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return selections;
  }

  // ====================== CREATE ======================

  /** Create a payment process from a completed contract */
  async createPayment(userId: string, contractorSelectionId: string, projectId?: string) {
    const selection = await this.prisma.contractorSelection.findUnique({
      where: { id: contractorSelectionId },
      include: { steps: { where: { stepKey: 'hop_dong' } } },
    });
    if (!selection) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (!selection.contractPackageType) {
      throw new BadRequestException('Hợp đồng chưa chọn loại gói thầu');
    }

    const hopDongStep = selection.steps[0];
    if (!hopDongStep || hopDongStep.status !== 'COMPLETED') {
      throw new BadRequestException('Hợp đồng chưa hoàn thành');
    }

    const hopDongData = (hopDongStep.data as any) || {};
    const maSoHD = hopDongData.MaSoHD || hopDongData.MaSoHopDong || '';

    const packageType = selection.contractPackageType as ContractPackageType;
    const stepDefs = getPaymentSteps(packageType);

    const payment = await this.prisma.payment.create({
      data: {
        contractorSelectionId,
        projectId: projectId || selection.projectId,
        contractPackageType: packageType,
        maSoHD,
        createdBy: userId,
        steps: {
          create: stepDefs.map(s => ({
            stepKey: s.stepKey,
            stepOrder: s.stepOrder,
            title: s.title,
            status: 'NOT_STARTED',
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        contractorSelection: { select: { id: true, tenGoiThau: true } },
      },
    });

    if (projectId) {
      await this.prisma.projectLog.create({
        data: {
          projectId,
          stepKey: 'thanh_toan',
          action: 'CREATE_PAYMENT',
          message: `Khởi tạo hồ sơ thanh toán cho gói thầu "${payment.contractorSelection.tenGoiThau}"`,
          userId,
        }
      });
    }

    return payment;
  }

  // ====================== UPDATE STEP DATA ======================

  async updateStepData(stepId: string, data: any, userId?: string) {
    const step = await this.prisma.paymentStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    if (step.status === 'COMPLETED') {
      throw new BadRequestException('Bước đã hoàn thành');
    }

    const existingData = (step.data as any) || {};
    const updatedData = { ...existingData, ...data };

    const res = await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: {
        data: updatedData,
        status: step.status === 'NOT_STARTED' ? 'IN_PROGRESS' : step.status,
      },
    });

    if (userId) {
      await this.writeLog(step.paymentId, 'UPDATE_STEP', `Cập nhật dữ liệu bước thanh toán "${step.title}"`, userId);
    }

    return res;
  }

  // ====================== STEP COMPLETION ======================

  async completeStep(stepId: string, userId?: string) {
    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: { payment: { include: { contractorSelection: true } } },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    // Verify previous steps completed
    const allSteps = await this.prisma.paymentStep.findMany({
      where: { paymentId: step.paymentId },
      orderBy: { stepOrder: 'asc' },
    });
    for (const s of allSteps) {
      if (s.stepOrder < step.stepOrder && s.status !== 'COMPLETED') {
        throw new BadRequestException(`Cần hoàn thành bước "${s.title}" trước`);
      }
    }

    const updated = await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.notificationService.create(step.payment.createdBy, {
      type: NotificationType.PAYMENT_COMPLETED,
      title: 'Bước thanh toán đã hoàn thành',
      message: `Bước "${step.title}" của quy trình thanh toán "${step.payment.contractorSelection.tenGoiThau}" đã hoàn thành.`,
      link: '/dashboard/mua-sam/hop-dong',
    });

    await this.writeLog(step.paymentId, 'COMPLETE_STEP', `Hoàn thành bước thanh toán "${step.title}"`, userId || 'SYSTEM');

    return updated;
  }

  async reopenStep(stepId: string, userId?: string) {
    const step = await this.prisma.paymentStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    if (step.status !== 'COMPLETED') {
      throw new BadRequestException('Bước chưa hoàn thành');
    }
    const res = await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', completedAt: null },
    });

    await this.writeLog(step.paymentId, 'REOPEN_STEP', `Mở lại bước thanh toán "${step.title}"`, userId || 'SYSTEM');

    return res;
  }

  // ====================== DOCX ======================

  async generateStepDocx(stepId: string): Promise<Buffer> {
    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: {
        payment: {
          include: {
            contractorSelection: {
              include: {
                qdKhlcnt: true,
                steps: { where: { stepKey: 'hop_dong' } },
              },
            },
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const payment = step.payment;
    const selection = payment.contractorSelection;
    const qdData = (selection.qdKhlcnt?.data as any) || {};
    const goiThauData = (selection.data as any) || {};
    const hopDongData = (selection.steps[0]?.data as any) || {};
    const stepData = (step.data as any) || {};

    // Build comprehensive mapped fields from contract data
    // (handles camelCase → PascalCase mapping from QD/goiThau data)
    const contractFields: Record<string, any> = {
      ChuDauTu: hopDongData.ChuDauTu || qdData.chuDauTu || '',
      TenDuAn: hopDongData.TenDuAn || qdData.tenDuAn || '',
      TenGoiThau: hopDongData.TenGoiThau || selection.tenGoiThau || '',
      NhaThau: hopDongData.NhaThau || '',
      NhaThauTrienKhai: hopDongData.NhaThauTrienKhai || hopDongData.NhaThau || '',
      TenNhaThau: hopDongData.TenNhaThau || hopDongData.NhaThau || '',
      DiaDanh: hopDongData.DiaDanh || qdData.diaDanh || '',
      MaSoHopDong: hopDongData.MaSoHD || hopDongData.MaSoHopDong || payment.maSoHD || '',
      MaSoHD: hopDongData.MaSoHD || payment.maSoHD || '',
      ThoiGianKyHopDong: hopDongData.ThoiGianKyHD || hopDongData.ThoiGianKyHopDong || '',
      ThoiGianKyHD: hopDongData.ThoiGianKyHD || '',
      DaiDienChuDauTu: hopDongData.DaiDienChuDauTu || '',
      ChucVuDaiDienChuDauTu: hopDongData.ChucVuDaiDienChuDauTu || '',
      DiaChiChuDauTu: hopDongData.DiaChiChuDauTu || '',
      DienThoaiChuDauTu: hopDongData.SoDienThoaiChuDauTu || hopDongData.DienThoaiChuDauTu || '',
      MaSoThueChuDauTu: hopDongData.MaSoThueChuDauTu || '',
      MaSoNganHangChuDauTu: hopDongData.MaSoNganHangChuDauTu || '',
      ThongTinTaiKhoanChuDauTu: hopDongData.ThongTinTaiKhoanChuDauTu || '',
      DaiDienNhaThau: hopDongData.DaiDienNhaThau || '',
      ChucVuDaiDienNhaThau: hopDongData.ChucVuDaiDienNhaThau || '',
      DiaChiNhaThau: hopDongData.DiaChiNhaThau || '',
      DienThoaiNhaThau: hopDongData.SoDienThoaiNhaThau || hopDongData.DienThoaiNhaThau || '',
      MaSoThueNhaThau: hopDongData.MaSoThueNhaThau || '',
      ThongTinTaiKhoanNhaThau: hopDongData.ThongTinTaiKhoanNhaThau || '',
      GiaHDBangSo: hopDongData.GiaHDBangSo || '',
      GiaHDBangChu: hopDongData.GiaHDBangChu || '',
      DonGiaHDBangSo: hopDongData.DonGiaHDBangSo || '',
    };

    // Collect data from all previous payment steps (carry forward shared fields)
    const prevStepData: Record<string, any> = {};
    for (const ps of payment.steps) {
      if (ps.id === step.id) break;
      if (ps.data) {
        const pData = ps.data as Record<string, any>;
        for (const [key, value] of Object.entries(pData)) {
          if (!key.startsWith('_') && value) {
            prevStepData[key] = value;
          }
        }
      }
    }

    // Merge layers: raw QD → raw goiThau → raw hopDong → mapped contract fields
    //   → previous step data → payment data → current step data (highest priority)
    const docxData: Record<string, any> = {
      ...qdData,
      ...goiThauData,
      ...hopDongData,
      ...contractFields,
      ...prevStepData,
      ...(payment.data as any || {}),
      ...stepData,
    };

    // Remove internal-only fields
    delete docxData._attachments;

    return generatePaymentDocx(payment.contractPackageType, step.stepKey, docxData);
  }

  async generateAndSaveDocx(stepId: string): Promise<string> {
    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: { payment: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const buffer = await this.generateStepDocx(stepId);
    const objectName = `payment/${step.payment.id}/${step.stepKey}/document.docx`;
    await this.minio.upload(objectName, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: { attachmentPath: objectName },
    });

    return objectName;
  }

  // ====================== FILE UPLOAD ======================

  async uploadAttachment(stepId: string, file: { buffer: Buffer; originalname: string; mimetype: string }, userId?: string) {
    // File type validation - whitelist only safe document types
    const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']);
    const ALLOWED_MIME_TYPES = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ]);

    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Loại file không được phép upload: .${ext}. Chỉ chấp nhận: pdf, doc, docx, xls, xlsx, jpg, png`);
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Định dạng file không hợp lệ: ${file.mimetype}`);
    }

    if (file.originalname.includes('/') || file.originalname.includes('\\') || file.originalname.includes('..')) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: { payment: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._\u00C0-\u024F\u1E00-\u1EFF-]/g, '_');
    const objectName = `payment/${step.payment.id}/${step.stepKey}/${safeName}`;
    await this.minio.upload(objectName, file.buffer, file.mimetype);

    const existingData = (step.data as any) || {};
    const attachments: any[] = existingData._attachments || [];
    attachments.push({ path: objectName, fileName: file.originalname });

    await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: {
        data: { ...existingData, _attachments: attachments },
        status: step.status === 'NOT_STARTED' ? 'IN_PROGRESS' : step.status,
      },
    });

    if (userId) {
      await this.writeLog(step.payment.id, 'UPLOAD_FILE', `Đính kèm tài liệu "${file.originalname}" vào bước "${step.title}"`, userId);
    }

    return objectName;
  }

  async deleteAttachment(stepId: string, objectPath: string, userId?: string) {
    const step = await this.prisma.paymentStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const data = (step.data as any) || {};
    const attachments: any[] = data._attachments || [];
    const idx = attachments.findIndex((a: any) => (typeof a === 'string' ? a : a.path) === objectPath);
    if (idx !== -1) attachments.splice(idx, 1);

    await this.prisma.paymentStep.update({
      where: { id: stepId },
      data: { data: { ...data, _attachments: attachments } },
    });

    if (userId) {
      const fileName = objectPath.split('/').pop() || 'tài liệu';
      await this.writeLog(step.paymentId, 'DELETE_FILE', `Xóa tài liệu đính kèm "${fileName}" khỏi bước "${step.title}"`, userId);
    }

    try { await this.minio.delete(objectPath); } catch { /* ignore */ }
  }

  async getFileUrl(objectName: string): Promise<string> {
    const appUrl = process.env.APP_URL || 'https://demo.jtsc.vn';
    const downloadToken = this.jwtService.sign(
      { path: objectName, purpose: 'lcnt-download' },
      { expiresIn: '24h' },
    );
    return `${appUrl}/api/contractor-selection/file/download-public?token=${downloadToken}`;
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    return this.minio.download(objectName);
  }

  /** List all downloadable files for ZIP preview */
  async getZipFileList(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        project: { select: { id: true, tenDuAn: true, procurementType: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        contractorSelection: { select: { tenGoiThau: true } },
      },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy hồ sơ thanh toán');

    const tenGoiThau = payment.contractorSelection?.tenGoiThau || 'Thanh toán';
    const files: { stepId: string; stepTitle: string; filename: string; type: string; source: 'generate' | 'minio'; objectPath?: string }[] = [];

    for (const step of payment.steps) {
      // All payment steps have DOCX templates
      files.push({ stepId: step.id, stepTitle: step.title, filename: `${step.title} - ${tenGoiThau}.docx`, type: 'docx', source: 'generate' });
      // User-uploaded attachments
      const data = (step.data as any) || {};
      const attachments: any[] = data._attachments || [];
      for (const att of attachments) {
        const attObj = typeof att === 'string' ? { path: att, fileName: att.split('/').pop() } : att;
        files.push({ stepId: step.id, stepTitle: step.title, filename: `${step.title} - ${attObj.fileName || attObj.path.split('/').pop()}`, type: 'attachment', source: 'minio', objectPath: attObj.path });
      }
    }

    return { files, zipName: `Thanh toán - ${tenGoiThau}.zip` };
  }

  // ====================== AUTO-FILL ======================

  /** Get auto-fill data from the contract + previous payment steps */
  async getAutoFillData(paymentId: string, stepKey: string): Promise<Record<string, any>> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contractorSelection: {
          include: {
            qdKhlcnt: true,
            steps: { where: { stepKey: 'hop_dong' } },
          },
        },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });
    if (!payment) return {};

    const qdData = (payment.contractorSelection.qdKhlcnt.data as any) || {};
    const goiThauData = (payment.contractorSelection.data as any) || {};
    const hopDongData = (payment.contractorSelection.steps[0]?.data as any) || {};

    // Common fields from contract  
    const autoFill: Record<string, any> = {
      ChuDauTu: hopDongData.ChuDauTu ?? qdData.chuDauTu ?? '',
      TenDuAn: hopDongData.TenDuAn ?? qdData.tenDuAn ?? '',
      TenGoiThau: hopDongData.TenGoiThau ?? payment.contractorSelection.tenGoiThau ?? '',
      NhaThau: hopDongData.NhaThau ?? '',
      NhaThauTrienKhai: hopDongData.NhaThauTrienKhai ?? hopDongData.NhaThau ?? '',
      TenNhaThau: hopDongData.TenNhaThau ?? hopDongData.NhaThau ?? '',
      DiaDanh: hopDongData.DiaDanh ?? qdData.diaDanh ?? '',
      MaSoHopDong: hopDongData.MaSoHD ?? hopDongData.MaSoHopDong ?? payment.maSoHD ?? '',
      MaSoHD: hopDongData.MaSoHD ?? payment.maSoHD ?? '',
      ThoiGianKyHopDong: hopDongData.ThoiGianKyHD ?? hopDongData.ThoiGianKyHopDong ?? '',
      ThoiGianKyHD: hopDongData.ThoiGianKyHD ?? '',
      DaiDienChuDauTu: hopDongData.DaiDienChuDauTu ?? '',
      ChucVuDaiDienChuDauTu: hopDongData.ChucVuDaiDienChuDauTu ?? '',
      DiaChiChuDauTu: hopDongData.DiaChiChuDauTu ?? '',
      DienThoaiChuDauTu: hopDongData.SoDienThoaiChuDauTu ?? hopDongData.DienThoaiChuDauTu ?? '',
      MaSoThueChuDauTu: hopDongData.MaSoThueChuDauTu ?? '',
      MaSoNganHangChuDauTu: hopDongData.MaSoNganHangChuDauTu ?? '',
      ThongTinTaiKhoanChuDauTu: hopDongData.ThongTinTaiKhoanChuDauTu ?? '',
      DaiDienNhaThau: hopDongData.DaiDienNhaThau ?? '',
      ChucVuDaiDienNhaThau: hopDongData.ChucVuDaiDienNhaThau ?? '',
      DiaChiNhaThau: hopDongData.DiaChiNhaThau ?? '',
      DienThoaiNhaThau: hopDongData.SoDienThoaiNhaThau ?? hopDongData.DienThoaiNhaThau ?? '',
      MaSoThueNhaThau: hopDongData.MaSoThueNhaThau ?? '',
      ThongTinTaiKhoanNhaThau: hopDongData.ThongTinTaiKhoanNhaThau ?? '',
      GiaHDBangSo: hopDongData.GiaHDBangSo ?? '',
      GiaHDBangChu: hopDongData.GiaHDBangChu ?? '',
      DonGiaHDBangSo: hopDongData.DonGiaHDBangSo ?? '',
    };

    // Also spread all hopDong fields so any field the user entered in hop_dong step is available
    for (const [key, value] of Object.entries(hopDongData)) {
      if (!key.startsWith('_') && value && !autoFill[key]) {
        autoFill[key] = value;
      }
    }

    // Also pull data from previous completed payment steps
    for (const prevStep of payment.steps) {
      if (prevStep.stepKey === stepKey) break;
      if (prevStep.status === 'COMPLETED' && prevStep.data) {
        const prevData = prevStep.data as Record<string, any>;
        // Carry forward some common fields
        for (const key of Object.keys(prevData)) {
          if (!key.startsWith('_') && !autoFill[key] && prevData[key]) {
            autoFill[key] = prevData[key];
          }
        }
      }
    }

    return autoFill;
  }

  async getAutoFillForStep(stepId: string): Promise<Record<string, any>> {
    const step = await this.prisma.paymentStep.findUnique({
      where: { id: stepId },
      include: { payment: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    return this.getAutoFillData(step.paymentId, step.stepKey);
  }

  private async writeLog(paymentId: string, action: string, message: string, userId: string, data?: any) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { projectId: true }
      });
      if (payment?.projectId) {
        await this.prisma.projectLog.create({
          data: {
            projectId: payment.projectId,
            stepKey: 'thanh_toan',
            action,
            message,
            userId,
            data: data || {},
          }
        });
      }
    } catch (err) {
      console.error('Error writing Payment log:', err);
    }
  }
}
