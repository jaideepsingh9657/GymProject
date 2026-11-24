import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService<Env, true>);
  app.useLogger(app.get(Logger));
  configureApp(app, cfg.get("CORS_ORIGINS", { infer: true }));
  app.enableShutdownHooks();

  if (cfg.get("NODE_ENV", { infer: true }) !== "production") {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("Luxury Fitness Gym API").setVersion("0.1").addBearerAuth().build());
    SwaggerModule.setup("docs", app, doc);
  }
  await app.listen(cfg.get("PORT", { infer: true }));
}
bootstrap();
