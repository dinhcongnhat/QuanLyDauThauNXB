import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ChatService } from './chat.service';

class MentionDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(0)
  start: number;

  @IsInt()
  @Min(1)
  length: number;

  @IsString()
  label: string;
}

class SendMessageDto {
  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  mentions?: MentionDto[];
}

class MarkReadDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

class ToggleReactionDto {
  @IsString()
  @MaxLength(16)
  emoji: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Public()
  @Get('attachments/download-public')
  async downloadAttachmentPublic(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const { attachment, buffer } =
      await this.chatService.downloadAttachmentWithToken(token);
    const encoded = encodeURIComponent(attachment.originalName);
    res.set({
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition':
        `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, max-age=300',
    });
    res.end(buffer);
  }

  @Get('attachments/:attachmentId/url')
  getAttachmentUrl(
    @Param('attachmentId') attachmentId: string,
    @Request() req: any,
  ) {
    return this.chatService.getAttachmentUrl(attachmentId, req.user.sub);
  }

  @Get('attachments/:attachmentId/onlyoffice-config')
  getOnlyofficeConfig(
    @Param('attachmentId') attachmentId: string,
    @Request() req: any,
  ) {
    return this.chatService.getOnlyofficeConfig(attachmentId, req.user.sub);
  }

  @Get(':projectId/members')
  getMembers(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.chatService.getMembers(projectId, req.user.sub);
  }

  @Get(':projectId/messages')
  getMessages(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query('module') module?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      projectId,
      req.user.sub,
      module,
      cursor,
      limit ? Number.parseInt(limit, 10) : 50,
    );
  }

  @Post(':projectId/messages')
  sendMessage(
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.chatService.sendMessage(projectId, req.user.sub, dto);
  }

  @Post(':projectId/messages/:messageId/reactions')
  toggleReaction(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ToggleReactionDto,
    @Request() req: any,
  ) {
    return this.chatService.toggleReaction(
      projectId,
      messageId,
      req.user.sub,
      dto.emoji,
    );
  }

  @Get(':projectId/unread-count')
  async getUnreadCount(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query('module') module?: string,
  ) {
    return {
      count: await this.chatService.getUnreadCount(
        projectId,
        req.user.sub,
        module,
      ),
    };
  }

  @Put(':projectId/read')
  markRead(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: MarkReadDto,
  ) {
    return this.chatService.markRead(
      projectId,
      req.user.sub,
      dto.module,
      dto.messageId,
    );
  }

  @Post(':projectId/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp');
    return this.chatService.uploadFile(projectId, req.user.sub, file);
  }
}
