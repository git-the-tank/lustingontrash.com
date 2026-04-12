import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authConfig } from '@lot/shared/auth.config.js';
import {
    getBattlenetAuthUrl,
    exchangeCode,
    fetchUserInfo,
} from '../auth/battlenet.js';
import { signJwt } from '../auth/jwt.js';
import {
    createSession,
    rotateSession,
    validateSession,
    deleteSession,
} from '../auth/session.js';
import { verifyGuildMembership } from '../auth/membership.js';
import { requireAuth } from '../auth/middleware.js';
import { prisma } from '../db/index.js';

const callbackQuerySchema = z.object({
    code: z.string(),
    state: z.string(),
});

function getCookieValue(
    cookies: Record<string, string | undefined>,
    name: string
): string | undefined {
    return cookies[name];
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
    app.get('/api/auth/login', async (_request, reply) => {
        const state = randomBytes(16).toString('hex');

        reply.setCookie('lot_oauth_state', state, {
            path: '/api/auth',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300, // 5 minutes
        });

        const url = getBattlenetAuthUrl(state);
        return reply.redirect(url);
    });

    app.get('/api/auth/callback', async (request, reply) => {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

        const parsed = callbackQuerySchema.safeParse(request.query);
        const storedState = getCookieValue(request.cookies, 'lot_oauth_state');

        if (!parsed.success || parsed.data.state !== storedState) {
            return reply.code(400).send({ error: 'Invalid OAuth state' });
        }

        reply.clearCookie('lot_oauth_state', { path: '/api/auth' });

        const { code } = parsed.data;

        let tokenResponse;
        try {
            tokenResponse = await exchangeCode(code);
        } catch {
            return reply.redirect(`${frontendUrl}/app/login`);
        }

        let userInfo;
        let membership;
        try {
            [userInfo, membership] = await Promise.all([
                fetchUserInfo(tokenResponse.access_token),
                verifyGuildMembership(tokenResponse.access_token),
            ]);
        } catch {
            return reply.redirect(`${frontendUrl}/app/login`);
        }

        if (!membership.isMember) {
            return reply.redirect(`${frontendUrl}/app/access-denied`);
        }

        const role = membership.isAdmin ? 'ADMIN' : 'MEMBER';

        const user = await prisma.user.upsert({
            where: { battlenetId: userInfo.sub },
            create: {
                battlenetId: userInfo.sub,
                battletag: userInfo.battletag,
                role,
                guildMembershipVerifiedAt: new Date(),
                lastLoginAt: new Date(),
            },
            update: {
                battletag: userInfo.battletag,
                role,
                guildMembershipVerifiedAt: new Date(),
                lastLoginAt: new Date(),
            },
        });

        // Link guild characters to this user (only unclaimed characters)
        const charNames = membership.guildCharacters.map((c) => c.name);
        if (charNames.length > 0) {
            await prisma.character.updateMany({
                where: {
                    name: { in: charNames },
                    server: { equals: 'Area 52', mode: 'insensitive' },
                    userId: null,
                },
                data: { userId: user.id },
            });
        }

        const { refreshToken } = await createSession(user.id);

        const jwt = await signJwt({
            sub: user.id,
            role: user.role,
            battletag: user.battletag,
        });

        const isProd = process.env.NODE_ENV === 'production';

        reply.setCookie(authConfig.cookieName, refreshToken, {
            path: '/api/auth',
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: authConfig.refreshTokenExpiryDays * 24 * 60 * 60,
            ...(isProd ? { domain: '.lustingontrash.com' } : {}),
        });

        return reply.redirect(`${frontendUrl}/app#token=${jwt}`);
    });

    app.post('/api/auth/refresh', async (request, reply) => {
        const token = getCookieValue(request.cookies, authConfig.cookieName);

        if (!token) {
            request.log.warn(
                { cookieKeys: Object.keys(request.cookies) },
                'refresh: no lot_refresh cookie found'
            );
            return reply.code(401).send({ error: 'No refresh token' });
        }

        const session = await validateSession(token);

        if (!session) {
            return reply
                .code(401)
                .send({ error: 'Invalid or expired session' });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user) {
            return reply.code(401).send({ error: 'User not found' });
        }

        // Rotate refresh token
        const { refreshToken: newRefreshToken } = await rotateSession(
            session.id,
            user.id
        );

        const isProd = process.env.NODE_ENV === 'production';

        reply.setCookie(authConfig.cookieName, newRefreshToken, {
            path: '/api/auth',
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: authConfig.refreshTokenExpiryDays * 24 * 60 * 60,
            ...(isProd ? { domain: '.lustingontrash.com' } : {}),
        });

        const jwt = await signJwt({
            sub: user.id,
            role: user.role,
            battletag: user.battletag,
        });

        return { token: jwt };
    });

    app.post('/api/auth/logout', async (request, reply) => {
        const token = getCookieValue(request.cookies, authConfig.cookieName);

        if (token) {
            const session = await validateSession(token);
            if (session) {
                await deleteSession(session.id);
            }
        }

        const isProd = process.env.NODE_ENV === 'production';

        reply.clearCookie(authConfig.cookieName, {
            path: '/api/auth',
            ...(isProd ? { domain: '.lustingontrash.com' } : {}),
        });

        return { ok: true };
    });

    app.get(
        '/api/auth/me',
        { preHandler: requireAuth },
        async (request, reply) => {
            const user = await prisma.user.findUnique({
                where: { id: request.user!.sub },
                include: {
                    characters: {
                        where: { active: true },
                        select: {
                            id: true,
                            name: true,
                            server: true,
                            className: true,
                            role: true,
                            rank: true,
                        },
                    },
                },
            });

            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }

            return {
                id: user.id,
                battletag: user.battletag,
                role: user.role,
                characters: user.characters,
            };
        }
    );
}
