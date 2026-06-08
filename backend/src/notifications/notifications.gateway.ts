import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000', 'http://demo.jtsc.vn'] },
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {
    this.notificationService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.userId;

      await client.join(`user:${payload.userId}`);

      const unreadCount = await this.notificationService.getUnreadCount(payload.userId);
      client.emit('unread-count', unreadCount);

      console.log(`Client ${client.id} connected as user ${payload.userId}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  notifyDocumentUpdate(doc: any) {
    this.server.emit('document:updated', doc);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return client.handshake.auth?.token || null;
  }
}
