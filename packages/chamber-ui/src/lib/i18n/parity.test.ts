import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, type Dirent } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { dict as deDict } from './messages/de';
import { dict as enDict } from './messages/en';
import { dict as esDict } from './messages/es';
import { dict as frDict } from './messages/fr';
import { dict as jaDict } from './messages/ja';
import { dict as koDict } from './messages/ko';
import { dict as plDict } from './messages/pl';
import { dict as ptBrDict } from './messages/pt-BR';
import { dict as trDict } from './messages/tr';
import { dict as ukDict } from './messages/uk';
import { dict as zhCnDict } from './messages/zh-CN';
import { dict as zhTwDict } from './messages/zh-TW';

const localeDictionaries = {
  en: enDict,
  de: deDict,
  fr: frDict,
  es: esDict,
  ja: jaDict,
  'pt-BR': ptBrDict,
  uk: ukDict,
  ko: koDict,
  pl: plDict,
  'zh-CN': zhCnDict,
  'zh-TW': zhTwDict,
  tr: trDict,
} as const;

const sourceRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const keyPattern = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+$/;

describe('UI 3 i18n parity', () => {
  test('every shipped locale defines every referenced UI key', () => {
    const referencedKeys = collectReferencedKeys();

    for (const [locale, dictionary] of Object.entries(localeDictionaries)) {
      const missing = referencedKeys.filter((key) => !Object.hasOwn(dictionary, key));
      expect({ locale, missing }).toEqual({ locale, missing: [] });
    }
  });
});

function collectReferencedKeys(): string[] {
  const englishKeys = new Set(Object.keys(enDict));
  const referenced = new Set<string>();

  for (const file of sourceFiles(sourceRoot)) {
    const source = readFileSync(file, 'utf8');

    for (const match of source.matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)) {
      if (keyPattern.test(match[2])) {
        referenced.add(match[2]);
      }
    }

    for (const match of source.matchAll(/\bt\(\s*`([^`$]+)`\s*\)/g)) {
      if (keyPattern.test(match[1])) {
        referenced.add(match[1]);
      }
    }

    for (const match of source.matchAll(/\bt\(\s*`([^`$]*)\$\{[^}]+\}([^`]*)`/g)) {
      for (const key of englishKeys) {
        if (key.startsWith(match[1]) && key.endsWith(match[2])) {
          referenced.add(key);
        }
      }
    }

    for (const match of source.matchAll(/(['"])([^'"]+)\1/g)) {
      if (englishKeys.has(match[2])) {
        referenced.add(match[2]);
      }
    }
  }

  return [...referenced].sort();
}

function sourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'messages') {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(path));
      continue;
    }

    if (isSourceFile(entry)) {
      files.push(path);
    }
  }

  return files;
}

function isSourceFile(entry: Dirent): boolean {
  return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.');
}
