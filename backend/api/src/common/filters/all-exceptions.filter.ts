import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

/** Uniform error envelope: { code, message, details?, requestId }. Never leaks internals. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger("Exceptions");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();
    const requestId = req.id ?? req.headers?.["x-request-id"];

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") message = body;
      else {
        const b = body as { message?: string | string[] };
        if (Array.isArray(b.message)) { message = "Validation failed"; details = b.message; }
        else message = b.message ?? exception.message;
      }
    } else {
      this.log.error({ err: exception, requestId }, "Unhandled exception");
    }

    res.status(status).json({ code: HttpStatus[status] ?? "ERROR", message, details, requestId });
  }
}
