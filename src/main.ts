import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/global-http-exception.filter';
import { configDotenv } from 'dotenv';

configDotenv();
async function bootstrap() {
  console.log('Starting server...');
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  console.log('Enabling CORS');
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  console.log('CORS enabled');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
