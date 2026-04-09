import { randomBytes, createHash } from 'node:crypto';
import { authConfig } from '@lot/shared/auth.config.js';
import { prisma } from '../db/index.js';
import type { Session } from '../generated/prisma/client.js';

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
    userId: string
): Promise<{ refreshToken: string; session: Session }> {
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + authConfig.refreshTokenExpiryDays);

    const session = await prisma.session.create({
        data: {
            userId,
            refreshTokenHash,
            expiresAt,
        },
    });

    return { refreshToken, session };
}

export async function validateSession(
    refreshToken: string
): Promise<Session | null> {
    const refreshTokenHash = hashToken(refreshToken);

    const session = await prisma.session.findFirst({
        where: {
            refreshTokenHash,
            expiresAt: { gt: new Date() },
        },
    });

    return session;
}

export async function rotateSession(
    oldSessionId: string,
    userId: string
): Promise<{ refreshToken: string; session: Session }> {
    await prisma.session.delete({ where: { id: oldSessionId } });
    return createSession(userId);
}

export async function deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({ where: { id: sessionId } });
}

export async function deleteUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
}
