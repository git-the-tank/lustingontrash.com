import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        '/api/health',
        {
            schema: {
                tags: ['system'],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                        },
                    },
                },
            },
        },
        async () => {
            return { status: 'ok' };
        }
    );
}
