/// The default chars that start a block.
const DEFAULT_LEFT_DELIM = '{{';

/// The default chars that end a block.
const DEFAULT_RIGHT_DELIM = '}}';

/// The chars that start a comment.
const LEFT_COMMENT = '/*';

/// The chars that end a comment.
const RIGHT_COMMENT = '*/';

/// The char that indicates we've hit the end of the input.
const EOF = '\x03';

/// The char that indicates that we should chomp any whitespace around a block.
const trimMarker = '-';

/// The length of the trim marker (1 char + 1 space).
const trimMarkerLen = trimMarker.length + 1;

// prettier-ignore
export enum ItemType {
	Error         = "error",         // error occurred; value is text of error
	Bool          = "bool",          // boolean constant
	Char          = "char",          // printable ASCII character; grab bag for comma etc.
	CharConstant  = "char constant",  // character constant
	Comment       = "comment",       // comment text
	Complex       = "complex",       // complex constant (1+2i); imaginary is just a number
	Assign        = "assign",        // equals ('=') introducing an assignment
	Declare       = "declare",       // colon-equals (':=') introducing a declaration
	EOF           = "eof",
	Field         = "field",         // alphanumeric identifier starting with '.'
	Identifier    = "identifier",    // alphanumeric identifier not starting with '.'
	LeftDelim     = "left_delim",    // left action delimiter
	LeftParen     = "left_paren",    // '(' inside action
	Number        = "number",        // simple number, including imaginary
	Pipe          = "pipe",          // pipe symbol
	RawString     = "raw_string",    // raw quoted string (includes quotes)
	RightDelim    = "right_delim",   // right action delimiter
	RightParen    = "right_paren",   // ')' inside action
	Space         = "space",         // run of spaces separating arguments
	String        = "string",        // quoted string (includes quotes)
	Text          = "text",          // plain text
	Variable      = "variable",      // variable starting with '$', such as '$' or '$1' or '$hello'
	Keyword       = "keyword",       // used only to delimit the keywords
	Block         = "block",         // block keyword
	Break         = "break",         // break keyword
	Continue      = "continue",      // continue keyword
	Dot           = "dot",           // the cursor, spelled '.'
	Define        = "define",        // define keyword
	Else          = "else",          // else keyword
	End           = "end",           // end keyword
	If            = "if",            // if keyword
	Nil           = "nil",           // the untyped nil constant, easiest to treat as a keyword
	Range         = "range",         // range keyword
	Template      = "template",      // template keyword
	With          = "with",          // with keyword
}

export class Item {
	typ: ItemType;
	pos: number;
	val: string;
	line: number;

	constructor(typ: ItemType, pos: number, val: string, line: number) {
		this.typ = typ;
		this.pos = pos;
		this.val = val;
		this.line = line;
	}

	toString(): string {
		if (this.typ === ItemType.EOF) {
			return 'EOF';
		} else if (this.typ === ItemType.Error) {
			return this.val;
		} else if (this.typ > ItemType.Keyword) {
			return `<${this.val}>`;
		} else if (this.val.length > 10) {
			return this.val.substring(0, 10);
		} else {
			return this.val;
		}
	}
}

interface LexOptions {
	// If true, output Items with ItemType.Comment, indicating any comments that we hit along the way.
	emitComments: boolean;

	// If true, allow the `break` keyword.
	breakOK: boolean;

	// If true, allow the `continue` keyword.
	continueOK: boolean;
}

type StateFunction = ((l: Lexer) => StateFunction) | null;

export class Lexer {
	name: string;
	input: string;
	leftDelim: string;
	rightDelim: string;
	pos: number;
	start: number;
	atEOF: boolean;
	parenDepth: number;
	line: number;
	startLine: number;
	item: Item | undefined;
	insideAction: boolean;
	options: LexOptions;

	constructor(name: string, input: string, leftDelim: string, rightDelim: string) {
		if (!leftDelim) {
			leftDelim = DEFAULT_LEFT_DELIM;
		}

		if (!rightDelim) {
			rightDelim = DEFAULT_RIGHT_DELIM;
		}

		this.name = name;
		this.input = input;
		this.leftDelim = leftDelim;
		this.rightDelim = rightDelim;
		this.pos = 0;
		this.start = 0;
		this.atEOF = false;
		this.parenDepth = 0;
		this.line = 1;
		this.startLine = 1;
		this.insideAction = false;
		this.options = {
			emitComments: false,
			breakOK: false,
			continueOK: false,
		};
	}

