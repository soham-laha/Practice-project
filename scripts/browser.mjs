import chromium, { inflate } from '@sparticuz/chromium';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
// NPM-packaged browser and libraries avoid a separate CDN download in restricted CI.
if (process.platform === 'linux')
  await inflate(
    fileURLToPath(
      new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url),
    ),
  );
export const browserOptions = {
  executablePath: await chromium.executablePath(),
  args: chromium.args.filter(
    (a) =>
      !['--disable-web-security', '--allow-running-insecure-content', '--single-process'].includes(
        a,
      ),
  ),
  env: {
    ...process.env,
    LD_LIBRARY_PATH: `${path.join(tmpdir(), 'al2023', 'lib')}:${process.env.LD_LIBRARY_PATH || ''}`,
    FONTCONFIG_PATH: path.join(tmpdir(), 'fonts'),
  },
};
