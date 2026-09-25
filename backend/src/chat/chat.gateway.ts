import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService, SendChatMessageInput } from './chat.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/chat',
})
@Injectable()
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  afterInit() {
    this.chatService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || this.extractToken(client);
      if (!token) throw new Error('Missing token');
      const payload = this.jwtService.verify(token);
      if (!payload?.sub) throw new Error('Invalid token');
      // Initialize synchronously before the first client event can arrive.
      // Socket.IO may dispatch `chat:join` while the database lookup below is
      // still pending.
      client.data.userId = payload.sub;
      client.data.userName = '';
      client.data.chatRooms = new Set<string>();
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true },
      });
      if (!user) throw new Error('Invalid user');
      client.data.userName = user.name;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const rooms: Set<string> = client.data.chatRooms || new Set();
    for (const room of rooms) {
      client.to(room).emit('typing:stop', {
        userId: client.data.userId,
        name: client.data.userName,
      });
    }
  }

  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    try {
      await this.chatService.assertProjectMember(data.projectId, client.data.userId);
      const room = this.chatService.room(data.projectId, data.module);
      await client.join(room);
      const rooms: Set<string> =
        client.data.chatRooms || new Set<string>();
      rooms.add(room);
      client.data.chatRooms = rooms;
      return { ok: true };
    } catch (error: any) {
      return {
        ok: false,
        message: error?.message || 'Không thể tham gia phòng chat',
      };
    }
  }

  @SubscribeMessage('chat:join-many')
  async joinMany(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectIds?: string[] },
  ) {
    const projectIds = [
      ...new Set(
        (Array.isArray(data?.projectIds) ? data.projectIds : [])
          .filter((projectId): projectId is string =>
            typeof projectId === 'string' && Boolean(projectId.trim()),
          ),
      ),
    ];
    if (projectIds.length > 200) {
      return { ok: false, message: 'Danh sách hội thoại quá lớn' };
    }
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId: client.data.userId,
        projectId: { in: projectIds },
      },
      select: { projectId: true },
    });
    if (memberships.length !== projectIds.length) {
      return {
        ok: false,
        message: 'Có dự án không thuộc danh sách hội thoại của bạn',
      };
    }
    const rooms = memberships.map((membership) =>
      this.chatService.room(membership.projectId),
    );
    await Promise.all(rooms.map((room) => client.join(room)));
    const currentRooms: Set<string> =
      client.data.chatRooms || new Set<string>();
    rooms.forEach((room) => currentRooms.add(room));
    client.data.chatRooms = currentRooms;
    return { ok: true, joined: rooms.length };
  }

  @SubscribeMessage('join-project')
  joinLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    return this.join(client, data);
  }

  @SubscribeMessage('chat:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    const room = this.chatService.room(data.projectId, data.module);
    await client.leave(room);
    client.data.chatRooms.delete(room);
    return { ok: true };
  }

  @SubscribeMessage('leave-project')
  leaveLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    return this.leave(client, data);
  }

  @SubscribeMessage('message:send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: SendChatMessageInput & { projectId: string },
  ) {
    try {
      return await this.chatService.sendMessage(
        data.projectId,
        client.data.userId,
        data,
      );
    } catch (error: any) {
      throw new WsException(error?.message || 'Không thể gửi tin nhắn');
    }
  }

  @SubscribeMessage('send-message')
  sendLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: SendChatMessageInput & { projectId: string },
  ) {
    return this.send(client, data);
  }

  @SubscribeMessage('reaction:toggle')
  async toggleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { projectId: string; messageId: string; emoji: string },
  ) {
    try {
      return await this.chatService.toggleReaction(
        data.projectId,
        data.messageId,
        client.data.userId,
        data.emoji,
      );
    } catch (error: any) {
      throw new WsException(error?.message || 'Không thể thả reaction');
    }
  }

  @SubscribeMessage('typing:start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    await this.emitTyping(client, data, 'typing:start');
  }

  @SubscribeMessage('typing:stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    await this.emitTyping(client, data, 'typing:stop');
  }

  @SubscribeMessage('typing')
  typingLegacy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; module?: string },
  ) {
    return this.typingStart(client, data);
  }

  private async emitTyping(
    client: Socket,
    data: { projectId: string; module?: string },
    event: 'typing:start' | 'typing:stop',
  ) {
    try {
      await this.chatService.assertProjectMember(data.projectId, client.data.userId);
      const room = this.chatService.room(data.projectId, data.module);
      if (!client.rooms.has(room)) {
        throw new WsException('Bạn chưa tham gia phòng chat');
      }
      client.to(room).emit(event, {
        projectId: data.projectId,
        userId: client.data.userId,
        name: client.data.userName,
      });
    } catch (error: any) {
      throw new WsException(error?.message || 'Không thể gửi trạng thái soạn tin');
    }
  }

  private extractToken(client: Socket) {
    const authHeader = client.handshake.headers.authorization;
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }
}
