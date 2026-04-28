import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface Violation {
  file: string;
  line: number;
  decorator: string;
  key: 'summary' | 'description';
  value: string;
}

const FORBIDDEN_CJK_REGEX = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

function collectTsFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectTsFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getDecoratorName(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
    return expression.name.text;
  }

  return null;
}

function getStringLiteralValue(initializer: ts.Expression): string | null {
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.text;
  }

  return null;
}

function collectSwaggerLanguageViolations(filePath: string): Violation[] {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const callExpression = node.expression;
      const decoratorName = getDecoratorName(callExpression.expression);

      if (decoratorName?.startsWith('Api')) {
        const [firstArgument] = callExpression.arguments;

        if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) {
          for (const property of firstArgument.properties) {
            if (!ts.isPropertyAssignment(property)) {
              continue;
            }

            if (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) {
              continue;
            }

            const key = property.name.text;

            if (key !== 'summary' && key !== 'description') {
              continue;
            }

            const value = getStringLiteralValue(property.initializer);

            if (!value || !FORBIDDEN_CJK_REGEX.test(value)) {
              continue;
            }

            const { line } = sourceFile.getLineAndCharacterOfPosition(property.initializer.getStart(sourceFile));

            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), filePath),
              line: line + 1,
              decorator: decoratorName,
              key,
              value,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations;
}

describe('Swagger 설명 문자열 언어 정책', () => {
  it('summary/description은 한국어(필요 시 영어)로 유지하고 ja/zh 문자를 포함하지 않는다', () => {
    const modulesDir = path.resolve(__dirname, '..', 'modules');
    const files = collectTsFiles(modulesDir);
    const violations = files.flatMap((filePath) => collectSwaggerLanguageViolations(filePath));

    if (violations.length > 0) {
      const formatted = violations
        .map(
          ({ file, line, decorator, key, value }) =>
            `- ${file}:${line} ${decorator}.${key} -> ${JSON.stringify(value)}`,
        )
        .join('\n');

      throw new Error(
        `Swagger 설명 문자열에 금지된 ja/zh 문자가 포함되어 있습니다.\n${formatted}`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});
