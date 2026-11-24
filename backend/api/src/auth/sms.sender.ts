import { Injectable, Logger } from "@nestjs/common";

export abstract class SmsSender {
  abstract send(phone: string, message: string): Promise<void>;
}

/**
 * Development only: logs the message instead of sending. A real provider
 * (MSG91 / DLT-registered) replaces this before production; boot refuses
 * to use this class when NODE_ENV=production (see AuthModule).
 */
@Injectable()
export class ConsoleSmsSender extends SmsSender {
  private readonly log = new Logger("Sms");
  async send(phone: string, message: string) { this.log.warn(`[DEV SMS to ${phone}] ${message}`); }
}
