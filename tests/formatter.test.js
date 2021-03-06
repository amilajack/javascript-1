/**
 * @fileoverview Tests for formatter
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { Formatter } from "../src/formatter.js";
import fs from "fs";
import path from "path";
import chai from "chai";

const expect = chai.expect;

//-----------------------------------------------------------------------------
// Formatter Configs
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Formatter", () => {

    describe("Plugins", () => {
        
        it("should run plugin when specified", () => {
            
            const formatter = new Formatter({
                options: {
                    maxEmptyLines: 2
                },
                plugins: [

                    // insert a line break at end of input
                    function(context) {
                        return {
                            ExpressionStatement(node) {
                                const last = context.layout.lastToken(node);
                                const semi = context.layout.nextToken(last);
                                context.layout.lineBreakAfter(semi);
                            }
                        };
                    }
                ]
            });

            const result = formatter.format("a;");
            expect(result).to.deep.equal("a;\n");
        });

        it("should run multiple plugins when specified", () => {
            
            const formatter = new Formatter({
                options: {
                    maxEmptyLines: 2
                },
                plugins: [

                    // insert a line break at end of input
                    function(context) {
                        return {
                            ExpressionStatement(node) {
                                const last = context.layout.lastToken(node);
                                const semi = context.layout.nextToken(last);
                                context.layout.lineBreakAfter(semi);
                            }
                        };
                    },

                    // ensure empty line before function declarations
                    function(context) {

                        const { layout } = context;

                        return {
                            FunctionDeclaration(node) {
                                layout.emptyLineBefore(node);
                            }
                        };
                    }
                ]
            });

            const result = formatter.format("function foo(){\nreturn;}");
            expect(result).to.deep.equal("\nfunction foo() {\n    return;\n}");
        });

        it("should not run plugins when plugin array is empty", () => {
            
            const formatter = new Formatter({
                style: {
                    maxEmptyLines: 2
                },
                plugins: []
            });

            const result = formatter.format("a;");
            expect(result).to.deep.equal("a;");
        });

    });

    describe("Style Options", () => {

        describe("semicolons", () => {
            it("should not add semicolons when semicolons is false", () => {
                const source = "a\nb";
                const expected = "a\nb";
                const formatter = new Formatter({
                    style: {
                        semicolons: false
                    }
                });
                const result = formatter.format(source);
                expect(result).to.deep.equal(expected);

            });

            it("should remove semicolons when semicolons is false and semicolons are present", () => {
                const source = "a;\nb;";
                const expected = "a\nb";
                const formatter = new Formatter({
                    style: {
                        semicolons: false
                    }
                });
                const result = formatter.format(source);
                expect(result).to.deep.equal(expected);

            });

            it("should not remove semicolons when semicolons is false and semicolon is not followed by a line break", () => {
                const source = "a;b;";
                const expected = "a; b";
                const formatter = new Formatter({
                    style: {
                        semicolons: false
                    }
                });
                const result = formatter.format(source);
                expect(result).to.deep.equal(expected);

            });

            it("should add semicolons when semicolons is true", () => {
                const source = "a\nb";
                const expected = "a;\nb;";
                const formatter = new Formatter({
                    style: {
                        semicolons: true
                    }
                });
                const result = formatter.format(source);
                expect(result).to.deep.equal(expected);

            });

            it("should add semicolons when semicolons omitted", () => {
                const source = "a\nb";
                const expected = "a;\nb;";
                const formatter = new Formatter({
                    style: {
                    }
                });
                const result = formatter.format(source);
                expect(result).to.deep.equal(expected);

            });

        });

    });

    describe("One-offs", () => {
        it("should not add a semicolon after last export", () => {
            const source = `
a(\`hello \${
world
}\`);
`.trim();
            const expected = `
a(\`hello \${
    world
}\`);
`.trim();
            const formatter = new Formatter({
                style: {
                    maxEmptyLines: 2
                }
            });
            const result = formatter.format(source);
            expect(result).to.deep.equal(expected);

        });

    });

    describe("fixtures", () => {
        const formatterFixturesPath = "./tests/fixtures/formatter";
        fs.readdirSync(formatterFixturesPath).forEach(fileName => {
            
            const filePath = path.join(formatterFixturesPath, fileName);
            const contents = fs.readFileSync(filePath, "utf8").replace(/\r/g, "");
            const [ options, source, expected ] = contents.trim().split("\n---\n");
            
            it(`Test in ${ fileName } should format correctly`, () => {
                const formatter = new Formatter({
                    style: JSON.parse(options)
                });
                const result = formatter.format(source);
                expect(result.replace(/ /g, "\u00b7")).to.deep.equal(expected.replace(/ /g, "\u00b7"));
            });
        });
    });

});