	/// Advance the lexer and return the next char in the input, or EOF if there are no more.
	nextChar(): string {
		if (this.pos >= this.input.length) {
			this.atEOF = true;
			return EOF;
		}

		const rune = this.input[this.pos];
		this.pos += 1;
		if (rune === '\n') {
			this.line += 1;
		}

		return rune;
	}

	/// Go back one character in the input.
	backup() {
		if (!this.atEOF && this.pos > 0) {
			const rune = this.input[this.pos - 1];
			this.pos -= 1;
			if (rune === '\n') {
				this.line -= 1;
			}
		}
	}

	/// Returns the next character, without consuming it.
	peek(): string {
		const rune = this.nextChar();
		this.backup();
		return rune;
	}

	/// Return the last encountered item, and advance the lexer to the next item.
	thisItem(typ: ItemType): Item {
		const item = new Item(typ, this.start, this.input.substring(this.start, this.pos), this.startLine);
		this.start = this.pos;
		this.startLine = this.line;
		return item;
	}

	/// Mark the current item as the given ItemType.
	emit(typ: ItemType): StateFunction {
		return this.emitItem(this.thisItem(typ));
	}

	/// Emit the given Item as the next item.
	emitItem(i: Item): StateFunction {
		this.item = i;
		return null;
	}

	/// Ignore the current item and advance the lexer to the next Item.
	ignore() {
		const input = this.input.substring(this.start, this.pos);
		const numNewLines = countNewLines(input);
		this.line += numNewLines;
		this.start = this.pos;
		this.startLine = this.line;
	}

	/// Accept one of the given chars in the given string, returning true if we accepted one.
	accept(valid: string): boolean {
		if (valid.includes(this.nextChar())) {
			return true;
		}

		this.backup();
		return false;
	}

	/// Accept a run of valid characters.
	acceptRun(valid: string) {
		while (valid.includes(this.nextChar())) {}
		this.backup();
	}

	/// Output an error value.
	errorf(val: string): StateFunction {
		this.item = new Item(ItemType.Error, this.start, val, this.startLine);
		this.start = 0;
		this.pos = 0;
		this.input = '';
		return null;
	}

	/// Run the lexer and return the next Item.
	nextItem(): Item {
		this.item = new Item(ItemType.EOF, this.pos, 'EOF', this.startLine);
		let state = lexText;
		if (this.insideAction) {
			state = lexInsideAction;
		}

		while (state !== null) {
			state = state(this);
		}

		return this.item;
	}

	/// Return if we're at a right marker (`}}`), and whether it has a chomp indicator (`-}}`)
	atRightDelim(): [boolean, boolean] {
		if (hasRightTrimMarker(this.input.substring(this.pos)) && this.input.substring(this.pos + trimMarkerLen).startsWith(this.rightDelim)) {
			return [true, true];
		}

		if (this.input.substring(this.pos).startsWith(this.rightDelim)) {
			return [true, false];
		}

		return [false, false];
	}

	/// Return true if we're at a character that terminates an Item.
	atTerminator(): boolean {
		const rune = this.peek();
		if (isSpace(rune)) {
			return true;
		}

		if ([EOF, '.', ',', '|', ':', '(', ')'].includes(rune)) {
			return true;
		}

		return this.input.substring(this.pos).startsWith(this.rightDelim);
	}

	/// Attempt to read a number from the current position, returning true if we were sucessful.
	scanNumber(): boolean {
		this.accept('+-');
		let digits = '0123456789_';
		if (this.accept('0')) {
			if (this.accept('xX')) {
				digits = '0123456789abcdefABCDEF_';
			} else if (this.accept('oO')) {
				digits = '01234567_';
			} else if (this.accept('bB')) {
				digits = '01_';
			}
		}

		/// Handle floats.
		this.acceptRun(digits);
		if (this.accept('.')) {
			this.acceptRun(digits);
		}

		// Accept scientific notation, e.g. 3e10.
		if (digits.length === 10 + 1 && this.accept('eE')) {
			this.accept('+-');
			this.acceptRun(digits);
		}

		if (digits.length === 16 + 6 + 1 && this.accept('pP')) {
			this.accept('+1');
			this.accept('0123456789_');
		}

		// Complex Numbers.
		this.accept('i');
		if (isAlphaNumeric(this.peek())) {
			// There should be a space after this number.
			this.nextChar();
			return false;
		}

		return true;
	}
}

