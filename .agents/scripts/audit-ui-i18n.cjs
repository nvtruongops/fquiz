const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const roots = ['apps/web', 'apps/admin', 'packages/ui']
const visibleAttributes = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-roledescription',
  'aria-valuetext',
  'placeholder',
  'title',
])
const visibleObjectFields = new Set([
  'label', 'title', 'description', 'placeholder', 'emptyMessage', 'emptyState',
  'errorMessage', 'successMessage', 'confirmText', 'submitText', 'ariaLabel',
])
const findings = []
const errorLiterals = []
const findingKeys = new Set()

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'api') walk(target)
      continue
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
    inspect(target)
  }
}

function add(sourceFile, node, kind, value) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text || !/[\p{L}]/u.test(text) || /^https?:\/\//i.test(text) || /^\.[A-Z0-9]+$/.test(text)) return
  // Product names and brand marks stay unchanged across locales.
  if (['FQuiz', 'FQuiz.', 'FQuiz Admin', 'F'].includes(text)) return
  if (text === 'Archived assignment' || text.startsWith('hsl(var(')) return
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  const key = `${sourceFile.fileName}:${line}:${kind}:${text}`
  if (findingKeys.has(key)) return
  findingKeys.add(key)
  findings.push({ file: path.relative(process.cwd(), sourceFile.fileName), line: line + 1, kind, text })
}

function inspect(file) {
  const source = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  function visit(node) {
    if (ts.isJsxText(node)) add(sourceFile, node, 'text', node.text)
    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression)) {
      add(sourceFile, node.expression, 'jsx-expression', node.expression.text)
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isPropertyAccessExpression(node.expression)) {
      const expression = node.expression.getText(sourceFile)
      const isUserContent = /^(?:fb|replyTarget)\??\.message$/.test(expression)
      const isGenericToastPayload = /^toast\.message$/.test(expression)
      if (/(?:\.|\?\.)(?:message|error)\b/.test(expression) && !isUserContent && !isGenericToastPayload) {
        add(sourceFile, node.expression, 'dynamic-jsx-message', expression)
      }
    }
    // Static labels are often embedded in conditional JSX, template expressions,
    // or inline ternaries rather than appearing as a direct JSX string.
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isStringLiteral(node.expression) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      function visitDisplayExpression(expression) {
        if (ts.isJsxElement(expression) || ts.isJsxFragment(expression)) return
        if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
          const value = expression.text
          const looksLikeDateFormat = /^[HhmsdMyy\s:/—-]+$/.test(value) && /[HhmsdMyy]/.test(value)
          const valueTokens = value.trim().split(/\s+/)
          const looksLikeUtilityClasses =
            valueTokens.length > 1 &&
            valueTokens.every((token) => /^[a-z0-9_:/.[\]%-]+$/i.test(token)) &&
            valueTokens.some((token) => /[-:/.[\]%]/.test(token))
          let ancestor = expression.parent
          let isAttributeValue = ts.isJsxAttribute(node.parent)
          while (ancestor && ancestor !== node.expression) {
            if (ts.isJsxAttribute(ancestor)) {
              isAttributeValue = true
              break
            }
            ancestor = ancestor.parent
          }
          if (!isAttributeValue && !looksLikeDateFormat && !looksLikeUtilityClasses && /\s/.test(value) && !/^\s*$/.test(value)) {
            add(sourceFile, expression, 'jsx-expression-literal', value)
          }
          return
        }
        ts.forEachChild(expression, visitDisplayExpression)
      }
      visitDisplayExpression(node.expression)
    }
    if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.getText(sourceFile))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        add(sourceFile, node.initializer, node.name.getText(sourceFile), node.initializer.text)
      }
      if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)) {
        add(sourceFile, node.initializer.expression, node.name.getText(sourceFile), node.initializer.expression.text)
      }
    }
    if (ts.isPropertyAssignment(node) && visibleObjectFields.has(node.name.getText(sourceFile))) {
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
        add(sourceFile, node.initializer, `object-${node.name.getText(sourceFile)}`, node.initializer.text)
      }
    }
    if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === 'Error' && node.arguments?.length) {
      const message = node.arguments[0]
      if (ts.isStringLiteral(message) || ts.isNoSubstitutionTemplateLiteral(message)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(message.getStart(sourceFile))
        errorLiterals.push({ file: path.relative(process.cwd(), sourceFile.fileName), line: line + 1, text: message.text })
      }
    }
    if (ts.isCallExpression(node) && /(?:toast|alert|confirm|prompt)/i.test(node.expression.getText(sourceFile)) && node.expression.getText(sourceFile) !== 'addToastItem') {
      for (const argument of node.arguments) {
        if (ts.isStringLiteral(argument)) add(sourceFile, argument, 'notification', argument.text)
        if (ts.isObjectLiteralExpression(argument)) {
          for (const property of argument.properties) {
            if (!ts.isPropertyAssignment(property) || !['title', 'description', 'message'].includes(property.name.getText(sourceFile))) continue
            if (ts.isStringLiteral(property.initializer)) add(sourceFile, property.initializer, 'notification', property.initializer.text)
          }
        }
      }
    }
    if (ts.isCallExpression(node) && /^set[A-Z]\w*(?:Error|ErrorMessage|SuccessMessage|PassMessage)$/.test(node.expression.getText(sourceFile))) {
      for (const argument of node.arguments) {
        if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
          add(sourceFile, argument, 'error-state', argument.text)
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile)
      const isNotification = /(?:toast|alert|confirm|prompt)/i.test(callee) && callee !== 'addToastItem'
      const isErrorSetter = /^(?:set[A-Z]\w*(?:Error|ErrorMessage|SuccessMessage|PassMessage))$/.test(callee)
      const isMessageSetter = /^set[A-Z]\w*Message$/.test(callee)
      if (isNotification || isErrorSetter || isMessageSetter) {
        const candidates = node.arguments.flatMap((argument) => {
          if (ts.isObjectLiteralExpression(argument)) {
            return argument.properties
              .filter((property) => ts.isPropertyAssignment(property) && ['title', 'description', 'message'].includes(property.name.getText(sourceFile)))
              .map((property) => property.initializer)
          }
          return [argument]
        })
        for (const candidate of candidates) {
          const source = candidate.getText(sourceFile)
          if (/(?:\bdata|\bjson|\berr|\berror)\s*(?:\?\.|\.)\s*(?:error|message)\b/.test(source)) {
            add(sourceFile, candidate, 'dynamic-user-message', source)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

for (const root of roots) walk(root)
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
for (const finding of findings) {
  if (process.argv.includes('--summary')) continue
  console.log(`${finding.file}:${finding.line}\t${finding.kind}\t${finding.text}`)
}
if (process.argv.includes('--include-errors')) {
  for (const error of errorLiterals) console.log(`${error.file}:${error.line}\terror-message\t${error.text}`)
}
if (process.argv.includes('--summary')) {
  const byFile = new Map()
  for (const finding of findings) byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1)
  for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${count}\t${file}`)
}
console.log(`\n${findings.length} hardcoded user-facing UI candidate(s)`)
if (process.argv.includes('--include-errors')) console.log(`${errorLiterals.length} error-message literal(s) for manual data-flow review`)
if (process.argv.includes('--strict') && findings.length > 0) process.exitCode = 1
