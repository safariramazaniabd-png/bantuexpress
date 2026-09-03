import { Injectable, UnauthorizedException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { SmsService } from '../../notifications/sms.service';
import { OtpService } from './otp.service';
import { OtpChannel, OtpPurpose, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') ?? '';
  return [firstName, lastName];
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger('OAuthService');
  private googleCertsCache: { keys: Array<{ kid: string } & JsonWebKey>; fetchedAt: number } | null = null;
  private appleCertsCache: { keys: Array<{ kid: string } & JsonWebKey>; fetchedAt: number } | null = null;
  private readonly CACHE_TTL_MS = 3600_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  private assertProviderConfigured(provider: 'google' | 'apple' | 'facebook') {
    const configured =
      (provider === 'google' && !!this.configService.get<string>('GOOGLE_CLIENT_ID')) ||
      (provider === 'apple' && !!this.configService.get<string>('APPLE_CLIENT_ID')) ||
      (provider === 'facebook' &&
        !!this.configService.get<string>('FACEBOOK_APP_ID') &&
        !!this.configService.get<string>('FACEBOOK_APP_SECRET'));

    if (!configured) {
      throw new ServiceUnavailableException(`${provider} login is not configured on this server.`);
    }
  }

  private async findOrCreateSocialUser(
    provider: 'google' | 'apple' | 'facebook',
    providerId: string,
    email: string | undefined,
    name?: string,
  ) {
    const providerField = {
      google: 'googleId',
      apple: 'appleId',
      facebook: 'facebookId',
    }[provider] as 'googleId' | 'appleId' | 'facebookId';

    const placeholder = `${provider}_${providerId}@placeholder.bantuexpress`;
    const resolvedEmail = email ?? placeholder;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ [providerField]: providerId }, ...(email ? [{ email }] : [])],
      },
    });

    if (user) {
      if (!user[providerField]) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { [providerField]: providerId },
        });
      }
    } else {
      const [firstName, lastName] = name ? splitName(name) : ['', ''];
      user = await this.prisma.user.create({
        data: {
          email: resolvedEmail,
          phone: placeholder,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          [providerField]: providerId,
          emailVerifiedAt: email ? new Date() : null,
          profile: {
            create: { firstName, lastName, languages: [], secondaryPhones: [], isPublic: true },
          },
        },
      });
    }

    return { userId: user.id, role: user.role };
  }

  async googleLogin(idToken: string) {
    this.assertProviderConfigured('google');
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    let payload: {
      sub: string;
      email: string;
      email_verified: boolean;
      name?: string;
      aud?: string;
      azp?: string;
    };

    try {
      payload = await this.verifyGoogleToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (payload.aud && payload.aud !== clientId) {
      throw new UnauthorizedException('Invalid Google token audience');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    return this.findOrCreateSocialUser('google', payload.sub, payload.email, payload.name);
  }

  async appleLogin(identityToken: string) {
    this.assertProviderConfigured('apple');
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');

    let payload: { sub: string; email: string; aud?: string };

    try {
      payload = await this.verifyAppleToken(identityToken);
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    if (payload.aud && payload.aud !== clientId) {
      throw new UnauthorizedException('Invalid Apple token audience');
    }

    return this.findOrCreateSocialUser('apple', payload.sub, payload.email);
  }

  async facebookLogin(accessToken: string) {
    this.assertProviderConfigured('facebook');
    const appId = this.configService.get<string>('FACEBOOK_APP_ID');

    let payload: { id: string; email?: string; name?: string; app_id?: string };

    try {
      payload = await this.verifyFacebookToken(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    if (payload.app_id && payload.app_id !== appId) {
      throw new UnauthorizedException('Invalid Facebook app');
    }

    return this.findOrCreateSocialUser('facebook', payload.id, payload.email, payload.name);
  }

  async whatsappRequest(phone: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      const code = await this.otpService.create(phone, OtpChannel.SMS, OtpPurpose.WHATSAPP, existingUser.id);
      await this.smsService.send({
        to: phone,
        text: `Your BantuExpress verification code: ${code}. Expires in 10 minutes.`,
      });
    }

    return { message: 'If that phone is registered, a code has been sent.' };
  }

  async whatsappVerify(phone: string, code: string) {
    await this.otpService.verify(phone, OtpPurpose.WHATSAPP, code);

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('Invalid or expired code');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { whatsappId: phone },
    });

    return { userId: user.id, role: user.role };
  }

  private async verifyGoogleToken(
    token: string,
  ): Promise<{ sub: string; email: string; email_verified: boolean; name?: string }> {
    const jwt = await import('jsonwebtoken');

    if (!this.googleCertsCache || Date.now() - this.googleCertsCache.fetchedAt > this.CACHE_TTL_MS) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
      this.googleCertsCache = { keys: (await response.json()).keys, fetchedAt: Date.now() };
    }

    const header = jwt.decode(token, { complete: true }) as { header: { kid: string }; payload: any } | null;
    if (!header) throw new UnauthorizedException('Invalid Google token');

    const key = this.googleCertsCache.keys.find((k) => k.kid === header.header.kid);
    if (!key) throw new UnauthorizedException('Google key not found');

    const publicKey = crypto.createPublicKey({ key: JSON.stringify(key), format: 'jwk' });
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as any;
  }

  private async verifyAppleToken(token: string): Promise<{ sub: string; email: string }> {
    const jwt = await import('jsonwebtoken');

    if (!this.appleCertsCache || Date.now() - this.appleCertsCache.fetchedAt > this.CACHE_TTL_MS) {
      const response = await fetch('https://appleid.apple.com/auth/keys');
      this.appleCertsCache = { keys: (await response.json()).keys, fetchedAt: Date.now() };
    }

    const header = jwt.decode(token, { complete: true }) as { header: { kid: string }; payload: any } | null;
    if (!header) throw new UnauthorizedException('Invalid Apple token');

    const key = this.appleCertsCache.keys.find((k) => k.kid === header.header.kid);
    if (!key) throw new UnauthorizedException('Apple key not found');

    const publicKey = crypto.createPublicKey({ key: JSON.stringify(key), format: 'jwk' });
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    }) as any;
  }

  private async verifyFacebookToken(
    accessToken: string,
  ): Promise<{ id: string; email?: string; name?: string; app_id?: string }> {
    const response = await fetch(
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email,name,app_id`,
    );
    const data = (await response.json()) as any;
    if (data.error) throw new Error(data.error.message);
    return data;
  }
}
