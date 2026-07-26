import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          if (user) {
            this.logger.log(`[${user.role}:${user.userId}] ${method} ${url}`);
          }
        },
        error: () => {
          if (user) {
            this.logger.warn(`[${user.role}:${user.userId}] ${method} ${url} -> ERROR`);
          }
        },
      }),
    );
  }
}
