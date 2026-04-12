import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJwt } from './jwt.js';
import type { JwtPayload } from './types.js';

declare module 'fastify' {
    interface FastifyRequest {
        user?: JwtPayload;
    }
}

export async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing or invalid authorization' });
        return;
    }

    const token = header.slice(7);

    try {
        request.user = await verifyJwt(token);
    } catch {
        reply.code(401).send({ error: 'Invalid or expired token' });
        return;
    }
}

export async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (request.user?.role !== 'ADMIN') {
        reply.code(403).send({ error: 'Admin access required' });
        return;
    }
}
