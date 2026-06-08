import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { generateBidDocx } from './bid-docx-generator';

const BID_STEPS = [
  { stepKey: 'THONG_TIN_GOI_THAU', stepOrder: 1, title: 'Thông tin gói thầu dự kiến tham dự' },
  { stepKey: 'HO_SO_DU_THAU', stepOrder: 2, title: 'Hồ sơ dự thầu (đính kèm)' },
  { stepKey: 'TO_TRINH_XIN_Y_KIEN', stepOrder: 3, title: 'Tờ trình xin ý kiến' },
  { stepKey: 'QD_PHE_DUYET_HSDT', stepOrder: 4, title: 'Quyết định phê duyệt HSDT' },
  { stepKey: 'HO_SO_DA_NOP', stepOrder: 5, title: 'Hồ sơ dự thầu đã nộp' },
  { stepKey: 'KET_QUA_DAU_THAU', stepOrder: 6, title: 'Kết quả tham gia đấu thầu' },
  { stepKey: 'HOP_DONG_THUC_HIEN', stepOrder: 7, title: 'Hợp đồng thực hiện' },
];

@Injectable()
export class BidParticipationService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: string, data: { maThongBaoMoiThau: string; tenChuDauTu: string; tenGoiThau?: string }) {
    const bid = await this.prisma.bidParticipation.create({
      data: {
        maThongBaoMoiThau: data.maThongBaoMoiThau,
        tenChuDauTu: data.tenChuDauTu,
        tenGoiThau: data.tenGoiThau || '',
        createdBy: userId,
        steps: {
          create: BID_STEPS.map(s => ({
            stepKey: s.stepKey,
            stepOrder: s.stepOrder,
            title: s.title,
            status: s.stepOrder === 1 ? 'IN_PROGRESS' : 'NOT_STARTED',
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, creator: { select: { id: true, name: true, email: true, role: true } } },
    });
    return bid;
  }

  async getAll(userId: string) {
    return this.prisma.bidParticipation.findMany({
      where: { createdBy: userId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyContracts(userId: string) {
    return this.prisma.bidParticipation.findMany({
      where: { createdBy: userId, result: 'WON' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string) {
    const bid = await this.prisma.bidParticipation.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!bid) throw new NotFoundException('Không tìm thấy hồ sơ tham dự');
    return bid;
  }

  async getStep(stepId: string) {
    const step = await this.prisma.bidStep.findUnique({
      where: { id: stepId },
      include: { bidParticipation: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');
    return step;
  }

  async updateStep(stepId: string, data: any) {
    const step = await this.prisma.bidStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    return this.prisma.bidStep.update({
      where: { id: stepId },
      data: { data, status: 'IN_PROGRESS' },
    });
  }

  async completeStep(stepId: string) {
    const step = await this.prisma.bidStep.findUnique({
      where: { id: stepId },
      include: { bidParticipation: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    // Complete current step
    await this.prisma.bidStep.update({
      where: { id: stepId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Auto-advance next step to IN_PROGRESS
    const nextStep = step.bidParticipation.steps.find(
      s => s.stepOrder === step.stepOrder + 1,
    );
    if (nextStep && nextStep.status === 'NOT_STARTED') {
      // For HOP_DONG step, only advance if result is WON
      if (nextStep.stepKey === 'HOP_DONG_THUC_HIEN') {
        const bid = step.bidParticipation;
        if (bid.result !== 'WON') {
          await this.notificationService.create(step.bidParticipation.createdBy, {
            type: NotificationType.STEP_COMPLETED,
            title: 'Bước đấu thầu đã hoàn thành',
            message: `Bước "${step.title}" của hồ sơ "${step.bidParticipation.tenGoiThau || step.bidParticipation.tenChuDauTu}" đã hoàn thành.`,
            link: '/dashboard/nha-thau/tham-du-dau-thau',
          });
          return { message: 'Completed' };
        }
      }
      await this.prisma.bidStep.update({
        where: { id: nextStep.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await this.notificationService.create(step.bidParticipation.createdBy, {
      type: NotificationType.STEP_COMPLETED,
      title: 'Bước đấu thầu đã hoàn thành',
      message: `Bước "${step.title}" của hồ sơ "${step.bidParticipation.tenGoiThau || step.bidParticipation.tenChuDauTu}" đã hoàn thành.`,
      link: '/dashboard/nha-thau/tham-du-dau-thau',
    });

    return { message: 'Completed' };
  }

  async reopenStep(stepId: string) {
    return this.prisma.bidStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', completedAt: null },
    });
  }

  async setBidResult(bidId: string, result: 'WON' | 'LOST') {
    const bid = await this.prisma.bidParticipation.findUnique({
      where: { id: bidId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!bid) throw new NotFoundException('Không tìm thấy hồ sơ');

    const ketQuaStep = bid.steps.find(s => s.stepKey === 'KET_QUA_DAU_THAU');
    if (!ketQuaStep) throw new BadRequestException('Bước kết quả không tồn tại');

    // Update bid result
    await this.prisma.bidParticipation.update({
      where: { id: bidId },
      data: { result },
    });

    // Complete the KetQua step
    await this.prisma.bidStep.update({
      where: { id: ketQuaStep.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        data: { result },
      },
    });

    if (result === 'WON') {
      // Advance HopDong step
      const hopDongStep = bid.steps.find(s => s.stepKey === 'HOP_DONG_THUC_HIEN');
      if (hopDongStep) {
        await this.prisma.bidStep.update({
          where: { id: hopDongStep.id },
          data: { status: 'IN_PROGRESS' },
        });
      }
    }

    const resultMessage = result === 'WON'
      ? `Hồ sơ "${bid.tenGoiThau || bid.tenChuDauTu}" đã trúng thầu. Chúc mừng bạn!`
      : `Hồ sơ "${bid.tenGoiThau || bid.tenChuDauTu}" không trúng thầu. Đừng nản chí, hãy tiếp tục cố gắng!`;

    await this.notificationService.create(bid.createdBy, {
      type: NotificationType.BID_RESULT,
      title: result === 'WON' ? 'Chúc mừng bạn đã trúng thầu!' : 'Kết quả đấu thầu',
      message: resultMessage,
      link: '/dashboard/nha-thau/tham-du-dau-thau',
    });

    return { result };
  }

  async uploadAttachment(stepId: string, file: Express.Multer.File) {
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

    const step = await this.prisma.bidStep.findUnique({
      where: { id: stepId },
      include: { bidParticipation: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const objectName = `bid/${step.bidParticipation.id}/${step.stepKey}/${Date.now()}_${file.originalname}`;
    await this.minio.upload(objectName, file.buffer, file.mimetype);

    const currentAttachments = (step.attachments as any[]) || [];
    currentAttachments.push({
      objectName,
      originalName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });

    await this.prisma.bidStep.update({
      where: { id: stepId },
      data: { attachments: currentAttachments },
    });

    return { objectName, originalName: file.originalname };
  }

  async deleteAttachment(stepId: string, objectName: string) {
    const step = await this.prisma.bidStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    await this.minio.delete(objectName);

    const currentAttachments = ((step.attachments as any[]) || []).filter(
      a => a.objectName !== objectName,
    );
    await this.prisma.bidStep.update({
      where: { id: stepId },
      data: { attachments: currentAttachments },
    });

    return { message: 'Deleted' };
  }

  async getFileUrl(objectPath: string) {
    const url = await this.minio.getPresignedUrl(objectPath, 3600);
    return { url };
  }

  async generateDocx(stepId: string) {
    const step = await this.prisma.bidStep.findUnique({
      where: { id: stepId },
      include: { bidParticipation: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const templateKey = step.stepKey; // TO_TRINH_XIN_Y_KIEN | QD_PHE_DUYET_HSDT | HOP_DONG_THUC_HIEN
    const data = step.data as any;
    const buffer = await generateBidDocx(templateKey, data || {});

    const objectName = `bid/${step.bidParticipation.id}/${step.stepKey}/${Date.now()}_generated.docx`;
    await this.minio.upload(objectName, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Add to attachments
    const currentAttachments = (step.attachments as any[]) || [];
    currentAttachments.push({
      objectName,
      originalName: `${step.title}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      generated: true,
    });
    await this.prisma.bidStep.update({
      where: { id: stepId },
      data: { attachments: currentAttachments },
    });

    return { objectName };
  }

  async downloadDocx(stepId: string): Promise<{ buffer: Buffer; filename: string }> {
    const step = await this.prisma.bidStep.findUnique({
      where: { id: stepId },
      include: { bidParticipation: true },
    });
    if (!step) throw new NotFoundException('Không tìm thấy bước');

    const data = step.data as any;
    const buffer = await generateBidDocx(step.stepKey, data || {});
    const filename = `${step.title} - ${step.bidParticipation.tenGoiThau || step.bidParticipation.maThongBaoMoiThau}.docx`;
    return { buffer, filename };
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    return this.minio.download(objectName);
  }

  /** List all downloadable files for ZIP preview */
  async getZipFileList(bidId: string) {
    const bid = await this.prisma.bidParticipation.findUnique({
      where: { id: bidId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!bid) throw new NotFoundException('Không tìm thấy hồ sơ tham dự');

    const DOCX_STEPS = new Set(['TO_TRINH_XIN_Y_KIEN', 'QD_PHE_DUYET_HSDT', 'HOP_DONG_THUC_HIEN']);
    const processName = bid.tenGoiThau || bid.maThongBaoMoiThau;
    const files: { stepId: string; stepTitle: string; filename: string; type: string; source: 'generate' | 'minio'; objectPath?: string }[] = [];

    for (const step of bid.steps) {
      if (DOCX_STEPS.has(step.stepKey)) {
        files.push({ stepId: step.id, stepTitle: step.title, filename: `${step.title} - ${processName}.docx`, type: 'docx', source: 'generate' });
      }
      // User-uploaded attachments (stored in step.attachments)
      const attachments: any[] = (step.attachments as any[]) || [];
      for (const att of attachments) {
        files.push({ stepId: step.id, stepTitle: step.title, filename: `${step.title} - ${att.originalName || att.objectName.split('/').pop()}`, type: 'attachment', source: 'minio', objectPath: att.objectName });
      }
    }

    return { files, zipName: `Nhà thầu - ${processName}.zip` };
  }
}
