import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);
        const isLocal =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1';
        const isPrivateLan =
          /^10\./.test(hostname) ||
          /^192\.168\./.test(hostname) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
        const isConfiguredDomain =
          hostname === 'demo.jtsc.vn' ||
          hostname === new URL(
            process.env.APP_URL || 'http://localhost',
          ).hostname;

        callback(
          isLocal || isPrivateLan || isConfiguredDomain
            ? null
            : new Error('Origin is not allowed by CORS'),
          isLocal || isPrivateLan || isConfiguredDomain,
        );
      } catch {
        callback(new Error('Invalid request origin'), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  // Rate limiting for login endpoint (simple in-memory rate limiter)
  const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/auth/login') {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const record = loginAttempts.get(ip);

      if (record) {
        if (now - record.lastAttempt < 60000) { // within 1 minute
          if (record.count >= 5) {
            res.status(429).json({ message: 'Too many login attempts. Please wait 1 minute.' });
            return;
          }
          record.count++;
        } else {
          record.count = 1;
          record.lastAttempt = now;
        }
      } else {
        loginAttempts.set(ip, { count: 1, lastAttempt: now });
      }
    }
    next();
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
