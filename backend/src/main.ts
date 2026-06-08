import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://demo.jtsc.vn'],
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
