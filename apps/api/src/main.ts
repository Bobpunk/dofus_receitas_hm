import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DofusModule } from './dofus/dofus.module';

async function bootstrap() {
  const app = await NestFactory.create(DofusModule);
  app.enableCors();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Dofus API rodando em http://localhost:${port}`);
}
bootstrap();
