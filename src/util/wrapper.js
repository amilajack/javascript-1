/**
 * @fileoverview Handles wrapping for nodes.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

function shouldIncreaseIndentForVariableDeclaration(node, nodeParents) {
    const parent = nodeParents.get(node);
    if (parent.type === "VariableDeclarator" && parent.init === node) {
        const grandParent = nodeParents.get(parent);

        return grandParent.declarations.length > 1 &&
            grandParent.declarations[0] === parent;
    }

    return false;
}

function unwrapObjectOrArrayLiteral(node, {layout, tokenList}) {
    const children = node.type.startsWith("Array") ? "elements" : "properties";
    const { firstToken, lastToken } = layout.boundaryTokens(node);
    let token = firstToken;

    if (node[children].length === 0) {

        // if there are comments then we can't unwrap
        if (tokenList.nextTokenOrComment(firstToken) === lastToken) {
            while (token && token !== lastToken) {
                const nextToken = tokenList.next(token);
                if (tokenList.isWhitespaceOrLineBreak(token)) {
                    tokenList.delete(token);
                }
                token = nextToken;
            }
        }
    } else {
        // TODO
    }
}

function wrapObjectOrArrayLiteral(node, {layout, nodeParents, tokenList }) {
    const children = node.type.startsWith("Array") ? "elements" : "properties";
    const { firstToken, lastToken } = layout.boundaryTokens(node);
    const firstBodyToken = tokenList.nextTokenOrComment(firstToken);
    const lastBodyToken = tokenList.previousTokenOrComment(lastToken);
    let originalIndentLevel = layout.getIndentLevel(node);
    let newIndentLevel = originalIndentLevel + 1;
    
    if (shouldIncreaseIndentForVariableDeclaration(node, nodeParents)) {
        originalIndentLevel++;
        newIndentLevel++;
    }

    layout.lineBreakAfter(firstToken);
    layout.lineBreakBefore(lastToken);
    layout.indentLevel(lastToken, originalIndentLevel);

    if (node[children].length) {
        node[children].forEach(child => {

            const lastToken = layout.lastToken(child);
            const maybeComma = layout.nextToken(lastToken);

            if (maybeComma.value === ",") {
                layout.lineBreakAfter(maybeComma);
            }
        });

        if (layout.options.trailingCommas) {
            layout.commaAfter(node[children][node[children].length - 1]);
        } else {
            layout.noCommaAfter(node[children][node[children].length - 1]);
        }
    }

    layout.indentLevelBetween(firstBodyToken, lastBodyToken, newIndentLevel);

}

const wrappers = new Map(Object.entries({
    ArrayExpression: wrapObjectOrArrayLiteral,
    ArrayPattern: wrapObjectOrArrayLiteral,

    ConditionalExpression(node, {layout}) {
        const questionMark = layout.findPrevious("?", node.consequent);
        const colon = layout.findNext(":", node.consequent);
        
        layout.lineBreakBefore(questionMark);
        layout.indent(questionMark);
        layout.lineBreakBefore(colon);
        layout.indent(colon);
    },

    FunctionExpression(node, { layout, nodeParents, tokenList }) {
        const { firstToken, lastToken } = layout.boundaryTokens(node.body);
        const firstBodyToken = tokenList.nextTokenOrComment(firstToken);
        const lastBodyToken = tokenList.previousTokenOrComment(lastToken);
        let originalIndentLevel = layout.getIndentLevel(node);
        
        if (shouldIncreaseIndentForVariableDeclaration(node, nodeParents)) {
            originalIndentLevel++;
        }

        const newIndentLevel = originalIndentLevel + 1;

        layout.lineBreakAfter(firstToken);
        layout.lineBreakBefore(lastToken);
        layout.indentLevel(lastToken, originalIndentLevel);
        layout.indentLevelBetween(firstBodyToken, lastBodyToken, newIndentLevel);
    },

    MemberExpression(node, {layout}) {

        // don't wrap member expressions with computed properties
        if (node.computed) {
            return;
        }

        const indentLevel = layout.getIndentLevel(node);
        const dot = layout.findPrevious(".", node.property);
        
        layout.lineBreakBefore(dot);
        layout.indentLevel(dot, indentLevel + 1);
    },

    ObjectExpression: wrapObjectOrArrayLiteral,
    ObjectPattern: wrapObjectOrArrayLiteral,
    
    TemplateLiteral(node, {layout}) {
        const indentLevel = layout.getIndentLevel(node) + 1;
        node.expressions.forEach(child => {
            layout.lineBreakBefore(child);
            layout.lineBreakAfter(child);
            layout.indentLevel(child, indentLevel);
        });
    },

    VariableDeclaration(node, {layout}) {
        const indentLevel = layout.getIndentLevel(node) + 1;
        
        if (node.declarations.length > 1) {
            node.declarations.forEach((declarator, i) => {
                const lastToken = layout.lastToken(declarator);
                const commaToken = layout.nextToken(lastToken);
                if (commaToken.value === ",") {
                    layout.lineBreakAfter(commaToken);
                }

                if (i > 0) {
                    layout.indentLevel(declarator, indentLevel);
                }
            });
        }
    }
    
}));

const unwrappers = new Map(Object.entries({
    ArrayExpression: unwrapObjectOrArrayLiteral,
    ObjectExpression: unwrapObjectOrArrayLiteral,
    ArrayPattern: unwrapObjectOrArrayLiteral,
    ObjectPattern: unwrapObjectOrArrayLiteral,
    
    ConditionalExpression(node, {layout}) {
        const questionMark = layout.findPrevious("?", node.consequent);
        const colon = layout.findNext(":", node.consequent);

        layout.noLineBreakBefore(questionMark);
        layout.spaces(questionMark);
        layout.noLineBreakBefore(colon);
        layout.spaces(colon);
    },

    TemplateLiteral(node, {layout}) {
        node.expressions.forEach(child => {
            layout.noLineBreakBefore(child);
            layout.noLineBreakAfter(child);
        });
    }

}));

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

export class Wrapper {
    constructor(options) {
        this.options = options;
    }

    wrap(node) {
        return wrappers.get(node.type)(node, this.options);
    }

    noWrap(node) {
        return unwrappers.get(node.type)(node, this.options);
    }
}
