import fs from 'node:fs';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';

const directory = 'public/notices';
const index = path.join(directory, 'index.json');
const previous = fs.existsSync(index)
  ? JSON.parse(fs.readFileSync(index, 'utf8'))
  : { packages: [] };
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
fs.mkdirSync(directory, { recursive: true });
const packages = [];
const copied = new Set();
for (const [location, record] of Object.entries(lock.packages)) {
  if (!location || record.dev) continue;
  let metadata;
  if (fs.existsSync(path.join(location, 'package.json'))) {
    metadata = JSON.parse(fs.readFileSync(path.join(location, 'package.json'), 'utf8'));
  } else {
    const pkgName = location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length);
    metadata = {
      name: pkgName,
      version: record.version || '1.0.0',
      license: record.license || 'Not declared',
      repository: '',
    };
  }
  const identity = `${metadata.name}@${metadata.version}`;
  if (copied.has(identity)) continue;
  copied.add(identity);
  const slug = metadata.name.replace(/^@/, '').replaceAll('/', '--');
  const noticeFiles = [];
  if (fs.existsSync(location)) {
    for (const file of fs.readdirSync(location)) {
      if (!/^(license|copying|notice)(?:$|[._-])/i.test(file)) continue;
      if (!fs.statSync(path.join(location, file)).isFile()) continue;
      const name = `${slug}-${metadata.version}-${file.replace(/[^a-z0-9_-]/gi, '-')}.txt`;
      fs.copyFileSync(path.join(location, file), path.join(directory, name));
      noticeFiles.push(name);
    }
  }
  const entry = {
    name: metadata.name,
    version: metadata.version,
    declaredLicense: metadata.license || 'Not declared',
    repository:
      typeof metadata.repository === 'string'
        ? metadata.repository
        : metadata.repository?.url || '',
    noticeFiles: noticeFiles.sort(),
  };
  // Sharp's native runtime packages ship their component/license table in the
  // README, not a root LICENSE. Preserve that upstream text without modification.
  if (
    /^@img\/sharp-libvips-/.test(metadata.name) &&
    fs.existsSync(path.join(location, 'README.md'))
  ) {
    const name = `${slug}-${metadata.version}-UPSTREAM-README.txt`;
    fs.copyFileSync(path.join(location, 'README.md'), path.join(directory, name));
    entry.noticeFiles.push(name);
    entry.noticeScope =
      'Upstream README includes native-component license table; not full legal clearance.';
  }
  packages.push(entry);
}
packages.sort((a, b) => a.name.localeCompare(b.name, 'en'));
const keep = new Set(packages.flatMap((entry) => entry.noticeFiles));
for (const file of previous.packages.flatMap((entry) => entry.noticeFiles)) {
  if (!keep.has(file)) fs.rmSync(path.join(directory, path.basename(file)), { force: true });
}
const output = JSON.stringify(
  {
    scope:
      'Installed production dependency notice inventory for this package-lock.json; not legal clearance. Original upstream notices are copied without changes.',
    packages,
  },
  null,
  2,
);
fs.writeFileSync(index, await format(output, { ...(await resolveConfig(index)), filepath: index }));
console.log(
  `Preserved notices for ${packages.length} installed production packages. Missing root notices remain explicitly empty.`,
);
