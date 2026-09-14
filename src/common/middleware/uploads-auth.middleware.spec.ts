import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { createUploadsAuthMiddleware } from './uploads-auth.middleware';

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const jwtService = mockJwtService as unknown as JwtService;

const createReq = (path: string, authorization?: string) =>
  ({ path, headers: { authorization } }) as unknown as Request;

describe('createUploadsAuthMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  it('lets public avatar requests through without a token', async () => {
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(createReq('/avatars/foo.png'), res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a document request without a Bearer token', async () => {
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(createReq('/documents/id.png'), res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a signature request with an invalid token', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(
      createReq('/signatures/sig-a1b2_0000000000000000.png', 'Bearer invalid'),
      res as Response,
      next,
    );

    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('invalid');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a document request with a valid token for the owner', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u1' });
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(
      createReq('/documents/id_u1_0123456789abcdef.jpg', 'Bearer valid.token'),
      res as Response,
      next,
    );

    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.token');
    expect(next).toHaveBeenCalled();
  });

  it('allows a signature request with a valid token for the owner', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u2' });
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(
      createReq('/signatures/sig_u2_0123456789abcdef.png', 'Bearer valid.token'),
      res as Response,
      next,
    );

    expect(next).toHaveBeenCalled();
  });

  it('forbids a document request from a different account (cross-account read)', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'attacker' });
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(
      createReq('/documents/id_victim-uuid_0123456789abcdef.jpg', 'Bearer attacker.token'),
      res as Response,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('forbids a signature request when the filename carries no owner id', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u1' });
    const next: NextFunction = jest.fn();
    const middleware = createUploadsAuthMiddleware(jwtService);

    await middleware(
      createReq('/signatures/sig-other.png', 'Bearer valid.token'),
      res as Response,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});