import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let getAllAndOverride: jest.SpyInstance;

  const mockContext = (user?: { role?: UserRole }) => {
    const req: any = {};
    if (user) {
      req.user = user;
    }
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    getAllAndOverride = jest.spyOn(reflector, 'getAllAndOverride');
  });

  afterEach(() => {
    getAllAndOverride.mockRestore();
  });

  const setRoles = (roles: UserRole[] | undefined) => {
    getAllAndOverride.mockReturnValue(roles);
  };

  it('returns true when no @Roles metadata is present', () => {
    setRoles(undefined);
    expect(guard.canActivate(mockContext({ role: UserRole.INDIVIDUAL }))).toBe(true);
  });

  it('returns true when @Roles() is empty (auth-only route)', () => {
    setRoles([]);
    expect(guard.canActivate(mockContext({ role: UserRole.INDIVIDUAL }))).toBe(true);
  });

  it('defers when no user is attached (global guard runs before JwtAuthGuard)', () => {
    setRoles([UserRole.ADMIN]);
    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('allows when the user role is included in @Roles', () => {
    setRoles([UserRole.ADMIN, UserRole.EMERGENCY]);
    expect(guard.canActivate(mockContext({ role: UserRole.ADMIN }))).toBe(true);
    expect(guard.canActivate(mockContext({ role: UserRole.EMERGENCY }))).toBe(true);
  });

  it('rejects when the user role is not included in @Roles', () => {
    setRoles([UserRole.ADMIN]);
    expect(guard.canActivate(mockContext({ role: UserRole.INDIVIDUAL }))).toBe(false);
  });

  it('reads required roles from handler then class metadata', () => {
    expect(getAllAndOverride).not.toHaveBeenCalled();
    setRoles([UserRole.ADMIN]);
    guard.canActivate(mockContext({ role: UserRole.ADMIN }));
    expect(getAllAndOverride).toHaveBeenCalled();
    expect(getAllAndOverride.mock.calls[0][0]).toBe(ROLES_KEY);
  });
});