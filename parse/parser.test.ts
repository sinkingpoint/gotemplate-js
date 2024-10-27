import { ItemType } from './lexer';
import { NumberNode, TextNode } from './node';
import { Tree } from './parser';

/*************/
/** Numbers **/
/*************/
test('zero', () => {
	expect(new NumberNode(null, 0, '0', ItemType.Number)).toEqual({ num: 0, pos: 0, text: '0', tree: null, typ: ItemType.Number });
});

test('negative 0', () => {
	expect(new NumberNode(null, 0, '-0', ItemType.Number)).toEqual({ num: -0, pos: 0, text: '-0', tree: null, typ: ItemType.Number });
});

test('73', () => {
	expect(new NumberNode(null, 0, '73', ItemType.Number)).toEqual({ num: 73, pos: 0, text: '73', tree: null, typ: ItemType.Number });
});

test('number with seperator', () => {
	expect(new NumberNode(null, 0, '7_3', ItemType.Number)).toEqual({ num: 73, pos: 0, text: '7_3', tree: null, typ: ItemType.Number });
});

test('binary, small `b`', () => {
	expect(new NumberNode(null, 0, '0b10_010_01', ItemType.Number)).toEqual({
		num: 73,
		pos: 0,
		text: '0b10_010_01',
		tree: null,
		typ: ItemType.Number,
	});
});

test('binary, big `B`', () => {
	expect(new NumberNode(null, 0, '0B10_010_01', ItemType.Number)).toEqual({
		num: 73,
		pos: 0,
		text: '0B10_010_01',
		tree: null,
		typ: ItemType.Number,
	});
});

test('octal, leading 0', () => {
	expect(new NumberNode(null, 0, '073', ItemType.Number)).toEqual({
		num: 0o73,
		pos: 0,
		text: '073',
		tree: null,
		typ: ItemType.Number,
	});
});

