import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SocketIoAdapter } from './adapters/socket-io-adapter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const wsAdapter = new SocketIoAdapter(app);
  app.enableCors();
  app.useWebSocketAdapter(wsAdapter);
  const port = process.env.PORT_NUMBER || 5000;
  app.useStaticAssets(join(__dirname, '..', 'public'));
  await app
    .listen(port)
    .then(() => console.log(`Listenings on http://localhost:${port}`));
}
bootstrap();
