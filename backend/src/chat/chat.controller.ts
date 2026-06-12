import {
  Controller, Get, Post, Param, Query, Body, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { IsString, IsOptional } from 'class-validator';

class SendMessageDto {
  @IsString() content: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() fileType?: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get(':projectId/messages')
  async getMessages(
    @Param('projectId') projectId: string,
    @Query('module') module?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      projectId,
      module || undefined,
      cursor || undefined,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post(':projectId/messages')
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.chatService.sendMessage(
      projectId,
      req.user.sub,
      dto.content,
      dto.module,
      dto.type || 'TEXT',
      dto.fileUrl,
      dto.fileName,
      dto.fileType,
    );
  }

  @Post(':projectId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      return { error: 'No file provided' };
    }
    return this.chatService.uploadFile(file);
  }
}