test('octal, leading `0o`', () => {
	expect(new NumberNode(null, 0, '0o73', ItemType.Number)).toEqual({
		num: 0o73,
		pos: 0,
		text: '0o73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('octal, leading `0O`', () => {
	expect(new NumberNode(null, 0, '0O73', ItemType.Number)).toEqual({
		num: 0o73,
		pos: 0,
		text: '0O73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('hex, leading `0x`', () => {
	expect(new NumberNode(null, 0, '0x73', ItemType.Number)).toEqual({
		num: 0x73,
		pos: 0,
		text: '0x73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('hex, leading `0X`', () => {
	expect(new NumberNode(null, 0, '0X73', ItemType.Number)).toEqual({
		num: 0x73,
		pos: 0,
		text: '0X73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('hex with seperator', () => {
	expect(new NumberNode(null, 0, '0x7_3', ItemType.Number)).toEqual({
		num: 0x73,
		pos: 0,
		text: '0x7_3',
		tree: null,
		typ: ItemType.Number,
	});
});

test('-73', () => {
	expect(new NumberNode(null, 0, '-73', ItemType.Number)).toEqual({
		num: -73,
		pos: 0,
		text: '-73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('+73', () => {
	expect(new NumberNode(null, 0, '+73', ItemType.Number)).toEqual({
		num: 73,
		pos: 0,
		text: '+73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('100', () => {
	expect(new NumberNode(null, 0, '+73', ItemType.Number)).toEqual({
		num: 73,
		pos: 0,
		text: '+73',
		tree: null,
		typ: ItemType.Number,
	});
});

test('exponent', () => {
	expect(new NumberNode(null, 0, '1e9', ItemType.Number)).toEqual({
		num: 1e9,
		pos: 0,
		text: '1e9',
		tree: null,
		typ: ItemType.Number,
	});
});

test('negative exponent', () => {
	expect(new NumberNode(null, 0, '-1e9', ItemType.Number)).toEqual({
		num: -1e9,
		pos: 0,
		text: '-1e9',
		tree: null,
		typ: ItemType.Number,
	});
});

test('negative float', () => {
	expect(new NumberNode(null, 0, '-1.2', ItemType.Number)).toEqual({
		num: -1.2,
		pos: 0,
		text: '-1.2',
		tree: null,
		typ: ItemType.Number,
	});
});

test('big exponent', () => {
	expect(new NumberNode(null, 0, '1e19', ItemType.Number)).toEqual({
		num: 1e19,
		pos: 0,
		text: '1e19',
		tree: null,
		typ: ItemType.Number,
	});
});

test('exponent with seperator', () => {
	expect(new NumberNode(null, 0, '1e1_9', ItemType.Number)).toEqual({
		num: 1e1_9,
		pos: 0,
		text: '1e1_9',
		tree: null,
		typ: ItemType.Number,
	});
});

test('exponent with big `E`', () => {
	expect(new NumberNode(null, 0, '1E19', ItemType.Number)).toEqual({
		num: 1e19,
		pos: 0,
		text: '1E19',
		tree: null,
		typ: ItemType.Number,
	});
});

test('big negative exponent', () => {
	expect(new NumberNode(null, 0, '-1e19', ItemType.Number)).toEqual({
		num: -1e19,
		pos: 0,
		text: '-1e19',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0x_1p4', () => {
	expect(new NumberNode(null, 0, '0x_1p4', ItemType.Number)).toEqual({
		num: 16,
		pos: 0,
		text: '0x_1p4',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0X_1P4', () => {
	expect(new NumberNode(null, 0, '0X_1P4', ItemType.Number)).toEqual({
		num: 16,
		pos: 0,
		text: '0X_1P4',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0x_1p4', () => {
	expect(new NumberNode(null, 0, '0x_1p4', ItemType.Number)).toEqual({
		num: 16,
		pos: 0,
		text: '0x_1p4',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0X_1P4', () => {
	expect(new NumberNode(null, 0, '0X_1P4', ItemType.Number)).toEqual({
		num: 16,
		pos: 0,
		text: '0X_1P4',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0x_1p-4', () => {
	expect(new NumberNode(null, 0, '0x_1p-4', ItemType.Number)).toEqual({
		num: 1 / 16,
		pos: 0,
		text: '0x_1p-4',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0123', () => {
	expect(new NumberNode(null, 0, '0123', ItemType.Number)).toEqual({
		num: 0o123,
		pos: 0,
		text: '0123',
		tree: null,
		typ: ItemType.Number,
	});
});

test('-0x0', () => {
	expect(new NumberNode(null, 0, '-0x0', ItemType.Number)).toEqual({
		num: -0,
		pos: 0,
		text: '-0x0',
		tree: null,
		typ: ItemType.Number,
	});
});

test('0xdeadbeef', () => {
	expect(new NumberNode(null, 0, '0xdeadbeef', ItemType.Number)).toEqual({
		num: 0xdeadbeef,
		pos: 0,
		text: '0xdeadbeef',
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'a'`, () => {
	expect(new NumberNode(null, 0, `'a'`, ItemType.Number)).toEqual({
		num: 'a'.charCodeAt(0),
		pos: 0,
		text: `'a'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\n'`, () => {
	expect(new NumberNode(null, 0, `'\\n'`, ItemType.Number)).toEqual({
		num: '\n'.charCodeAt(0),
		pos: 0,
		text: `'\\n'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\\\'`, () => {
	expect(new NumberNode(null, 0, `'\\\\'`, ItemType.Number)).toEqual({
		num: '\\'.charCodeAt(0),
		pos: 0,
		text: `'\\\\'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\\'`, () => {
	expect(new NumberNode(null, 0, `'\\\''`, ItemType.Number)).toEqual({
		num: "'".charCodeAt(0),
		pos: 0,
		text: `'\\\''`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\xFF'`, () => {
	expect(new NumberNode(null, 0, `'\\xFF'`, ItemType.Number)).toEqual({
		num: 0xff,
		pos: 0,
		text: `'\\xFF'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'パ'`, () => {
	expect(new NumberNode(null, 0, `'パ'`, ItemType.Number)).toEqual({
		num: 0x30d1,
		pos: 0,
		text: `'パ'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\u30d1'`, () => {
	expect(new NumberNode(null, 0, `'\\u30d1'`, ItemType.Number)).toEqual({
		num: 0x30d1,
		pos: 0,
		text: `'\\u30d1'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'\\U000030d1'`, () => {
	expect(new NumberNode(null, 0, `'\\U000030d1'`, ItemType.Number)).toEqual({
		num: 0x30d1,
		pos: 0,
		text: `'\\U000030d1'`,
		tree: null,
		typ: ItemType.Number,
	});
});

test(`'+-2'`, () => {
	expect(() => new NumberNode(null, 0, `'+-2'`, ItemType.Number)).toThrow();
});

test(`+-2`, () => {
	expect(() => new NumberNode(null, 0, `+-2`, ItemType.Number)).toThrow();
});

test(`0x123.`, () => {
	expect(() => new NumberNode(null, 0, `0x123.`, ItemType.Number)).toThrow();
});

test(`1e.`, () => {
	expect(() => new NumberNode(null, 0, `1e.`, ItemType.Number)).toThrow();
});

test(`x`, () => {
	expect(() => new NumberNode(null, 0, `1e.`, ItemType.Number)).toThrow();
});

test(`xx`, () => {
	expect(() => new NumberNode(null, 0, `1e.`, ItemType.Number)).toThrow();
});

// We don't support complex numbers.
test(`1+2i`, () => {
	expect(() => new NumberNode(null, 0, `1+2i`, ItemType.Number)).toThrow();
});

/*************/
/** Text **/
/*************/
const builtins = [
	{
		printf: console.log,
		contains: String.prototype.includes,
	},
];

const parse = (s: string): string => {
	return new Tree(expect.getState().currentTestName ?? '', []).parse(s, '', '', {}, builtins).toString();
};

test('empty', () => {
	expect(parse('')).toBe('');
});

test('comment', () => {
	expect(parse('{{/*\n\n\n*/}}')).toBe('');
});

test('spaces', () => {
	expect(parse(' \t\n')).toBe(' \t\n');
});

test('text', () => {
	expect(parse('some text')).toBe('some text');
});

test('emptyAction', () => {
	expect(() => parse('{{}}')).toThrow();
});

test('field', () => {
	expect(parse('{{.X}}')).toBe('{{.X}}');
});

test('simple command', () => {
	expect(parse('{{printf}}')).toBe('{{printf}}');
});

test('$ invocation', () => {
	expect(parse('{{$}}')).toBe('{{$}}');
});

test('variable invocation', () => {
	expect(parse('{{with $x := 3}}{{$x 23}}{{end}}')).toBe('{{with $x := 3}}{{$x 23}}{{end}}');
});

test('variable with fields', () => {
	expect(parse('{{$.I}}')).toBe('{{$.I}}');
});

test('multi-word command', () => {
	expect(parse('printf `%d` 23')).toBe('printf `%d` 23');
});

test('pipeline', () => {
	expect(parse('{{.X|.Y}}')).toBe('{{.X | .Y}}');
});

test('pipeline with decl', () => {
	expect(parse('{{$x := .X|.Y}}')).toBe('{{$x := .X | .Y}}');
});

test('nested pipeline', () => {
	expect(parse('{{.X (.Y .Z) (.A | .B .C) (.E)}}')).toBe('{{.X (.Y .Z) (.A | .B .C) (.E)}}');
});

test('field applied to parentheses', () => {
	expect(parse('{{(.Y .Z).Field}}')).toBe('{{(.Y .Z).Field}}');
});

/// These differ from upstream go's tests, because upstream go uses the %q specifier for TextNode outputs, and
/// we don't get that because we don't get global variables.

test('simple if', () => {
	expect(parse('{{if .X}}hello{{end}}')).toBe('{{if .X}}hello{{end}}');
});

test('if with else', () => {
	expect(parse('{{if .X}}true{{else}}false{{end}}')).toBe('{{if .X}}true{{else}}false{{end}}');
});

test('if with else if', () => {
	expect(parse('{{if .X}}true{{else if .Y}}false{{end}}')).toBe('{{if .X}}true{{else}}{{if .Y}}false{{end}}{{end}}');
});

test('if else chain', () => {
	expect(parse('+{{if .X}}X{{else if .Y}}Y{{else if .Z}}Z{{end}}+')).toBe(
		'+{{if .X}}X{{else}}{{if .Y}}Y{{else}}{{if .Z}}Z{{end}}{{end}}{{end}}+'
	);
});

test('simple range', () => {
	expect(parse('{{range .X}}hello{{end}}')).toBe('{{range .X}}hello{{end}}');
});

test('chained range field', () => {
	expect(parse('{{range .X.Y.Z}}hello{{end}}')).toBe('{{range .X.Y.Z}}hello{{end}}');
});

test('nested range field', () => {
	expect(parse('{{range .X}}hello{{range .Y}}goodbye{{end}}{{end}}')).toBe('{{range .X}}hello{{range .Y}}goodbye{{end}}{{end}}');
});

test('range with else', () => {
	expect(parse('{{range .X}}true{{else}}false{{end}}')).toBe('{{range .X}}true{{else}}false{{end}}');
});

test('range over pipeline', () => {
	expect(parse('{{range .X|.M}}true{{else}}false{{end}}')).toBe('{{range .X | .M}}true{{else}}false{{end}}');
});

test('range []int', () => {
	expect(parse('{{range .SI}}{{.}}{{end}}')).toBe('{{range .SI}}{{.}}{{end}}');
});

test('range 1 var', () => {
	expect(parse('{{range $x := .SI}}{{.}}{{end}}')).toBe('{{range $x := .SI}}{{.}}{{end}}');
});

test('range 2 vars', () => {
	expect(parse('{{range $x, $y := .SI}}{{.}}{{end}}')).toBe('{{range $x, $y := .SI}}{{.}}{{end}}');
});

test('range with break', () => {
	expect(parse('{{range .SI}}{{.}}{{break}}{{end}}')).toBe('{{range .SI}}{{.}}{{break}}{{end}}');
});

test('range with continue', () => {
	expect(parse('{{range .SI}}{{.}}{{continue}}{{end}}')).toBe('{{range .SI}}{{.}}{{continue}}{{end}}');
});

test('constants', () => {
	expect(parse("{{range .SI 1 true false 'a' nil}}{{end}}")).toBe("{{range .SI 1 true false 'a' nil}}{{end}}");
});

test('template', () => {
	expect(parse('{{template `x`}}')).toBe('{{template "x"}}');
});

test('template with arg', () => {
	expect(parse('{{template `x` .Y}}')).toBe('{{template "x" .Y}}');
});

test('with', () => {
	expect(parse('{{with .X}}hello{{end}}')).toBe('{{with .X}}hello{{end}}');
});

test('with with var', () => {
	expect(parse('{{with $x := 4}}$x{{end}}')).toBe('{{with $x := 4}}$x{{end}}');
});

test('with with else', () => {
	expect(parse('{{with .X}}hello{{else}}goodbye{{end}}')).toBe('{{with .X}}hello{{else}}goodbye{{end}}');
});

test('with with else with', () => {
	expect(parse('{{with .X}}hello{{else with .Y}}goodbye{{end}}')).toBe('{{with .X}}hello{{else}}{{with .Y}}goodbye{{end}}{{end}}');
});

test('with else chain', () => {
	expect(parse('{{with .X}}X{{else with .Y}}Y{{else with .Z}}Z{{end}}')).toBe(
		'{{with .X}}X{{else}}{{with .Y}}Y{{else}}{{with .Z}}Z{{end}}{{end}}{{end}}'
	);
});

test('trim left', () => {
	expect(parse('x \r\n\t{{- 3}}')).toBe('x{{3}}');
});

test('trim right', () => {
	expect(parse('{{3 -}}\n\n\ty')).toBe('{{3}}y');
});

test('trim left and right', () => {
	expect(parse('x \r\n\t{{- 3 -}}\n\n\ty')).toBe('x{{3}}y');
});

test('trim with extra spaces', () => {
	expect(parse('x\n{{-  3   -}}\ny')).toBe('x{{3}}y');
});

test('comment trim left', () => {
	expect(parse('x \r\n\t{{- /* hi */}}')).toBe('x');
});

test('comment trim right', () => {
	expect(parse('{{/* hi */ -}}\n\n\ty')).toBe('y');
});

test('comment trim left and right', () => {
	expect(parse('x \r\n\t{{- /* */ -}}\n\n\ty')).toBe('xy');
});

test('block definition', () => {
	expect(parse('{{block "foo" .}}hello{{end}}')).toBe('{{template "foo" .}}');
});

test('newline in assignment', () => {
	expect(parse('{{ $x \n := \n 1 \n }}')).toBe('{{$x := 1}}');
});

test('newline in empty action', () => {
	expect(() => parse('{{\n}}')).toThrow();
});

test('newline in pipeline', () => {
	expect(parse('{{\n"x"\n|\nprintf\n}}')).toBe('{{"x" | printf}}');
});

test('newline in comment', () => {
	expect(parse('{{/*\nhello\n*/}}')).toBe('');
});

test('newline in comment2', () => {
	expect(parse('{{-\n/*\nhello\n*/\n-}}')).toBe('');
});

test('spaces around continue', () => {
	expect(parse('{{range .SI}}{{.}}{{ continue }}{{end}}')).toBe('{{range .SI}}{{.}}{{continue}}{{end}}');
});

test('spaces around break', () => {
	expect(parse('{{range .SI}}{{.}}{{ break }}{{end}}')).toBe('{{range .SI}}{{.}}{{break}}{{end}}');
});

/**********/
/**Errors**/
/**********/

test('unclosed action', () => {
	expect(() => parse('hello{{range", hasError, "')).toThrow();
});

test('unmatched end', () => {
	expect(() => parse('{{end}}')).toThrow();
});

test('unmatched else', () => {
	expect(() => parse('{{else}}')).toThrow();
});

test('unmatched else after if', () => {
	expect(() => parse('{{if .X}}hello{{end}}{{else}}')).toThrow();
});

test('multiple else', () => {
	expect(() => parse('{{if .X}}1{{else}}2{{else}}3{{end}}')).toThrow();
});

test('missing end', () => {
	expect(() => parse('hello{{range .x}}')).toThrow();
});

test('missing end after else', () => {
	expect(() => parse('hello{{range .x}}{{else}}')).toThrow();
});

test('undefined function', () => {
	expect(() => parse('hello{{undefined}}')).toThrow();
});

test('undefined variable', () => {
	expect(() => parse('hello{{$x}}')).toThrow();
});

test('variable undefined after end', () => {
	expect(() => parse('{{with $x := 4}}{{end}}{{$x}}')).toThrow();
});

test('variable undefined in template', () => {
	expect(() => parse('{{template $v}}')).toThrow();
});

test('declare with field', () => {
	expect(() => parse('{{with $x.Y := 4}}{{end}}')).toThrow();
});

test('template with field ref', () => {
	expect(() => parse('{{template .X}}')).toThrow();
});

test('template with var', () => {
	expect(() => parse('{{template $v}}')).toThrow();
});

test('invalid puncuation', () => {
	expect(() => parse('{{printf 3, 4}}')).toThrow();
});

test('multidecl outside range', () => {
	expect(() => parse('{{with $v, $u := 3}}{{end}}')).toThrow();
});

test('too many decls in range', () => {
	expect(() => parse('{{range $u, $v, $w := 3}}{{end}}')).toThrow();
});

test('dot applied to parentheses', () => {
	expect(() => parse('{{printf (printf .).}}')).toThrow();
});

test('adjacent args', () => {
	expect(() => parse('{{printf 3`x`}}')).toThrow();
});

test('adjacent args with .', () => {
	expect(() => parse('{{printf `x`.}}')).toThrow();
});

test('extra end after if', () => {
	expect(() => parse('{{if .X}}a{{else if .Y}}b{{end}}{{end}}')).toThrow();
});

test('break outside range', () => {
	expect(() => parse('{{range .}}{{end}} {{break}}')).toThrow();
});

test('continue outside range', () => {
	expect(() => parse('{{range .}}{{end}} {{continue}}')).toThrow();
});

test('break in range else', () => {
	expect(() => parse('{{range .}}{{else}}{{break}}{{end}}')).toThrow();
});

test('continue in range else', () => {
	expect(() => parse('{{range .}}{{else}}{{break}}{{end}}')).toThrow();
});

test('bug0a', () => {
	expect(parse('{{$x := 0}}{{$x}}')).toBe('{{$x := 0}}{{$x}}');
});

test('bug0b', () => {
	expect(() => parse('{{$x += 1}}{{$x}}')).toThrow();
});

test('bug0c', () => {
	expect(() => parse('{{$x ! 2}}{{$x}}')).toThrow();
});

test('bug0d', () => {
	expect(() => parse('{{$x % 3}}{{$x}}')).toThrow();
});

// Check the parse fails for := rather than comma.
test('bug0e', () => {
	expect(() => parse('{{range $x := $y := 3}}{{end}}')).toThrow();
});

test('bug1a', () => {
	expect(() => parse('{{$x:=.}}{{$x!2}}')).toThrow();
});

test('bug1b', () => {
	expect(() => parse('{{$x:=.}}{{$x+2}}')).toThrow();
});

test('bug1c', () => {
	expect(parse('{{$x:=.}}{{$x +2}}')).toBe('{{$x := .}}{{$x +2}}');
});

// // Check the range handles assignment vs. declaration properly.
test('bug2a', () => {
	expect(parse('{{range $x := 0}}{{$x}}{{end}}')).toBe('{{range $x := 0}}{{$x}}{{end}}');
});

test('bug2b', () => {
	expect(parse('{{range $x = 0}}{{$x}}{{end}}')).toBe('{{range $x = 0}}{{$x}}{{end}}');
});

// dot following a literal value
test('dot after integer', () => {
	expect(() => parse('{{1.E}}')).toThrow();
});

test('dot after float', () => {
	expect(() => parse('{{0.1.E}}')).toThrow();
});

test('dot after boolean', () => {
	expect(() => parse('{{true.E}}')).toThrow();
});

test('dot after char', () => {
	expect(() => parse("{{'a'.any}}")).toThrow();
});

test('dot after string', () => {
	expect(() => parse('{{"hello".guys}}')).toThrow();
});

test('dot after dot', () => {
	expect(() => parse('{{..E}}')).toThrow();
});

test('dot after nil', () => {
	expect(() => parse('{{nil.E}}')).toThrow();
});

// Wrong pipeline
test('wrong pipeline dot', () => {
	expect(() => parse('{{12|.}}')).toThrow();
});

test('wrong pipeline number', () => {
	expect(() => parse('{{.|12|printf}}')).toThrow();
});

test('wrong pipeline string', () => {
	expect(() => parse('{{.|printf|"error"}}')).toThrow();
});

test('wrong pipeline char', () => {
	expect(() => parse("{{12|printf|'e'}}")).toThrow();
});

test('wrong pipeline boolean', () => {
	expect(() => parse('{{.|true}}')).toThrow();
});

test('wrong pipeline nil', () => {
	expect(() => parse("{{'c'|nil}}")).toThrow();
});

test('empty pipeline', () => {
	expect(() => parse('{{printf "%d" ( ) }}')).toThrow();
});

// Missing pipeline in block
test('empty pipeline', () => {
	expect(() => parse('{{block "foo"}}hello{{end}}')).toThrow();
});
