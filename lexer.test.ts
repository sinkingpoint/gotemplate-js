import { ItemType, Item, Lexer } from './lexer';

interface LexTest {
	name: string;
	input: string;
	items: Item[];
}

function mkItem(type: ItemType, value: string): any {
	return expect.objectContaining({
		typ: type,
		val: value,
	});
}

// Predefined items.
const tDot = mkItem(ItemType.Dot, '.');
const tBlock = mkItem(ItemType.Block, 'block');
const tEOF = mkItem(ItemType.EOF, '');
const tFor = mkItem(ItemType.Identifier, 'for');
const tLeft = mkItem(ItemType.LeftDelim, '{{');
const tLpar = mkItem(ItemType.LeftParen, '(');
const tPipe = mkItem(ItemType.Pipe, '|');
const tQuote = mkItem(ItemType.String, `\"abc \\n\\t\\\" \"`);
const tRange = mkItem(ItemType.Range, 'range');
const tRight = mkItem(ItemType.RightDelim, '}}');
const tRpar = mkItem(ItemType.RightParen, ')');
const tSpace = mkItem(ItemType.Space, ' ');
const raw = '`' + `abc\n\t\" ` + '`';
const rawNL = '`now is{{\n}}the time`'; // Contains newline inside raw quote.
const tRawQuote = mkItem(ItemType.RawString, raw);
const tRawQuoteNL = mkItem(ItemType.RawString, rawNL);

test('empty', () => {
	expect(collect('')).toStrictEqual([tEOF]);
});

test('spaces', () => {
	expect(collect(' \t\n')).toStrictEqual([mkItem(ItemType.Text, ' \t\n'), tEOF]);
});

test('text', () => {
	expect(collect(`now is the time`)).toStrictEqual([mkItem(ItemType.Text, 'now is the time'), tEOF]);
});

test('text with comment', () => {
	expect(collect(`hello-{{/* this is a comment */}}-world`)).toStrictEqual([
		mkItem(ItemType.Text, 'hello-'),
		mkItem(ItemType.Comment, '/* this is a comment */'),
		mkItem(ItemType.Text, '-world'),
		tEOF,
	]);
});

test('punctuation', () => {
	expect(collect('{{,@% }}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Char, ','),
		mkItem(ItemType.Char, '@'),
		mkItem(ItemType.Char, '%'),
		tSpace,
		tRight,
		tEOF,
	]);
});

test('parens', () => {
	expect(collect('{{((3))}}')).toStrictEqual([tLeft, tLpar, tLpar, mkItem(ItemType.Number, '3'), tRpar, tRpar, tRight, tEOF]);
});

test('empty action', () => {
	expect(collect('{{}}')).toStrictEqual([tLeft, tRight, tEOF]);
});

test('for', () => {
	expect(collect('{{for}}')).toStrictEqual([tLeft, tFor, tRight, tEOF]);
});

test('block', () => {
	expect(collect('{{block "foo" .}}')).toStrictEqual([tLeft, tBlock, tSpace, mkItem(ItemType.String, `"foo"`), tSpace, tDot, tRight, tEOF]);
});

test('quote', () => {
	expect(collect(`{{\"abc \\n\\t\\\" \"}}`)).toStrictEqual([tLeft, tQuote, tRight, tEOF]);
});

test('raw quote', () => {
	const raw = '`' + `abc\n\t\" ` + '`';
	expect(collect('{{' + raw + '}}')).toStrictEqual([tLeft, tRawQuote, tRight, tEOF]);
});

test('raw quote with newline', () => {
	const rawNL = '`now is{{\n}}the time`';
	expect(collect('{{' + rawNL + '}}')).toStrictEqual([tLeft, tRawQuoteNL, tRight, tEOF]);
});

test('numbers', () => {
	expect(collect('{{1 02 0x14 0X14 -7.2i 1e3 1E3 +1.2e-4 4.2i 1+2i 1_2 0x1.e_fp4 0X1.E_FP4}}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Number, '1'),
		tSpace,
		mkItem(ItemType.Number, '02'),
		tSpace,
		mkItem(ItemType.Number, '0x14'),
		tSpace,
		mkItem(ItemType.Number, '0X14'),
		tSpace,
		mkItem(ItemType.Number, '-7.2i'),
		tSpace,
		mkItem(ItemType.Number, '1e3'),
		tSpace,
		mkItem(ItemType.Number, '1E3'),
		tSpace,
		mkItem(ItemType.Number, '+1.2e-4'),
		tSpace,
		mkItem(ItemType.Number, '4.2i'),
		tSpace,
		mkItem(ItemType.Complex, '1+2i'),
		tSpace,
		mkItem(ItemType.Number, '1_2'),
		tSpace,
		mkItem(ItemType.Number, '0x1.e_fp4'),
		tSpace,
		mkItem(ItemType.Number, '0X1.E_FP4'),
		tRight,
		tEOF,
	]);
});

