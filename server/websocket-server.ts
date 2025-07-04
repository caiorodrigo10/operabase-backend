import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { IStorage } from './storage';
import { redisCacheService } from './services/redis-cache.service';
import { memoryCacheService } from './cache/memory-cache.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  clinicId?: number;
  userName?: string;
}

interface WebSocketMessage {
  id: number;
  conversation_id: number;
  content: string;
  sender_type: 'patient' | 'professional' | 'ai';
  sender_name: string;
  message_type: 'text' | 'audio' | 'image' | 'document';
  created_at: string;
  attachments?: any[];
}

export class WebSocketServer {
  private io: SocketIOServer;
  private storage: IStorage;

  constructor(httpServer: HttpServer, storage: IStorage) {
    this.storage = storage;
    
    // Configuração do Socket.IO com CORS para Replit
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Em produção, especificar domínios
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'], // Fallback para polling
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('🔗 WebSocket server initialized');
  }

  private setupMiddleware() {
    // Middleware de autenticação
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Validar token e extrair dados do usuário
        // Por simplicidade, assumindo que o token contém dados do usuário
        const userData = this.parseUserToken(token);
        
        if (!userData) {
          return next(new Error('Invalid authentication token'));
        }

        socket.userId = userData.userId;
        socket.userEmail = userData.email;
        socket.clinicId = userData.clinicId;
        socket.userName = userData.name;

        console.log(`🔐 WebSocket authenticated: ${userData.email} (clinic: ${userData.clinicId})`);
        next();
      } catch (error) {
        console.error('❌ WebSocket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`✅ User connected: ${socket.userEmail} (${socket.id})`);

      // Join clinic namespace para isolamento multi-tenant
      const clinicRoom = `clinic:${socket.clinicId}`;
      socket.join(clinicRoom);
      console.log(`🏥 User joined clinic room: ${clinicRoom}`);

      // Event: Join specific conversation
      socket.on('conversation:join', (conversationId: number) => {
        const conversationRoom = `conversation:${conversationId}`;
        socket.join(conversationRoom);
        console.log(`💬 User joined conversation: ${conversationId}`);
        
        // Notify others in conversation about user joining
        socket.to(conversationRoom).emit('user:joined', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date().toISOString()
        });
      });

      // Event: Leave conversation
      socket.on('conversation:leave', (conversationId: number) => {
        const conversationRoom = `conversation:${conversationId}`;
        socket.leave(conversationRoom);
        console.log(`👋 User left conversation: ${conversationId}`);
      });

      // Event: Typing indicator
      socket.on('conversation:typing', (data: { conversationId: number; isTyping: boolean }) => {
        const conversationRoom = `conversation:${data.conversationId}`;
        socket.to(conversationRoom).emit('user:typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping: data.isTyping,
          timestamp: new Date().toISOString()
        });
      });

      // Event: Message read status
      socket.on('message:read', (data: { conversationId: number; messageId: number }) => {
        const conversationRoom = `conversation:${data.conversationId}`;
        socket.to(conversationRoom).emit('message:read', {
          messageId: data.messageId,
          readBy: socket.userId,
          readAt: new Date().toISOString()
        });
      });

      // Event: User presence
      socket.on('user:status', (status: 'online' | 'away' | 'offline') => {
        const clinicRoom = `clinic:${socket.clinicId}`;
        socket.to(clinicRoom).emit('user:status', {
          userId: socket.userId,
          status,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`❌ User disconnected: ${socket.userEmail} (${reason})`);
        
        // Notify clinic about user going offline
        const clinicRoom = `clinic:${socket.clinicId}`;
        socket.to(clinicRoom).emit('user:status', {
          userId: socket.userId,
          status: 'offline',
          timestamp: new Date().toISOString()
        });
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });
  }

  // Método para emitir nova mensagem (chamado pelo webhook)
  public async emitNewMessage(conversationId: number, clinicId: number, message: WebSocketMessage) {
    try {
      const conversationRoom = `conversation:${conversationId}`;
      const clinicRoom = `clinic:${clinicId}`;

      // Emitir para a conversa específica
      this.io.to(conversationRoom).emit('message:new', {
        conversation_id: conversationId,
        message: message,
        timestamp: new Date().toISOString()
      });

      // Emitir para a clínica (para notificações)
      this.io.to(clinicRoom).emit('conversation:updated', {
        conversation_id: conversationId,
        last_message: message.content,
        updated_at: message.created_at,
        unread_count: 1 // Será calculado dinamicamente
      });

      // ETAPA 5: Hybrid cache invalidation after WebSocket emission
      await this.invalidateHybridCache(conversationId, clinicId);
      
      console.log(`📨 New message emitted to conversation: ${conversationId}`);
    } catch (error) {
      console.error('❌ Error emitting new message:', error);
    }
  }

