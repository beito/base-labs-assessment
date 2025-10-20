import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
  const cfg = new DocumentBuilder()
    .setTitle("Bob's Corn API")
    .setDescription('Buy corn — limited to 1 per minute per client')
    .setVersion('1.0.0')
    .build();
  /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

  const document = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
void bootstrap();
