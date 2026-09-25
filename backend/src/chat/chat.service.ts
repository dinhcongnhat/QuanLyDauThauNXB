import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ChatAttachmentKind,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { MinioService } from '../minio/minio.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { getOnlyOfficeAppUrl } from '../utils/onlyoffice-url';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const ALLOWED_EXTENSIONS = new Set([
  ...OFFICE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  'pdf',
  'txt',
  'zip',
  'rar',
  '7z',
]);
const ALLOWED_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🎉']);

export type ChatMentionInput = {
  userId: string;
  start: number;
  length: number;
  label: string;
};

export type SendChatMessageInput = {
  content: string;
  module?: string;
  clientMessageId?: string;
  attachmentId?: string;
  mentions?: ChatMentionInput[];
};

const GLOBAL_CHAT_MODULE = 'GENERAL';

const messageInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      position: true,
    },
  },
  mentions: {
    select: { userId: true, start: true, length: true, label: true },
    orderBy: { start: 'asc' as const },
  },
  attachments: true,
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class ChatService {
  private server?: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  normalizeModule(module?: string) {
    const normalized = (module || 'GENERAL').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,64}$/.test(normalized)) {
      throw new BadRequestException('Phân hệ chat không hợp lệ');
    }
    return normalized;
  }

  room(projectId: string, module?: string) {
    // A project is one conversation. `module` remains stored on legacy
    // messages for audit/filter compatibility, but realtime delivery is
    // shared across every page and workflow module of that project.
    return `project:${projectId}`;
  }

  async assertProjectMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của dự án');
    }
    return member;
  }

  async getMembers(projectId: string, userId: string) {
    await this.assertProjectMember(projectId, userId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return members.map((member) => ({
      ...member.user,
      projectRole: member.role,
    }));
  }

  async getConversations(userId: string) {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            tenDuAn: true,
            procurementType: true,
            status: true,
            updatedAt: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { project: { updatedAt: 'desc' } },
    });

    return Promise.all(
      memberships.map(async ({ project, role }) => {
        const [lastMessage, lastReadAt] = await Promise.all([
          this.prisma.projectMessage.findFirst({
            where: { projectId: project.id },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              userId: true,
              content: true,
              type: true,
              module: true,
              createdAt: true,
              user: { select: { name: true } },
              attachments: {
                take: 1,
                select: { originalName: true, kind: true },
              },
            },
          }),
          this.getLastReadAt(project.id, userId),
        ]);
        const unreadCount = await this.prisma.projectMessage.count({
          where: {
            projectId: project.id,
            userId: { not: userId },
            createdAt: { gt: lastReadAt || new Date(0) },
          },
        });
        const attachment = lastMessage?.attachments[0];

        return {
          projectId: project.id,
          projectName: project.tenDuAn,
          procurementType: project.procurementType,
          status: project.status,
          projectRole: role,
          memberCount: project._count.members,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                userId: lastMessage.userId,
                userName: lastMessage.user.name,
                content:
                  attachment?.originalName
                  || lastMessage.content,
                type: attachment?.kind || lastMessage.type,
                module: lastMessage.module,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      }),
    ).then((conversations) =>
      conversations.sort((left, right) => {
        const leftTime = left.lastMessage
          ? new Date(left.lastMessage.createdAt).getTime()
          : 0;
        const rightTime = right.lastMessage
          ? new Date(right.lastMessage.createdAt).getTime()
          : 0;
        return rightTime - leftTime;
      }),
    );
  }

  async getMessages(
    projectId: string,
    userId: string,
    module?: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.assertProjectMember(projectId, userId);
    const moduleKey = module ? this.normalizeModule(module) : null;
    const safeLimit = Math.min(Math.max(limit || 50, 1), 100);
    const messages = await this.prisma.projectMessage.findMany({
      where: {
        projectId,
        ...(moduleKey ? { module: moduleKey } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: safeLimit + 1,
    });

    const hasMore = messages.length > safeLimit;
    const result = hasMore ? messages.slice(0, safeLimit) : messages;
    return {
      messages: await Promise.all(
        result.reverse().map((message) => this.serializeMessage(message)),
      ),
      hasMore,
      nextCursor: hasMore ? result[0]?.createdAt.toISOString() : null,
    };
  }

  async sendMessage(
    projectId: string,
    userId: string,
    input: SendChatMessageInput,
  ) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Dữ liệu tin nhắn không hợp lệ');
    }
    if (input.content != null && typeof input.content !== 'string') {
      throw new BadRequestException('Nội dung tin nhắn không hợp lệ');
    }
    if ((input.content || '').length > 10000) {
      throw new BadRequestException('Tin nhắn không được vượt quá 10.000 ký tự');
    }
    if (
      input.clientMessageId != null
      && (
        typeof input.clientMessageId !== 'string'
        || input.clientMessageId.trim().length > 128
      )
    ) {
      throw new BadRequestException('Mã tin nhắn phía client không hợp lệ');
    }
    if (
      input.attachmentId != null
      && typeof input.attachmentId !== 'string'
    ) {
      throw new BadRequestException('Tệp đính kèm không hợp lệ');
    }
    if (input.mentions != null && !Array.isArray(input.mentions)) {
      throw new BadRequestException('Danh sách mention không hợp lệ');
    }

    const member = await this.assertProjectMember(projectId, userId);
    const moduleKey = this.normalizeModule(input.module);
    const content = input.content?.trim() || '';
    if (!content && !input.attachmentId) {
      throw new BadRequestException('Tin nhắn không được để trống');
    }

    const clientMessageId = input.clientMessageId?.trim() || randomUUID();
    const existing = await this.prisma.projectMessage.findUnique({
      where: {
        userId_clientMessageId: { userId, clientMessageId },
      },
      include: messageInclude,
    });
    if (existing) return this.serializeMessage(existing);

    const mentions = await this.validateMentions(
      projectId,
      content,
      input.mentions || [],
    );
    const attachment = input.attachmentId
      ? await this.getPendingAttachment(input.attachmentId, projectId, userId)
      : null;

    let created: any;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const message = await tx.projectMessage.create({
          data: {
            projectId,
            userId,
            clientMessageId,
            content: content || attachment?.originalName || '',
            module: moduleKey,
            type: attachment?.kind || 'TEXT',
            ...(mentions.length
              ? {
                  mentions: {
                    create: mentions,
                  },
                }
              : {}),
          },
          include: messageInclude,
        });
        if (attachment) {
          await tx.projectMessageAttachment.update({
            where: { id: attachment.id },
            data: { messageId: message.id },
          });
        }
        return tx.projectMessage.findUniqueOrThrow({
          where: { id: message.id },
          include: messageInclude,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        const retry = await this.prisma.projectMessage.findUnique({
          where: { userId_clientMessageId: { userId, clientMessageId } },
          include: messageInclude,
        });
        if (retry) return this.serializeMessage(retry);
      }
      throw error;
    }

    const message = await this.serializeMessage(created);
    this.server?.to(this.room(projectId, moduleKey)).emit('message:new', message);
    // Compatibility event for clients during rolling deployment.
    this.server?.to(this.room(projectId, moduleKey)).emit('new-message', message);

    await this.notifyRecipients(
      projectId,
      userId,
      member.user.name,
      message,
      mentions.map((mention) => mention.userId),
    );
    return message;
  }

  async getUnreadCount(projectId: string, userId: string, module?: string) {
    await this.assertProjectMember(projectId, userId);
    const moduleKey = module ? this.normalizeModule(module) : null;
    const lastReadAt = moduleKey
      ? (
          await this.prisma.projectMessageRead.findUnique({
            where: {
              projectId_userId_moduleKey: {
                projectId,
                userId,
                moduleKey,
              },
            },
            select: { lastReadAt: true },
          })
        )?.lastReadAt
      : await this.getLastReadAt(projectId, userId);
    return this.prisma.projectMessage.count({
      where: {
        projectId,
        ...(moduleKey ? { module: moduleKey } : {}),
        userId: { not: userId },
        createdAt: { gt: lastReadAt || new Date(0) },
      },
    });
  }

  async markRead(
    projectId: string,
    userId: string,
    module?: string,
    messageId?: string,
  ) {
    await this.assertProjectMember(projectId, userId);
    const moduleKey = module
      ? this.normalizeModule(module)
      : GLOBAL_CHAT_MODULE;
    const message = messageId
      ? await this.prisma.projectMessage.findFirst({
          where: {
            id: messageId,
            projectId,
            ...(module ? { module: moduleKey } : {}),
          },
          select: { createdAt: true },
        })
      : await this.prisma.projectMessage.findFirst({
          where: {
            projectId,
            ...(module ? { module: moduleKey } : {}),
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { createdAt: true },
        });
    if (messageId && !message) {
      throw new BadRequestException('Tin nhắn đã đọc không hợp lệ');
    }
    const lastReadAt = message?.createdAt || new Date();
    const cursorWhere = { projectId, userId, moduleKey };
    const advanced = await this.prisma.projectMessageRead.updateMany({
      where: { ...cursorWhere, lastReadAt: { lt: lastReadAt } },
      data: { lastReadAt },
    });
    if (advanced.count === 0) {
      const existing = await this.prisma.projectMessageRead.findUnique({
        where: {
          projectId_userId_moduleKey: cursorWhere,
        },
        select: { lastReadAt: true },
      });
      if (!existing) {
        try {
          await this.prisma.projectMessageRead.create({
            data: { ...cursorWhere, lastReadAt },
          });
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError)
            || error.code !== 'P2002'
          ) {
            throw error;
          }
          // A concurrent read receipt created the cursor first. Only advance it.
          await this.prisma.projectMessageRead.updateMany({
            where: { ...cursorWhere, lastReadAt: { lt: lastReadAt } },
            data: { lastReadAt },
          });
        }
      }
    }
    const cursor = await this.prisma.projectMessageRead.findUniqueOrThrow({
      where: { projectId_userId_moduleKey: cursorWhere },
      select: { lastReadAt: true },
    });
    return { count: 0, lastReadAt: cursor.lastReadAt };
  }

  async toggleReaction(
    projectId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    await this.assertProjectMember(projectId, userId);
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new BadRequestException('Reaction không được hỗ trợ');
    }
    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId },
      select: { id: true },
    });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn');

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectMessageReaction.findUnique({
        where: {
          messageId_userId_emoji: { messageId, userId, emoji },
        },
        select: { id: true },
      });
      if (existing) {
        await tx.projectMessageReaction.delete({ where: { id: existing.id } });
      } else {
        await tx.projectMessageReaction.create({
          data: { messageId, userId, emoji },
        });
      }
    });

    const reactions = await this.prisma.projectMessageReaction.findMany({
      where: { messageId },
      select: {
        id: true,
        emoji: true,
        userId: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const payload = { projectId, messageId, reactions };
    this.server?.to(this.room(projectId)).emit('reaction:update', payload);
    return payload;
  }

  private async getLastReadAt(projectId: string, userId: string) {
    const cursor = await this.prisma.projectMessageRead.findFirst({
      where: { projectId, userId },
      orderBy: { lastReadAt: 'desc' },
      select: { lastReadAt: true },
    });
    return cursor?.lastReadAt || null;
  }

  async uploadFile(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.assertProjectMember(projectId, userId);
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Tệp đính kèm không được vượt quá 50 MB');
    }
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Định dạng tệp không được hỗ trợ');
    }
    const mimeType = (file.mimetype || '').toLowerCase();
    const mimeMatches =
      (IMAGE_EXTENSIONS.has(extension) && mimeType.startsWith('image/'))
      || (VIDEO_EXTENSIONS.has(extension) && mimeType.startsWith('video/'))
      || (extension === 'pdf' && mimeType === 'application/pdf')
      || (
        OFFICE_EXTENSIONS.has(extension)
        && (
          mimeType.includes('word')
          || mimeType.includes('document')
          || mimeType.includes('excel')
          || mimeType.includes('sheet')
          || mimeType.includes('powerpoint')
          || mimeType.includes('presentation')
          || mimeType === 'application/octet-stream'
        )
      )
      || (
        ['txt', 'zip', 'rar', '7z'].includes(extension)
        && !mimeType.startsWith('image/')
        && !mimeType.startsWith('video/')
      );
    if (!mimeMatches) {
      throw new BadRequestException('MIME của tệp không khớp với phần mở rộng');
    }

    await this.cleanupOrphanAttachments();
    const objectPath = `chat/${projectId}/${randomUUID()}.${extension}`;
    await this.minioService.upload(objectPath, file.buffer, file.mimetype);
    const attachment = await this.prisma.projectMessageAttachment.create({
      data: {
        projectId,
        uploaderId: userId,
        objectPath,
        originalName,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        kind: this.attachmentKind(extension),
      },
    });
    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      kind: attachment.kind,
      url: await this.minioService.getPresignedUrl(attachment.objectPath, 900),
    };
  }

  async getAttachmentUrl(attachmentId: string, userId: string) {
    const attachment = await this.prisma.projectMessageAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy tệp đính kèm');
    await this.assertProjectMember(attachment.projectId, userId);
    return {
      url: await this.minioService.getPresignedUrl(attachment.objectPath, 900),
      filename: attachment.originalName,
      mimeType: attachment.mimeType,
      kind: attachment.kind,
    };
  }

  async getOnlyofficeConfig(attachmentId: string, userId: string) {
    const attachment = await this.prisma.projectMessageAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.kind !== ChatAttachmentKind.OFFICE) {
      throw new BadRequestException('Tệp này không hỗ trợ OnlyOffice');
    }
    await this.assertProjectMember(attachment.projectId, userId);
    const downloadToken = this.jwtService.sign(
      {
        attachmentId: attachment.id,
        purpose: 'chat-attachment-download',
      },
      { expiresIn: '1h' },
    );
    const url = `${getOnlyOfficeAppUrl()}/api/chat/attachments/download-public?token=${encodeURIComponent(downloadToken)}`;
    const extension = attachment.originalName.split('.').pop()?.toLowerCase() || 'docx';
    const documentType = ['xls', 'xlsx'].includes(extension)
      ? 'cell'
      : ['ppt', 'pptx'].includes(extension)
        ? 'slide'
        : 'word';
    const editorConfig: any = {
      document: {
        fileType: extension,
        key: `${attachment.id}-${attachment.createdAt.getTime()}`,
        title: attachment.originalName,
        url,
        permissions: {
          edit: false,
          download: true,
          print: true,
          review: false,
        },
      },
      documentType,
      editorConfig: {
        mode: 'view',
        lang: 'vi',
      },
    };
    const secret = process.env.ONLYOFFICE_JWT_SECRET || 'onlyoffice-secret';
    editorConfig.token = this.jwtService.sign(editorConfig, {
      secret,
      expiresIn: '1h',
    });
    return {
      onlyofficeUrl: process.env.ONLYOFFICE_URL || '/onlyoffice',
      editorConfig,
    };
  }

  async downloadAttachmentWithToken(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException(
        'Liên kết tải tệp không hợp lệ hoặc đã hết hạn',
      );
    }
    if (
      payload?.purpose !== 'chat-attachment-download'
      || typeof payload?.attachmentId !== 'string'
    ) {
      throw new BadRequestException('Liên kết tải tệp không hợp lệ');
    }

    const attachment = await this.prisma.projectMessageAttachment.findUnique({
      where: { id: payload.attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }
    return {
      attachment,
      buffer: await this.minioService.download(attachment.objectPath),
    };
  }

  private async validateMentions(
    projectId: string,
    content: string,
    mentions: ChatMentionInput[],
  ) {
    if (!mentions.length) return [];
    if (mentions.length > 50) {
      throw new BadRequestException('Một tin nhắn không được tag quá 50 người');
    }
    for (const mention of mentions) {
      if (
        !mention
        || typeof mention.userId !== 'string'
        || typeof mention.label !== 'string'
        || !Number.isInteger(mention.start)
        || !Number.isInteger(mention.length)
      ) {
        throw new BadRequestException('Dữ liệu mention không hợp lệ');
      }
    }
    const ids = [...new Set(mentions.map((mention) => mention.userId))];
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, userId: { in: ids } },
      select: { userId: true },
    });
    if (members.length !== ids.length) {
      throw new BadRequestException('Người được tag không thuộc dự án');
    }
    return mentions.map((mention) => {
      const label = mention.label.trim();
      if (
        mention.start < 0
        || mention.length <= 0
        || mention.start + mention.length > content.length
        || content.slice(mention.start, mention.start + mention.length) !== label
      ) {
        throw new BadRequestException('Vị trí mention không hợp lệ');
      }
      return {
        userId: mention.userId,
        start: mention.start,
        length: mention.length,
        label,
      };
    });
  }

  private async getPendingAttachment(
    attachmentId: string,
    projectId: string,
    uploaderId: string,
  ) {
    const attachment = await this.prisma.projectMessageAttachment.findFirst({
      where: {
        id: attachmentId,
        projectId,
        uploaderId,
        messageId: null,
      },
    });
    if (!attachment) {
      throw new BadRequestException('Tệp đính kèm không hợp lệ hoặc đã được sử dụng');
    }
    return attachment;
  }

  private attachmentKind(extension: string): ChatAttachmentKind {
    if (IMAGE_EXTENSIONS.has(extension)) return ChatAttachmentKind.IMAGE;
    if (VIDEO_EXTENSIONS.has(extension)) return ChatAttachmentKind.VIDEO;
    if (OFFICE_EXTENSIONS.has(extension)) return ChatAttachmentKind.OFFICE;
    if (extension === 'pdf') return ChatAttachmentKind.PDF;
    return ChatAttachmentKind.FILE;
  }

  private async serializeMessage(message: any) {
    const attachments = await Promise.all(
      (message.attachments || []).map(async (attachment: any) => ({
        id: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        kind: attachment.kind,
        url: await this.minioService.getPresignedUrl(attachment.objectPath, 900),
      })),
    );
    const first = attachments[0];
    return {
      ...message,
      attachments,
      // Legacy response fields kept for a rolling frontend deployment.
      fileUrl: first?.url || message.fileUrl || null,
      fileName: first?.originalName || message.fileName || null,
      fileType: first?.mimeType || message.fileType || null,
      fileSize: first?.size || message.fileSize || null,
      type: first?.kind || message.type,
    };
  }

  private async notifyRecipients(
    projectId: string,
    senderId: string,
    senderName: string,
    message: any,
    mentionedIds: string[],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { userId: true } } },
    });
    if (!project) return;
    const mentionRecipients = [...new Set(mentionedIds)].filter(
      (id) => id !== senderId,
    );
    if (mentionRecipients.length) {
      await this.notificationService.createForUsers(mentionRecipients, {
        type: NotificationType.CHAT_MENTION,
        title: `${senderName} đã nhắc đến bạn`,
        message: message.content.slice(0, 300),
        link: `/dashboard?projectId=${projectId}`,
        metadata: { projectId, messageId: message.id, module: message.module },
      });
    }
    const genericRecipients = project.members
      .map((member) => member.userId)
      .filter(
        (id) => id !== senderId && !mentionRecipients.includes(id),
      );
    if (genericRecipients.length) {
      await this.notificationService.createForUsers(genericRecipients, {
        type: NotificationType.SYSTEM,
        title: `Thảo luận: ${project.tenDuAn}`,
        message: `${senderName}: ${message.content}`.slice(0, 300),
        link: `/dashboard?projectId=${projectId}`,
        metadata: { projectId, messageId: message.id, module: message.module },
      });
    }
  }

  private async cleanupOrphanAttachments() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphans = await this.prisma.projectMessageAttachment.findMany({
      where: { messageId: null, createdAt: { lt: cutoff } },
      select: { id: true, objectPath: true },
      take: 100,
    });
    await Promise.all(
      orphans.map(async (orphan) => {
        try {
          await this.minioService.delete(orphan.objectPath);
        } finally {
          await this.prisma.projectMessageAttachment.delete({
            where: { id: orphan.id },
          });
        }
      }),
    );
  }
}