// Attempt to parse an ItemType.Text.
const lexText: StateFunction = (l: Lexer): StateFunction => {
	const nextText = l.input.substring(l.pos);
	const nextLeftDelim = nextText.indexOf(l.leftDelim);
	if (nextLeftDelim > 0) {
		l.pos += nextLeftDelim;
		let trimLength = 0;
		const delimEnd = l.pos + l.leftDelim.length;
		if (hasLeftTrimMarker(l.input.substring(delimEnd))) {
			trimLength = rightTrimLength(l.input.substring(l.start, l.pos));
		}

		l.pos -= trimLength;
		l.line += countNewLines(l.input.substring(l.start, l.pos));
		const item = l.thisItem(ItemType.Text);
		l.pos += trimLength;
		l.ignore();
		if (item.val.length > 0) {
			return l.emitItem(item);
		}
	} else if (nextLeftDelim === 0) {
		return lexLeftDelim;
	}

	l.pos = l.input.length;
	if (l.pos > l.start) {
		l.line += countNewLines(l.input.substring(l.start, l.pos));
		return l.emit(ItemType.Text);
	}

	return l.emit(ItemType.EOF);
};

/// Attempt to parse a left delimiter (`{{`).
const lexLeftDelim = (l: Lexer): StateFunction => {
	l.pos += l.leftDelim.length;
	const trimSpace = hasLeftTrimMarker(l.input.substring(l.pos));
	let afterMarker = 0;
	if (trimSpace) {
		afterMarker = trimMarkerLen;
	}

	const val = l.input.substring(l.pos + afterMarker);
	if (val.startsWith(LEFT_COMMENT)) {
		l.pos += afterMarker;
		l.ignore();
		return lexComment;
	}

	const item = l.thisItem(ItemType.LeftDelim);
	l.insideAction = true;
	l.pos += afterMarker;
	l.ignore();
	l.parenDepth = 0;
	return l.emitItem(item);
};

// Attempt to parse a right delimiter (`}}`)
const lexRightDelim = (l: Lexer): StateFunction => {
	const [_, trimSpace] = l.atRightDelim();
	if (trimSpace) {
		l.pos += trimMarkerLen;
		l.ignore();
	}

	l.pos += l.rightDelim.length;
	const item = l.thisItem(ItemType.RightDelim);
	if (trimSpace) {
		l.pos += leftTrimLength(l.input.substring(l.pos));
		l.ignore();
	}

	l.insideAction = false;
	return l.emitItem(item);
};

const lexSpace = (l: Lexer): StateFunction => {
	let numSpaces = 0;
	while (isSpace(l.peek())) {
		numSpaces += 1;
		l.nextChar();
	}

	if (hasRightTrimMarker(l.input.substring(l.pos - 1)) && l.input.substring(l.pos - 1 + trimMarkerLen).startsWith(l.rightDelim)) {
		l.backup();
		if (numSpaces === 1) {
			return lexRightDelim;
		}
	}

	return l.emit(ItemType.Space);
};

const lexQuote = (l: Lexer): StateFunction => {
	while (true) {
		const rune = l.nextChar();
		if (rune === '\\') {
			const nextRune = l.nextChar();
			if (nextRune !== EOF && nextRune !== '\n') {
				continue;
			}

			return l.errorf('unterminated quoted string');
		} else if (rune === EOF || rune === '\n') {
			return l.errorf('unterminated quoted string');
		} else if (rune === '"') {
			break;
		}
	}

	return l.emit(ItemType.String);
};

const lexRawQuote = (l: Lexer): StateFunction => {
	while (true) {
		const rune = l.nextChar();
		if (rune === EOF) {
			return l.errorf('unterminated raw quoted string');
		} else if (rune === '`') {
			break;
		}
	}

	return l.emit(ItemType.RawString);
};