  // Método para emitir atualização de conversa
  public async emitConversationUpdate(conversationId: number, clinicId: number, updateData: any) {
    try {
      const conversationRoom = `conversation:${conversationId}`;
      const clinicRoom = `clinic:${clinicId}`;

      this.io.to(conversationRoom).emit('conversation:updated', {
        conversation_id: conversationId,
        ...updateData,
        timestamp: new Date().toISOString()
      });

      this.io.to(clinicRoom).emit('conversation:list_updated', {
        conversation_id: conversationId,
        ...updateData
      });

      console.log(`🔄 Conversation update emitted: ${conversationId}`);
    } catch (error) {
      console.error('❌ Error emitting conversation update:', error);
    }
  }

  // Parser simples do token - em produção usar JWT proper
  private parseUserToken(token: string): any {
    try {
      // Por simplicidade, assumindo que o token é um JSON base64
      // Em produção, usar JWT libraries
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('❌ Token parsing error:', error);
      return null;
    }
  }

  // Método para obter estatísticas
  public getStats() {
    const sockets = this.io.sockets.sockets;
    const connections = sockets.size;
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
    
    return {
      connections,
      rooms: rooms.length,
      roomsList: rooms.filter(room => room.startsWith('clinic:') || room.startsWith('conversation:'))
    };
  }

  /**
   * ETAPA 5: Hybrid Cache Invalidation Integration
   * Invalidates both Redis and Memory cache when messages are updated via WebSocket
   */
  private async invalidateHybridCache(conversationId: number, clinicId: number) {
    try {
      // Memory cache pattern-based invalidation (faster, always works)
      memoryCacheService.deletePattern(`conversation:${conversationId}:`);
      memoryCacheService.deletePattern(`conversations:clinic:${clinicId}`);

      // Redis cache invalidation (when available)
      try {
        await redisCacheService.invalidateConversationDetail(conversationId);
        await redisCacheService.invalidateConversationCache(clinicId);
      } catch (redisError) {
        console.log('⚠️ ETAPA 5: Redis unavailable, using Memory Cache only');
      }

      console.log(`🔄 ETAPA 5: Hybrid cache invalidated for conversation: ${conversationId}, clinic: ${clinicId}`);
    } catch (error) {
      console.error('❌ ETAPA 5: Error invalidating hybrid cache:', error);
    }
  }

  /**
   * ETAPA 5: WebSocket Broadcasting for Real-time Updates
   * Broadcasts message events to connected clients and invalidates cache
   */
  public async broadcastMessageUpdate(conversationId: number, clinicId: number, eventType: 'new' | 'updated' | 'deleted', messageData: any) {
    try {
      const conversationRoom = `conversation:${conversationId}`;
      const clinicRoom = `clinic:${clinicId}`;

      // Broadcast to conversation room
      this.io.to(conversationRoom).emit(`message:${eventType}`, {
        conversationId,
        message: messageData,
        timestamp: new Date().toISOString()
      });

      // Broadcast conversation list update to clinic
      this.io.to(clinicRoom).emit('conversation:list:updated', {
        conversationId,
        clinicId,
        eventType,
        timestamp: new Date().toISOString()
      });

      // Invalidate cache after broadcast
      await this.invalidateHybridCache(conversationId, clinicId);

      console.log(`📡 ETAPA 5: Broadcasted ${eventType} message update for conversation: ${conversationId}`);
    } catch (error) {
      console.error('❌ ETAPA 5: Error broadcasting message update:', error);
    }
  }

  /**
   * ETAPA 5: Get Enhanced WebSocket Connection Statistics
   */
  public getConnectionStats() {
    const socketCount = this.io.engine.clientsCount;
    const rooms = this.io.sockets.adapter.rooms;
    
    return {
      connectedClients: socketCount,
      totalRooms: rooms.size,
      clinicRooms: Array.from(rooms.keys()).filter(room => room.startsWith('clinic:')).length,
      conversationRooms: Array.from(rooms.keys()).filter(room => room.startsWith('conversation:')).length,
      timestamp: new Date().toISOString()
    };
  }
}