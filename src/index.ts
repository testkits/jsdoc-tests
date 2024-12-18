import { resolve, basename, extname } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@babel/parser';

const languages = ['js', 'javascript', 'ts', 'typescript'];

/**
 * `jsdoc-test` entry function for test a source file with some jsdoc testing code.
 *
 * @param path {string} - A source file path.
 * @param dirname {string} - A path to execute the test, recommend `__dirname` with nodejs.
 * @param execute {(path: string) => unknown} - A execution method, recommend `require` with nodejs.
 *
 * @example
 *
 * ```ts
 * import { jsdocTests } from '../src';
 *
 * jsdocTests('../src/index.ts', __dirname);
 * ```
 */
export const jsdocTests = (
  /**
   * A source file path.
   */
  path: string,
  /**
   * relative path to execute the test, recommend `__dirname` with nodejs.
   */
  dirname = process.cwd()
) => {
  return new Promise<void>((_resolve, _reject) => {
    const filePath = resolve(dirname, path);
    const filename = basename(filePath).replace(
      new RegExp(`${extname(filePath)}$`),
      ''
    );
    const codeText = readFileSync(filePath, 'utf8');
    const { comments } = parse(codeText, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
    const promises: Promise<void>[] = [];
    let index = 0;
    const markdown = require('markdown-it')({
      highlight(text: string, lang: string) {
        if (languages.includes(lang)) {
          const path = resolve(
            dirname,
            [filename, index, 'snap'].join('.') + extname(filePath)
          );
          writeFileSync(path, text, 'utf8');
          const result = require(path);
          let fn: ((...args: unknown[]) => Promise<void>) | null = null;
          if (typeof result === 'function') {
            fn = result;
          } else if (typeof result.default === 'function') {
            fn = result.default;
          }
          if (fn) promises.push(fn());
          index += 1;
        }
      },
    });
    comments!.forEach(({ value }) => {
      if (/^\*\n/.test(value)) {
        const markdownText = value.replace(/\n\s*\*/g, '\n');
        markdown.render(markdownText);
      }
    });
    Promise.all(promises).then(() => _resolve(), _reject);
  });
};
