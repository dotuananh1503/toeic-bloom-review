import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { root, type Sqlite } from '../../core/db';
import type { StudyVocabularyPack } from '../../../packages/data-builder/study-vocabulary';
import { studyListIds } from '../../../packages/shared/study-lists';
import { lexemeData } from '../../../packages/shared/content';
import { englishWordnet } from '../../../content-source/vocabulary';
import { originalSource } from '../../../content-source/grammar-builder';
import { workplaceFamilies,workplaceSenses } from '../../../content-source/workplace-vocabulary';
import { putSource, putSenses, refreshWordSearch, wordId } from './knowledge';

let bundle: StudyVocabularyPack | undefined;
function loadBundle() {
  bundle ??= JSON.parse(gunzipSync(readFileSync(join(root,'content-source','study-vocabulary.json.gz'))).toString('utf8'));
  return bundle!;
}

export function installStudyVocabulary(db:Sqlite) {
  const {sources,membership,forms,english,enFallback,legacy,authored,missing} = loadBundle();
  if (missing.length) throw new Error('Study list headwords without a learning entry: ' + missing.join(', '));
  for (const source of sources) putSource(db,source);
  putSenses(db,english,englishWordnet.id);
  for (const list of studyListIds) putSenses(db,enFallback[list],list+'-1.2');
  putSenses(db,legacy,'fvdp-en-vi');
  putSenses(db,authored,originalSource.id);
  putSenses(db,workplaceSenses,originalSource.id);
  const getWordData = db.prepare('SELECT data FROM lexemes WHERE id=?').pluck();
  const setWordData = db.prepare('UPDATE lexemes SET data=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?');
  const lemmas = new Set([...Object.keys(membership),...workplaceFamilies.keys()]);
  for (const lemma of lemmas) {
    const id = wordId(lemma);
    const raw = getWordData.get(id) as string | undefined;
    if (!raw) throw new Error('Study list word missing: ' + lemma);
    const word = lexemeData.parse(JSON.parse(raw));
    const updated = {
      ...word,
      family:[...new Set([...word.family,...(workplaceFamilies.get(lemma) ?? [])])],
      forms:[...new Set([...word.forms,...(forms[lemma] ?? [])])],
      studyLists:membership[lemma] ?? word.studyLists,
    };
    const data = JSON.stringify(updated);
    if (data===raw) continue;
    setWordData.run(data,id);
    if (updated.family.length!==word.family.length || updated.forms.length!==word.forms.length) refreshWordSearch(db,id);
  }
}
