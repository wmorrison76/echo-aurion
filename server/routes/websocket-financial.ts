/**
 * WebSocket Financial Updates
 * Broadcasts real-time P&L updates to connected clients
 * Uses socket.io for reliable event delivery
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../lib/logger';
import { PnLCalculatorRealtime, PnLState } from '../services/pnl-calculator-realtime';
import { FinancialRBACService, UserContext } from '../services/financial-rbac-service';

/**
 * Initialize WebSocket server for financial updates
 */
export function initializeFinancialWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.VITE_FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    namespace: '/api/financial',
  });

  /**
   * Authentication middleware
   */
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const orgId = socket.handshake.auth.orgId;

    if (!token || !userId || !orgId) {
      logger.warn('[FinancialWS] Unauthorized connection attempt', {
        socketId: socket.id,
      });
      next(new Error('UNAUTHORIZED'));
      return;
    }

    // Store user context on socket
    socket.data.user = {
      id: userId,
      org_id: orgId,
      role: socket.handshake.auth.role || 'member',
      outlet_ids: socket.handshake.auth.outlet_ids || [],
    };

    next();
  });

  /**
   * Connection handler
   */
  io.on('connection', (socket: Socket) => {
    logger.debug('[FinancialWS] Client connected', {
      socketId: socket.id,
      userId: socket.data.user?.id,
    });

    /**
     * Subscribe to P&L updates for specific outlet
     */
    socket.on(
      'subscribe-pnl',
      async (payload: { outlet_id: string; period: string }, ack: Function) => {
        try {
          const user: UserContext = socket.data.user;
          const { outlet_id, period } = payload;

          // Verify outlet access
          const canAccess = FinancialRBACService.canAccessOutlet(user, outlet_id);
          if (!canAccess) {
            logger.warn('[FinancialWS] Outlet access denied', {
              userId: user.id,
              outlet_id,
            });
            ack({
              error: 'OUTLET_ACCESS_DENIED',
              message: 'You do not have access to this outlet',
            });
            return;
          }

          // Join socket to outlet room
          const roomId = `pnl:${outlet_id}:${period}`;
          socket.join(roomId);

          // Send current P&L state
          const state = PnLCalculatorRealtime.getPnLState(outlet_id, period);

          logger.debug('[FinancialWS] Subscribed to P&L', {
            socketId: socket.id,
            roomId,
            outlet_id,
            period,
          });

          ack({
            success: true,
            data: state,
          });
        } catch (error) {
          logger.error('[FinancialWS] Subscribe error', {
            error: error instanceof Error ? error.message : String(error),
          });
          ack({
            error: 'SUBSCRIBE_ERROR',
            message: 'Failed to subscribe to P&L updates',
          });
        }
      }
    );

    /**
     * Unsubscribe from P&L updates
     */
    socket.on('unsubscribe-pnl', (payload: { outlet_id: string; period: string }) => {
      const { outlet_id, period } = payload;
      const roomId = `pnl:${outlet_id}:${period}`;
      socket.leave(roomId);

      logger.debug('[FinancialWS] Unsubscribed from P&L', {
        socketId: socket.id,
        roomId,
      });
    });

    /**
     * Request current P&L snapshot
     */
    socket.on(
      'get-pnl',
      async (payload: { outlet_id: string; period: string }, ack: Function) => {
        try {
          const user: UserContext = socket.data.user;
          const { outlet_id, period } = payload;

          // Verify outlet access
          const canAccess = FinancialRBACService.canAccessOutlet(user, outlet_id);
          if (!canAccess) {
            ack({
              error: 'OUTLET_ACCESS_DENIED',
              message: 'You do not have access to this outlet',
            });
            return;
          }

          const state = PnLCalculatorRealtime.getPnLState(outlet_id, period);
          ack({
            success: true,
            data: state,
          });
        } catch (error) {
          logger.error('[FinancialWS] Get P&L error', {
            error: error instanceof Error ? error.message : String(error),
          });
          ack({
            error: 'GET_PNL_ERROR',
            message: 'Failed to retrieve P&L data',
          });
        }
      }
    );

    /**
     * Request P&L summary
     */
    socket.on(
      'get-pnl-summary',
      async (payload: { outlet_id: string; period: string }, ack: Function) => {
        try {
          const user: UserContext = socket.data.user;
          const { outlet_id, period } = payload;

          // Verify outlet access
          const canAccess = FinancialRBACService.canAccessOutlet(user, outlet_id);
          if (!canAccess) {
            ack({
              error: 'OUTLET_ACCESS_DENIED',
            });
            return;
          }

          const summary = PnLCalculatorRealtime.getSummary(outlet_id, period);
          ack({
            success: true,
            data: summary,
          });
        } catch (error) {
          logger.error('[FinancialWS] Get summary error', {
            error: error instanceof Error ? error.message : String(error),
          });
          ack({
            error: 'GET_SUMMARY_ERROR',
          });
        }
      }
    );

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      logger.debug('[FinancialWS] Client disconnected', {
        socketId: socket.id,
        userId: socket.data.user?.id,
      });
    });
  });

  return io;
}

/**
 * Broadcast P&L update to subscribed clients
 * Called by PnLCalculatorRealtime after processing events
 */
export function broadcastPnLUpdate(state: PnLState): void {
  // Get the io instance from global scope
  const io = getFinancialIO();
  if (!io) {
    logger.warn('[FinancialWS] IO instance not available for broadcast');
    return;
  }

  const roomId = `pnl:${state.outlet_id}:${state.period}`;

  io.to(roomId).emit('pnl-updated', {
    outlet_id: state.outlet_id,
    period: state.period,
    revenue: state.revenue,
    cogs: state.cogs,
    labor_cost: state.labor_cost,
    overhead_cost: state.overhead_cost,
    net_profit: state.net_profit,
    health_grade: state.health_grade,
    last_updated: state.last_updated,
    transaction_count: state.transaction_count,
  });

  logger.debug('[FinancialWS] P&L broadcast', {
    roomId,
    netProfit: state.net_profit,
    subscribers: io.sockets.adapter.rooms.get(roomId)?.size || 0,
  });
}

/**
 * Get global IO instance (set by server initialization)
 */
let globalIO: SocketIOServer | null = null;

export function setFinancialIO(io: SocketIOServer): void {
  globalIO = io;
}

export function getFinancialIO(): SocketIOServer | null {
  return globalIO;
}