test('characters', () => {
	expect(collect(`{{'a' '\\n' '\\'' '\\u00FF' '\\xFF' '本'}}`)).toStrictEqual([
		tLeft,
		mkItem(ItemType.CharConstant, `'a'`),
		tSpace,
		mkItem(ItemType.CharConstant, `'\\n'`),
		tSpace,
		mkItem(ItemType.CharConstant, `'\\''`),
		tSpace,
		mkItem(ItemType.CharConstant, `'\\u00FF'`),
		tSpace,
		mkItem(ItemType.CharConstant, `'\\xFF'`),
		tSpace,
		mkItem(ItemType.CharConstant, `'本'`),
		tRight,
		tEOF,
	]);
});

test('bools', () => {
	expect(collect(`{{true false}}`)).toStrictEqual([
		tLeft,
		mkItem(ItemType.Bool, 'true'),
		tSpace,
		mkItem(ItemType.Bool, 'false'),
		tRight,
		tEOF,
	]);
});

test('dot', () => {
	expect(collect(`{{.}}`)).toStrictEqual([tLeft, tDot, tRight, tEOF]);
});

test('nil', () => {
	expect(collect(`{{nil}}`)).toStrictEqual([tLeft, mkItem(ItemType.Nil, 'nil'), tRight, tEOF]);
});

test('dots', () => {
	expect(collect(`{{.x . .2 .x.y.z}}`)).toStrictEqual([
		tLeft,
		mkItem(ItemType.Field, '.x'),
		tSpace,
		tDot,
		tSpace,
		mkItem(ItemType.Number, '.2'),
		tSpace,
		mkItem(ItemType.Field, '.x'),
		mkItem(ItemType.Field, '.y'),
		mkItem(ItemType.Field, '.z'),
		tRight,
		tEOF,
	]);
});

test('keywords', () => {
	expect(collect('{{range if else end with}}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Range, 'range'),
		tSpace,
		mkItem(ItemType.If, 'if'),
		tSpace,
		mkItem(ItemType.Else, 'else'),
		tSpace,
		mkItem(ItemType.End, 'end'),
		tSpace,
		mkItem(ItemType.With, 'with'),
		tRight,
		tEOF,
	]);
});

test('variables', () => {
	expect(collect('{{$c := printf $ $hello $23 $ $var.Field .Method}}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Variable, '$c'),
		tSpace,
		mkItem(ItemType.Declare, ':='),
		tSpace,
		mkItem(ItemType.Identifier, 'printf'),
		tSpace,
		mkItem(ItemType.Variable, '$'),
		tSpace,
		mkItem(ItemType.Variable, '$hello'),
		tSpace,
		mkItem(ItemType.Variable, '$23'),
		tSpace,
		mkItem(ItemType.Variable, '$'),
		tSpace,
		mkItem(ItemType.Variable, '$var'),
		mkItem(ItemType.Field, '.Field'),
		tSpace,
		mkItem(ItemType.Field, '.Method'),
		tRight,
		tEOF,
	]);
});

test('variable invocation', () => {
	expect(collect('{{$x 23}}')).toStrictEqual([tLeft, mkItem(ItemType.Variable, '$x'), tSpace, mkItem(ItemType.Number, '23'), tRight, tEOF]);
});

test('pipeline', () => {
	expect(collect('intro {{echo hi 1.2 |noargs|args 1 "hi"}} outro')).toStrictEqual([
		mkItem(ItemType.Text, 'intro '),
		tLeft,
		mkItem(ItemType.Identifier, 'echo'),
		tSpace,
		mkItem(ItemType.Identifier, 'hi'),
		tSpace,
		mkItem(ItemType.Number, '1.2'),
		tSpace,
		tPipe,
		mkItem(ItemType.Identifier, 'noargs'),
		tPipe,
		mkItem(ItemType.Identifier, 'args'),
		tSpace,
		mkItem(ItemType.Number, '1'),
		tSpace,
		mkItem(ItemType.String, `"hi"`),
		tRight,
		mkItem(ItemType.Text, ' outro'),
		tEOF,
	]);
});

test('declaration', () => {
	expect(collect('{{$v := 3}}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Variable, '$v'),
		tSpace,
		mkItem(ItemType.Declare, ':='),
		tSpace,
		mkItem(ItemType.Number, '3'),
		tRight,
		tEOF,
	]);
});

