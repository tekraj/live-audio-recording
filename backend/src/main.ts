import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RedisIoAdapter } from './adapters/RedisAdapter';
global.__dirname = __dirname;
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.enableCors();
  app.useWebSocketAdapter(redisIoAdapter);
  const port = process.env.PORT_NUMBER || 5000;
  await app
    .listen(port)
    .then(() => console.log(`Listenings on http://localhost:${port}`));
}
bootstrap();
