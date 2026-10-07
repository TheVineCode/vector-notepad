import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';

export function configureApp(app: INestApplication): void {
  app.use(json({ limit: 1024 * 1024 }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Vector Notepad API')
    .setVersion('1')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);
}
