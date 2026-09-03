import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

/**
 * Filtre d'exception global. Garantit une forme de reponse d'erreur
 * uniforme sur toute l'API, et empeche toute fuite de details internes
 * (stack trace, message d'erreur brut Prisma...) vers le client en
 * dehors du mode developpement.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : "Une erreur interne est survenue. L'incident a ete journalise.";

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} : ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
      Sentry.captureException(exception, {
        tags: { status: String(status), method: request.method, path: request.url },
      });
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} : ${JSON.stringify(message)}`);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
