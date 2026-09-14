import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

const PROTECTED_DIRS = ['documents', 'signatures'];

export const createUploadsAuthMiddleware = (jwtService: JwtService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const segments = req.path.split('/').filter(Boolean);
    const subdir = segments[0];

    if (!PROTECTED_DIRS.includes(subdir)) {
      return next();
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const payload = await jwtService.verifyAsync<{ sub?: string }>(
        header.slice('Bearer '.length),
      );

      const filename = segments[1] ?? '';
      const ownerId = filename.split('_')[1];
      if (!ownerId || ownerId !== payload.sub) {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
        return;
      }

      return next();
    } catch {
      const error = new UnauthorizedException();
      res.status(error.getStatus()).json({ message: error.message, statusCode: error.getStatus() });
      return;
    }
  };
};