const lexComment = (l: Lexer): StateFunction => {
	l.pos += LEFT_COMMENT.length;
	const endPos = l.input.substring(l.pos).indexOf(RIGHT_COMMENT);
	if (endPos < 0) {
		return l.errorf('unclosed comment');
	}

	l.pos += endPos + RIGHT_COMMENT.length;
	const [delim, trimSpace] = l.atRightDelim();
	if (!delim) {
		return l.errorf('comment ends before closing delimiter');
	}

	const item = l.thisItem(ItemType.Comment);
	if (trimSpace) {
		l.pos += trimMarkerLen;
	}

	l.pos += l.rightDelim.length;
	if (trimSpace) {
		l.pos += leftTrimLength(l.input.substring(l.pos));
	}
	l.ignore();
	if (l.options.emitComments) {
		return l.emitItem(item);
	}

	return lexText;
};

const lexVariable = (l: Lexer): StateFunction => {
	if (l.atTerminator()) {
		return l.emit(ItemType.Variable);
	}

	return lexFieldOrVariable(l, ItemType.Variable);
};

const lexFieldOrVariable = (l: Lexer, typ: ItemType): StateFunction => {
	if (l.atTerminator()) {
		if (typ == ItemType.Variable) {
			return l.emit(ItemType.Variable);
		}

		return l.emit(ItemType.Dot);
	}

	while (isAlphaNumeric(l.nextChar())) {}
	l.backup();
	const rune = l.peek();

	if (!l.atTerminator()) {
		return l.errorf(`bad character: ${toStringCodePoint(rune)}`);
	}

	return l.emit(typ);
};

const lexChar = (l: Lexer): StateFunction => {
	while (true) {
		const rune = l.nextChar();
		if (rune === '\\') {
			const next = l.nextChar();
			if (next != EOF && next != '\n') {
				continue;
			}

			return l.errorf('unterminated character constant');
		} else if (rune === EOF || rune === '\n') {
			return l.errorf('unterminated character constant');
		} else if (rune === "'") {
			break;
		}
	}

	return l.emit(ItemType.CharConstant);
};

const lexField = (l: Lexer): StateFunction => {
	return lexFieldOrVariable(l, ItemType.Field);
};

const lexNumber = (l: Lexer): StateFunction => {
	if (!l.scanNumber()) {
		return l.errorf(`bad number syntax: "${l.input.substring(l.start, l.pos)}"`);
	}

	const sign = l.peek();
	if (sign === '+' || sign === '-') {
		// Complex: 1+2i. No spaces, must end in 'i'.
		if (!l.scanNumber() || l.input[l.pos - 1] != 'i') {
			return l.errorf(`bad number syntax: "${l.input.substring(l.start, l.pos)}"`);
		}

		return l.emit(ItemType.Complex);
	}

	return l.emit(ItemType.Number);
};

const lexIdentifier = (l: Lexer): StateFunction => {
	while (true) {
		const rune = l.nextChar();
		if (isAlphaNumeric(rune)) {
			continue;
		}

		l.backup();
		const word = l.input.substring(l.start, l.pos);
		if (!l.atTerminator()) {
			return l.errorf(`bad character: ${toStringCodePoint(rune)}`);
		}

		const item = keyword(word);
		if (item) {
			if ((item === ItemType.Break && !l.options.breakOK) || (item === ItemType.Continue && !l.options.continueOK)) {
				return l.emit(ItemType.Identifier);
			}

			return l.emit(item);
		}

		if (word[0] === '.') {
			return l.emit(ItemType.Field);
		}

		if (word === 'true' || word === 'false') {
			return l.emit(ItemType.Bool);
		}

		return l.emit(ItemType.Identifier);
	}
};

