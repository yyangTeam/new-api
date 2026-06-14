const fs = require('fs');
const path = require('path');

const rootPkgPath = path.join(__dirname, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const catalog = rootPkg.catalog || {};

const workspaces = rootPkg.workspaces || [];
for (const ws of workspaces) {
  const pkgPath = path.join(__dirname, ws, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!pkg[section]) continue;
    for (const [name, ver] of Object.entries(pkg[section])) {
      if (ver === 'catalog:' && catalog[name]) {
        pkg[section][name] = catalog[name];
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Resolved catalog references in ${ws}/package.json`);
  }
}

// Remove workspaces and catalog fields from root package.json so npm
// treats each subdirectory as an independent project.
delete rootPkg.workspaces;
delete rootPkg.catalog;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
console.log('Removed workspaces/catalog from root package.json for npm compatibility');
