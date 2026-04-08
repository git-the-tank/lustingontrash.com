import { spawn } from 'child_process';

const procs = [
    { name: 'server', cmd: 'pnpm', args: ['run', 'dev:server'] },
    { name: 'client', cmd: 'pnpm', args: ['run', 'dev:client'] },
];

const children = procs.map(({ name, cmd, args }) => {
    const child = spawn(cmd, args, { stdio: 'pipe', shell: true });

    child.stdout.on('data', (data) => {
        const lines = data.toString().trimEnd().split('\n');
        lines.forEach((line) => console.log(`[${name}] ${line}`));
    });

    child.stderr.on('data', (data) => {
        const lines = data.toString().trimEnd().split('\n');
        lines.forEach((line) => console.error(`[${name}] ${line}`));
    });

    child.on('exit', (code) => {
        console.log(`[${name}] exited with code ${code}`);
    });

    return child;
});

function cleanup() {
    children.forEach((child) => child.kill());
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
