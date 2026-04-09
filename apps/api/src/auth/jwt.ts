import { SignJWT, jwtVerify } from 'jose';
import { authConfig } from '@lot/shared/auth.config.js';
import type { JwtPayload } from './types.js';

function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET must be set in environment');
    }
    return new TextEncoder().encode(secret);
}

export async function signJwt(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${authConfig.jwtExpirySeconds}s`)
        .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
}
