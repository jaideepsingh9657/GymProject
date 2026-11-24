import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService<Env, true>);
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.set("trust proxy", 1); // behind one reverse proxy; req.ip then reflects the client
  app.setGlobalPrefix("v1");
  app.enableCors({ origin: cfg.get("CORS_ORIGINS", { infer: true }), credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (cfg.get("NODE_ENV", { infer: true }) !== "production") {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("Luxury Fitness Gym API").setVersion("0.1").addBearerAuth().build());
    SwaggerModule.setup("docs", app, doc);
  }
  await app.listen(cfg.get("PORT", { infer: true }));
}
bootstrap();
