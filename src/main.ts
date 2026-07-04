import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');


const allowedOrigins =
  process.env.FRONTEND_URL?.split(',').map((url) => url.trim()) || [];

app.enableCors({
  origin: (origin, callback) => {
    // Allow Postman, Swagger, mobile apps, curl
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Home Service Marketplace API')
    .setDescription('Complete REST API for Home Service Marketplace')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & OTP')
    .addTag('Users', 'Customer profile & addresses')
    .addTag('Workers', 'Worker profile & availability')
    .addTag('Categories', 'Service categories')
    .addTag('Services', 'Home services')
    .addTag('Bookings', 'Booking management')
    .addTag('Payments', 'Payments & Razorpay')
    .addTag('Wallet', 'Customer & Worker wallets')
    .addTag('Chat', 'Real-time chat')
    .addTag('Reviews', 'Ratings & reviews')
    .addTag('Coupons', 'Discount coupons')
    .addTag('Notifications', 'Push & in-app notifications')
    .addTag('Support', 'Help desk & tickets')
    .addTag('Reports', 'Admin analytics')
    .addTag('Admin', 'Admin operations')
    .addTag('Upload', 'File upload')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Server running on: http://localhost:${port}`);
  console.log(`📖 Swagger docs:     http://localhost:${port}/api/docs`);
  console.log(`🌍 Environment:      ${process.env.NODE_ENV || 'development'}\n`);
}

bootstrap();
