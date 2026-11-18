import ts from 'typescript';

const arrays = ['topics', 'lessonData', 'usageCases', 'commonMistakes', 'lessonNotes'] as const;

function literal(node: ts.Node): unknown {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('V3.3 grammar data must contain literal properties.');
      }
      return [property.name.text, literal(property.initializer)];
    }));
  }
  throw new Error('V3.3 grammar data must contain literals.');
}

export function extractGrammarArrays(html: string) {
  const script = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!script) throw new Error('Missing script in the V3.3 HTML.');
  const ast = ts.createSourceFile('v33.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const data = new Map<string, unknown[]>();
  const selected = new Set<string>(arrays);
  for (const statement of ast.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !selected.has(declaration.name.text)) continue;
        const value = declaration.initializer && literal(declaration.initializer);
        if (!Array.isArray(value) || data.has(declaration.name.text)) throw new Error('Invalid V3.3 grammar array.');
        data.set(declaration.name.text, value);
      }
    }
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
    const { expression, arguments: args } = statement.expression;
    if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'push' || !ts.isIdentifier(expression.expression)) continue;
    const destination = data.get(expression.expression.text);
    if (destination) destination.push(...args.map(literal));
  }
  const groups = arrays.map(name => data.get(name) ?? []);
  if (!groups[0].length || groups.some(group => group.length !== groups[0].length)) {
    throw new Error('V3.3 grammar arrays are missing or out of alignment.');
  }
  const [topics, lessonData, usageCases, commonMistakes, lessonNotes] = groups;
  return topics.map((topic, i) => ({
    topic, lesson: lessonData[i], cases: usageCases[i], mistakes: commonMistakes[i], notes: lessonNotes[i],
  }));
}
