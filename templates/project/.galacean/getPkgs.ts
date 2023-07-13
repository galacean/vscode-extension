import pkgJson from '../package.json';

const builtinPkgs = ['@galacean/engine', 'react', 'react-dom'];
const extraPkgs = new Map<string, string>();
for (const k in pkgJson.dependencies) {
  if (builtinPkgs.includes(k)) continue;
  // @ts-ignore
  extraPkgs.set(k, pkgJson.dependencies[k]);
}
console.log('extra packages: ', extraPkgs);
