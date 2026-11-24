import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

/** Shared by main.ts and the e2e tests so tests exercise the real HTTP pipeline. */
export function configureApp(app: NestExpressApplication, corsOrigins: string[] = []) {
  app.use(helmet());
  app.set("trust proxy", 1); // behind one reverse proxy; req.ip then reflects the client
  app.setGlobalPrefix("v1");
  app.enableCors({ origin: corsOrigins, credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
}