// Attempt to parse an Item while we're inside a block (i.e. within `{{`, `}}`).
const lexInsideAction = (l: Lexer): StateFunction => {
	const [delim, _] = l.atRightDelim();
	if (delim) {
		if (l.parenDepth === 0) {
			return lexRightDelim;
		}

		return l.errorf('unclosed left paren');
	}

	const next = l.nextChar();
	if (next === EOF) {
		return l.errorf('unclosed action');
	} else if (isSpace(next)) {
		l.backup();
		return lexSpace;
	} else if (next === '=') {
		return l.emit(ItemType.Assign);
	} else if (next === ':') {
		if (l.nextChar() !== '=') {
			return l.errorf('expected :=');
		}

		return l.emit(ItemType.Declare);
	} else if (next === '|') {
		return l.emit(ItemType.Pipe);
	} else if (next === '"') {
		return lexQuote;
	} else if (next === '`') {
		return lexRawQuote;
	} else if (next === '$') {
		return lexVariable;
	} else if (next === "'") {
		return lexChar;
	} else if (next === '.') {
		if (l.pos < l.input.length) {
			let rune = l.input[l.pos].charCodeAt(0);
			if (rune < '0'.charCodeAt(0) || rune > '9'.charCodeAt(0)) {
				return lexField;
			}
		}

		l.backup();
		return lexNumber;
	} else if (next === '+' || next === '-' || (next.charCodeAt(0) >= '0'.charCodeAt(0) && next.charCodeAt(0) <= '9'.charCodeAt(0))) {
		l.backup();
		return lexNumber;
	} else if (isAlphaNumeric(next)) {
		l.backup();
		return lexIdentifier;
	} else if (next === '(') {
		l.parenDepth += 1;
		return l.emit(ItemType.LeftParen);
	} else if (next === ')') {
		l.parenDepth -= 1;
		if (l.parenDepth < 0) {
			return l.errorf('unexpected right paren');
		}

		return l.emit(ItemType.RightParen);
	} else if (isPrintable(next)) {
		return l.emit(ItemType.Char);
	} else {
		return l.errorf(`unrecognized character in action: ${toStringCodePoint(next)}`);
	}
};

/// Return true if the given string is a whitespace character.
const isSpace = (s: string): boolean => {
	return s == ' ' || s == '\t' || s == '\r' || s == '\n';
};

/// Return true if this string starts with `- `
const hasLeftTrimMarker = (s: string): boolean => {
	return s.length >= 2 && s[0] == trimMarker && isSpace(s[1]);
};

/// Return true if this string starts with ` -`
const hasRightTrimMarker = (s: string): boolean => {
	return s.length >= 2 && isSpace(s[0]) && s[1] == trimMarker;
};

/// Return the number of non-whitespace characters at the beginning of the string.
const rightTrimLength = (s: string): number => {
	return s.length - s.trimEnd().length;
};

/// Return the number of non-whitespace characters at the start of the string.
const leftTrimLength = (s: string): number => {
	return s.length - s.trimStart().length;
};

/// Return the number of new line characters in the given string.
export const countNewLines = (s: string): number => {
	return (s.match(/\n/g) || []).length;
};

/// Return true if the given string is an alpha-numeric character.
const isAlphaNumeric = (s: string): boolean => {
	return /[a-zA-Z0-9_]/.test(s);
};

/// Returns the ItemType if `s` is a raw keyword.
const keyword = (s: string): ItemType | null => {
	switch (s) {
		case '.':
			return ItemType.Dot;
		case 'block':
			return ItemType.Block;
		case 'break':
			return ItemType.Break;
		case 'continue':
			return ItemType.Continue;
		case 'define':
			return ItemType.Define;
		case 'else':
			return ItemType.Else;
		case 'end':
			return ItemType.End;
		case 'if':
			return ItemType.If;
		case 'range':
			return ItemType.Range;
		case 'nil':
			return ItemType.Nil;
		case 'template':
			return ItemType.Template;
		case 'with':
			return ItemType.With;
	}

	return null;
};

/// Return true if the given character is printable.
export const isPrintable = (char: string) => {
	const code = char.charCodeAt(0);
	// Check if the character's code is within the printable range, including whitespace
	return (
		(code >= 32 && code <= 126) || // Basic Latin
		(code >= 160 && code <= 55295) || // Extended Latin & others
		(code >= 57344 && code <= 65533) || // Private Use Area
		(code >= 65536 && code <= 1114111) || // Supplementary Multilingual Plane
		/\s/.test(char)
	); // Includes any whitespace character
};

/// Converts the given char to a raw unicode code point.
const toStringCodePoint = (rune: string) => {
	return 'U+' + rune.charCodeAt(0).toString().padStart(4, '0');
};
