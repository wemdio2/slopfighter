export function walk(node, visit) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

export function lineCol(sourceFile, pos) {
  const lc = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: lc.line + 1, column: lc.character + 1 };
}

export function nodeRange(sourceFile, node) {
  const start = lineCol(sourceFile, node.getStart(sourceFile));
  const end = lineCol(sourceFile, node.getEnd());
  return { line: start.line, column: start.column, endLine: end.line, endColumn: end.column };
}

export function rangeFromOffsets(sourceFile, startPos, endPos) {
  const start = lineCol(sourceFile, startPos);
  const end = lineCol(sourceFile, endPos);
  return { line: start.line, column: start.column, endLine: end.line, endColumn: end.column };
}

// turn a CamelCaseName into a "camel case name" lower-case phrase
export function deCamel(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
}
