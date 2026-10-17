import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const directory = process.argv.includes('--dist') ? 'dist' : '.';
const root = resolve(projectRoot, directory);
const portArgument = process.argv.indexOf('--port');
const port = Number(portArgument >= 0 ? process.argv[portArgument + 1] : process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const segments = pathname.split(/[\\/]/).filter(Boolean);
    if (segments.some(segment => segment.startsWith('.')) || (segments.length && !['index.html', 'src', 'assets'].includes(segments[0]))) {
      response.writeHead(404); response.end('Not found'); return;
    }
    let filename = resolve(root, `.${pathname}`);
    if (filename !== root && !filename.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(filename)).isDirectory()) filename = resolve(filename, 'index.html');
    const content = await readFile(filename);
    response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Codeflow FM: http://127.0.0.1:${port}`));