test('2 declarations', () => {
	expect(collect('{{$v , $w := 3}}')).toStrictEqual([
		tLeft,
		mkItem(ItemType.Variable, '$v'),
		tSpace,
		mkItem(ItemType.Char, ','),
		tSpace,
		mkItem(ItemType.Variable, '$w'),
		tSpace,
		mkItem(ItemType.Declare, ':='),
		tSpace,
		mkItem(ItemType.Number, '3'),
		tRight,
		tEOF,
	]);
});

test('field of parenthesized expression', () => {
	expect(collect('{{(.X).Y}}')).toStrictEqual([
		tLeft,
		tLpar,
		mkItem(ItemType.Field, '.X'),
		tRpar,
		mkItem(ItemType.Field, '.Y'),
		tRight,
		tEOF,
	]);
});

test('trimming spaces before and after', () => {
	expect(collect('hello- {{- 3 -}} -world')).toStrictEqual([
		mkItem(ItemType.Text, 'hello-'),
		tLeft,
		mkItem(ItemType.Number, '3'),
		tRight,
		mkItem(ItemType.Text, '-world'),
		tEOF,
	]);
});

test('trimming spaces before and after comment', () => {
	expect(collect('hello- {{- /* hello */ -}} -world')).toStrictEqual([
		mkItem(ItemType.Text, 'hello-'),
		mkItem(ItemType.Comment, '/* hello */'),
		mkItem(ItemType.Text, '-world'),
		tEOF,
	]);
});

test('badchar', () => {
	expect(collect('#{{\x01}}')).toStrictEqual([
		mkItem(ItemType.Text, '#'),
		tLeft,
		mkItem(ItemType.Error, 'unrecognized character in action: U+0001'),
	]);
});

test('unclosed action', () => {
	expect(collect('{{')).toStrictEqual([tLeft, mkItem(ItemType.Error, 'unclosed action')]);
});

test('EOF in action', () => {
	expect(collect('{{range')).toStrictEqual([tLeft, tRange, mkItem(ItemType.Error, 'unclosed action')]);
});

test('unclosed quote', () => {
	expect(collect('{{"\n"}}')).toStrictEqual([tLeft, mkItem(ItemType.Error, 'unterminated quoted string')]);
});

test('unclosed raw quote', () => {
	expect(collect('{{`xx}}')).toStrictEqual([tLeft, mkItem(ItemType.Error, 'unterminated raw quoted string')]);
});

test('unclosed char constant', () => {
	expect(collect("{{'\n}}")).toStrictEqual([tLeft, mkItem(ItemType.Error, 'unterminated character constant')]);
});

test('bad number', () => {
	expect(collect('{{3k}}')).toStrictEqual([tLeft, mkItem(ItemType.Error, 'bad number syntax: "3k"')]);
});

test('unclosed paren', () => {
	expect(collect('{{(3}}')).toStrictEqual([tLeft, tLpar, mkItem(ItemType.Number, '3'), mkItem(ItemType.Error, 'unclosed left paren')]);
});

test('extra right paren', () => {
	expect(collect('{{3)}}')).toStrictEqual([tLeft, mkItem(ItemType.Number, '3'), mkItem(ItemType.Error, 'unexpected right paren')]);
});

test('long pipeline deadlock', () => {
	expect(collect('{{|||||}}')).toStrictEqual([tLeft, tPipe, tPipe, tPipe, tPipe, tPipe, tRight, tEOF]);
});

test('text with bad comment', () => {
	expect(collect('hello-{{/*/}}-world')).toStrictEqual([mkItem(ItemType.Text, 'hello-'), mkItem(ItemType.Error, `unclosed comment`)]);
});

test('text with comment close separated from delim', () => {
	expect(collect('hello-{{/* */ }}-world')).toStrictEqual([
		mkItem(ItemType.Text, 'hello-'),
		mkItem(ItemType.Error, `comment ends before closing delimiter`),
	]);
});

test('unmatched right delimiter', () => {
	expect(collect('hello-{.}}-world')).toStrictEqual([mkItem(ItemType.Text, 'hello-{.}}-world'), tEOF]);
});

function collect(input: string): Item[] {
	const lexer = new Lexer('test', input, '', '');
	lexer.options = {
		emitComments: true,
		breakOK: true,
		continueOK: true,
	};

	const items: Item[] = [];
	while (true) {
		const item = lexer.nextItem();
		items.push(item);
		if (item.typ === ItemType.EOF || item.typ === ItemType.Error) {
			break;
		}
	}
	return items;
}
