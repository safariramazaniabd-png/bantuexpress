import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          if (user) {
            this.logger.log(`[${user.role}:${user.userId}] ${method} ${url}`);

            if (method !== 'GET') {
              this.auditService.log(user.userId, `${method} ${url}`, undefined, undefined, {
                statusCode: context.switchToHttp().getResponse().statusCode,
              });
            }
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
