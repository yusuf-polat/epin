import app from './app';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { connectRedis, redis } from '@/config/redis';
import { logger } from '@/utils/logger';
import { startScheduledJobs, stopScheduledJobs } from '@/jobs';

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');
    await connectRedis();

    const server = app.listen(env.PORT, () => {
      logger.info(`NexusPin Backend API running on port ${env.PORT} [${env.NODE_ENV}]`);
      startScheduledJobs();
    });

    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      stopScheduledJobs();
      server.close(async () => {
        await prisma.$disconnect();
        await redis.quit().catch(() => undefined);
        logger.info('Connections closed');
        process.exit(0);
      });
      // Açık bağlantılar kapanmazsa zorla çık
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

startServer();
