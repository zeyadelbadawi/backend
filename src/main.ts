import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: ['http://localhost:3001', 'http://your-remote-origin.com'],  // Add your frontend origin here
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allow all necessary HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],  // Allow Authorization header
    credentials: true,  // Allow cookies or session credentials if needed
    preflightContinue: false,  // Ensure that the OPTIONS request is handled by the server
    optionsSuccessStatus: 200,  // Provide a successful status for the preflight request
  };

  app.enableCors(corsOptions);  // Enable CORS with the defined options

  // Increase the global body parser limits
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  await app.listen(3000);  // Listen on port 3000
}

bootstrap();
