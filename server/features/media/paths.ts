import { lstatSync, realpathSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import type { Media } from '../../../packages/shared/content';

export function safeRelative(path:string) {
  return path.length<=220 && path.split('/').every(piece=>/^[a-z0-9][a-z0-9_.-]*$/i.test(piece) && !piece.endsWith('.')
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(piece));
}
export function assetPath(root:string,asset:Media) {
  if (!safeRelative(asset.path)) return;
  const base=join(root,'assets');
  let path=base;
  try {
    if (lstatSync(base).isSymbolicLink()) return;
    for (const part of asset.path.split('/')) {
      path=join(path,part);
      if (lstatSync(path).isSymbolicLink()) return;
    }
    const info=lstatSync(path);
    const relativePath=relative(realpathSync(base),realpathSync(path));
    if (!info.isFile() || info.size!==asset.bytes || relativePath.startsWith('..') || isAbsolute(relativePath)) return;
    return path;
  } catch { return; }
}
export const assetExists=(root:string,asset:Media)=>Boolean(assetPath(root,asset));
