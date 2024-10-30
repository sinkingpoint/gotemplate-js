import { Template } from '../template';
import { countNewLines, Item, ItemType, Lexer } from './lexer';
import {
	ActionNode,
	BoolNode,
	BreakNode,
	ChainNode,
	CommandNode,
	CommentNode,
	ContinueNode,
	DotNode,
	ElseNode,
	EndNode,
	FieldNode,
	IdentifierNode,
	IfNode,
	ListNode,
	NilNode,
	Node,
	NodeType,
	NumberNode,
	PipeNode,
	RangeNode,
	StringNode,
	TemplateNode,
	TextNode,
	VariableNode,
	WithNode,
} from './node';

interface Mode {
	parse_comments: boolean;
	skip_func_check: boolean;
}

// Tree is the representation of a single parsed template.
export class Tree {
	name: string;
	private parseName: string;
	root: ListNode | null;
	private funcs: Record<string, Function>[];
	mode: Mode;
	private text: string;
	private lexer: Lexer | null;
	private token: Item[];
	private peekCount: number;
	private vars: string[];
	private treeSet: Record<string, Tree>;
	private actionLine: number;
	private rangeDepth: number;

	constructor(name: string, funcs: Record<string, Function>[]) {
		this.name = name;
		this.parseName = '';
		this.root = null;
		this.funcs = funcs;
		this.mode = {
			parse_comments: false,
			skip_func_check: false,
		};

		this.text = '';
		this.lexer = null;
		this.token = [new Item(ItemType.EOF, 0, '', 0), new Item(ItemType.EOF, 0, '', 0), new Item(ItemType.EOF, 0, '', 0)];
		this.peekCount = 0;
		this.vars = [];
		this.treeSet = {};
		this.actionLine = 0;
		this.rangeDepth = 0;
	}

	parse(text: string, leftDelim: string, rightDelim: string, treeSet: Record<string, Tree>, funcs: Record<string, Function>[]): Tree {
		this.parseName = this.name;
		const lexer = new Lexer(this.name, text, leftDelim, rightDelim);
		this.startParse(funcs, lexer, treeSet);
		this.text = text;
		this.parseInternal();
		this.add();
		this.stopParse();

		return this;
	}

	toString(): string {
		return this.root?.toString() ?? '';
	}

	private next(): Item {
		if (this.peekCount > 0) {
			this.peekCount -= 1;
		} else {
			this.token[0] = this.lexer?.nextItem() as Item;
		}

		return this.token[this.peekCount] as Item;
	}

	// backup backs the input stream up one token.
	private backup(): void {
		this.peekCount += 1;
	}

	// backup2 backs the input stream up two tokens.
	// The zeroth token is already there.
	private backup2(item: Item): void {
		this.token[1] = item;
		this.peekCount = 2;
	}

	// backup2 backs the input stream up two tokens.
	// The zeroth token is already there.
	private backup3(item2: Item, item1: Item): void {
		this.token[1] = item1;
		this.token[2] = item2;
		this.peekCount = 3;
	}

	// peek returns but does not consume the next token.
	private peek(): Item {
		if (this.peekCount > 0) {
			return this.token[this.peekCount - 1];
		}

		this.peekCount = 1;
		this.token[0] = this.lexer?.nextItem() as Item;
		return this.token[0];
	}

	// nextNonSpace returns the next non-space token.
	private nextNonSpace(): Item {
		while (true) {
			const token = this.next();
			if (token.typ !== ItemType.Space) {
				return token;
			}
		}
	}

	// peekNonSpace returns but does not consume the next non-space token.
	private peekNonSpace(): Item {
		const token = this.nextNonSpace();
		this.backup();
		return token;
	}

	// ErrorContext returns a textual representation of the location of the node in the input text.
	// The receiver is only used when the node does not have a pointer to the tree inside,
	// which can occur in old code.
	errorContext(n: Node): [string, string] {
		const pos = n.pos;
		let tree = n.tree;

		if (tree === null) {
			tree = this;
		}

		const text = tree.text.substring(0, pos);
		let byteNum = text.lastIndexOf('\n');
		if (byteNum === -1) {
			byteNum = pos;
		} else {
			byteNum += 1;
			byteNum = pos - byteNum;
		}

		const lineNum = 1 + countNewLines(text);
		const context = n.toString();
		return [`${tree.parseName}:${lineNum}:${byteNum}`, context];
	}

	private errorf(err: string): void {
		this.root = null;
		throw `template: ${this.parseName}:${this.token[0].line}: ${err}`;
	}

	// expectOneOf consumes the next token and guarantees it has one of the required types.
	private expectOneOf(expected: ItemType[], context: string): Item {
		const token = this.nextNonSpace();
		if (!expected.includes(token.typ)) {
			this.unexpected(token, context);
		}

		return token;
	}

	// unexpected complains about the token and terminates processing.
	private unexpected(token: Item, context: string): void {
		if (token.typ == ItemType.Error) {
			let extra = '';
			if (this.actionLine !== 0 && this.actionLine !== token.line) {
				extra = ` in action started at ${this.parseName}:${this.actionLine}`;
				if (token.val.startsWith(' action')) {
					extra = extra.substring(' in action'.length); // avoid "action in action"
				}
			}

			this.errorf(`${token}${extra}`);
		}

		this.errorf(`unexpected ${token} in ${context}`);
	}

	private startParse(funcs: Record<string, Function>[], lex: Lexer, treeSet: Record<string, Tree>) {
		this.root = null;
		this.lexer = lex;
		this.vars = ['$'];
		this.funcs = funcs;
		this.treeSet = treeSet;
		this.lexer.options = {
			emitComments: this.mode.parse_comments,
			breakOK: !this.hasFunction('break'),
			continueOK: !this.hasFunction('continue'),
		};
	}

	private stopParse(): void {
		this.lexer = null;
		this.vars = [];
		this.funcs = [];
		this.treeSet = {};
	}

	private add(): void {
		const tree = this.treeSet[this.name];
		if (tree === null || isEmptyTree(tree?.root)) {
			this.treeSet[this.name] = this;
			return;
		}

		if (!isEmptyTree(this.root)) {
			this.errorf(`template: multiple definition of template "${this.name}"`);
		}
	}

	private parseInternal(): void {
		this.root = new ListNode(this, this.peek().pos);
		while (this.peek().typ !== ItemType.EOF) {
			if (this.peek().typ === ItemType.LeftDelim) {
				const delim = this.next();
				const ext = this.nextNonSpace();
				if (ext.typ === ItemType.Define) {
					const newTree = new Tree('definition', []); // name will be updated once we know it.
					newTree.text = this.text;
					newTree.mode = this.mode;
					newTree.parseName = this.parseName;
					newTree.startParse(this.funcs, this.lexer as Lexer, this.treeSet);
					newTree.parseDefinition();
					continue;
				}

				this.backup2(delim);
			}

			const node = this.textOrAction();
			if (node.type() === NodeType.End || node.type() === NodeType.Else) {
				this.errorf(`unexpected ${node}`);
			} else {
				this.root.append(node);
			}
		}
	}

	// parseDefinition parses a {{define}} ...  {{end}} template definition and
	// installs the definition in t.treeSet. The "define" keyword has already
	// been scanned.
	private parseDefinition(): void {
		const context = 'define clause';
		const name = this.expectOneOf([ItemType.String, ItemType.RawString], context);
		try {
			this.name = unquote(name.val);
		} catch (e) {
			this.errorf(e as string);
		}

		this.expectOneOf([ItemType.RightDelim], context);
		const [root, end] = this.itemList();
		this.root = root;
		if (end.type() !== NodeType.End) {
			this.errorf(`unexpected ${end} in ${context}`);
		}

		this.add();
		this.stopParse();
	}

	// itemList:
	//
	//	textOrAction*
	//
	// Terminates at {{end}} or {{else}}, returned separately.
	private itemList(): [ListNode, Node] {
		const list = new ListNode(this, this.peekNonSpace().pos);
		while (this.peekNonSpace().typ !== ItemType.EOF) {
			const node = this.textOrAction();
			if (node.type() === NodeType.End || node.type() === NodeType.Else) {
				return [list, node];
			}

			list.append(node);
		}

		throw this.errorf('unexpected eof');
	}

	// textOrAction:
	//
	//	text | comment | action
	private textOrAction(): Node {
		const token = this.nextNonSpace();
		switch (token.typ) {
			case ItemType.Text:
				return new TextNode(this, token.pos, token.val);
			case ItemType.LeftDelim:
				this.actionLine = token.line;
				this.actionLine = 0;
				return this.action();
			case ItemType.Comment:
				return new CommentNode(this, token.pos, token.val);
			default:
				throw this.unexpected(token, 'input');
		}
	}

	// Action:
	//
	//	control
	//	command ("|" command)*
	//
	// Left delim is past. Now get actions.
	// First word could be a keyword such as range.
	private action(): Node {
		let token = this.nextNonSpace();
		switch (token.typ) {
			case ItemType.Block:
				return this.blockControl();
			case ItemType.Break:
				return this.breakControl(token.pos, token.line);
			case ItemType.Continue:
				return this.continueControl(token.pos, token.line);
			case ItemType.Else:
				return this.elseControl();
			case ItemType.End:
				return this.endControl();
			case ItemType.If:
				return this.ifControl();
			case ItemType.Range:
				return this.rangeControl();
			case ItemType.Template:
				return this.templateControl();
			case ItemType.With:
				return this.withControl();
		}

		this.backup();
		token = this.peek();

		return new ActionNode(this, token.pos, token.line, this.pipeline('command', ItemType.RightDelim));
	}

	// Break:
	//
	//	{{break}}
	//
	// Break keyword is past.
	private breakControl(pos: number, line: number): Node {
		const token = this.nextNonSpace();
		if (token.typ !== ItemType.RightDelim) {
			throw this.unexpected(token, '{{break}}');
		}

		if (this.rangeDepth === 0) {
			throw this.errorf('{{break}} outside {{range}}');
		}

		return new BreakNode(this, pos, line);
	}

	// Continue:
	//
	//	{{continue}}
	//
	// Continue keyword is past.
	private continueControl(pos: number, line: number): Node {
		const token = this.nextNonSpace();
		if (token.typ !== ItemType.RightDelim) {
			throw this.unexpected(token, '{{continue}}');
		}

		if (this.rangeDepth === 0) {
			throw this.errorf('{{continue}} outside {{range}}');
		}

		return new ContinueNode(this, pos, line);
	}

	// Pipeline:
	//
	//	declarations? command ('|' command)*
	private pipeline(context: string, end: ItemType): PipeNode {
		const token = this.peekNonSpace();
		const pipe = new PipeNode(this, token.pos, token.line, []);
		let loop = false;
		do {
			loop = false;
			const v = this.peekNonSpace();
			if (v.typ === ItemType.Variable) {
				this.next();
				// Since space is a token, we need 3-token look-ahead here in the worst case:
				// in "$x foo" we need to read "foo" (as opposed to ":=") to know that $x is an
				// argument variable rather than a declaration. So remember the token
				// adjacent to the variable so we can push it back if necessary.
				const tokenAfterVariable = this.peek();
				const next = this.peekNonSpace();
				if (next.typ === ItemType.Assign || next.typ === ItemType.Declare) {
					pipe.isAssign = next.typ === ItemType.Assign;
					this.nextNonSpace();
					pipe.decl.push(new VariableNode(this, v.pos, v.val));
					this.vars.push(v.val);
				} else if (next.typ === ItemType.Char && next.val == ',') {
					this.nextNonSpace();
					pipe.decl.push(new VariableNode(this, v.pos, v.val));
					this.vars.push(v.val);
					if (context === 'range' && pipe.decl.length < 2) {
						const c = this.peekNonSpace();
						switch (c.typ) {
							case ItemType.Variable:
							case ItemType.RightDelim:
							case ItemType.RightParen:
								loop = true;
								continue;
							default:
								throw this.errorf('range can only initialize variables');
						}
					}

					throw `too many declarations in ${context}`;
				} else if (tokenAfterVariable.typ == ItemType.Space) {
					this.backup3(v, tokenAfterVariable);
				} else {
					this.backup2(v);
				}
			}
		} while (loop);

		while (true) {
			const token = this.nextNonSpace();
			switch (token.typ) {
				case end:
					this.checkPipeline(pipe, context);
					return pipe;
				case ItemType.Bool:
				case ItemType.CharConstant:
				case ItemType.Complex:
				case ItemType.Dot:
				case ItemType.Field:
				case ItemType.Identifier:
				case ItemType.Number:
				case ItemType.Nil:
				case ItemType.RawString:
				case ItemType.String:
				case ItemType.Variable:
				case ItemType.LeftParen:
					this.backup();
					pipe.append(this.command());
					break;
				default:
					throw this.unexpected(token, context);
			}
		}
	}

	private checkPipeline(pipe: PipeNode, context: string) {
		if (pipe.commands.length === 0) {
			throw this.errorf(`missing value for ${context}`);
		}

		// Only the first command of a pipeline can start with a non executable operand.
		pipe.commands.slice(1).forEach((node, i) => {
			switch (node.args[0].type()) {
				case NodeType.Bool:
				case NodeType.Dot:
				case NodeType.Nil:
				case NodeType.Number:
				case NodeType.String:
					throw this.errorf(`non executable command in pipeline state ${i + 2}`);
			}
		});
	}

	private parseControl(context: string): [number, number, PipeNode, ListNode, ListNode | null] {
		const numVars = this.vars.length;
		const pipe = this.pipeline(context, ItemType.RightDelim);
		let elseList: ListNode | null = null;
		if (context === 'range') {
			this.rangeDepth += 1;
		}

		let [list, next] = this.itemList();
		if (context === 'range') {
			this.rangeDepth -= 1;
		}

		switch (next.type()) {
			case NodeType.End:
				break;
			case NodeType.Else:
				// Special case for "else if" and "else with".
				// If the "else" is followed immediately by an "if" or "with",
				// the elseControl will have left the "if" or "with" token pending. Treat
				//	{{if a}}_{{else if b}}_{{end}}
				//  {{with a}}_{{else with b}}_{{end}}
				// as
				//	{{if a}}_{{else}}{{if b}}_{{end}}{{end}}
				//  {{with a}}_{{else}}{{with b}}_{{end}}{{end}}.
				// To do this, parse the "if" or "with" as usual and stop at it {{end}};
				// the subsequent{{end}} is assumed. This technique works even for long if-else-if chains.
				if (context === 'if' && this.peek().typ === ItemType.If) {
					this.next();
					elseList = new ListNode(this, next.pos);
					elseList.append(this.ifControl());
				} else if (context === 'with' && this.peek().typ === ItemType.With) {
					this.next();
					elseList = new ListNode(this, next.pos);
					elseList.append(this.withControl());
				} else {
					[elseList, next] = this.itemList();
					if (next.type() !== NodeType.End) {
						throw this.errorf(`unexpected end; found ${next}`);
					}
				}
		}

		this.popVars(numVars);

		return [pipe.pos, pipe.line, pipe, list, elseList];
	}

	// If:
	//
	//	{{if pipeline}} itemList {{end}}
	//	{{if pipeline}} itemList {{else}} itemList {{end}}
	//
	// If keyword is past.
	private ifControl(): Node {
		const [pos, line, pipe, list, elseList] = this.parseControl('if');
		return new IfNode(this, pos, line, pipe, list, elseList);
	}

	// Range:
	//
	//	{{range pipeline}} itemList {{end}}
	//	{{range pipeline}} itemList {{else}} itemList {{end}}
	//
	// Range keyword is past.
	private rangeControl(): Node {
		const [pos, line, pipe, list, elseList] = this.parseControl('range');
		return new RangeNode(this, pos, line, pipe, list, elseList);
	}

	// With:
	//
	//	{{with pipeline}} itemList {{end}}
	//	{{with pipeline}} itemList {{else}} itemList {{end}}
	//
	// If keyword is past.
	private withControl(): Node {
		const [pos, line, pipe, list, elseList] = this.parseControl('with');
		return new WithNode(this, pos, line, pipe, list, elseList);
	}

	// End:
	//
	//	{{end}}
	//
	// End keyword is past.
	private endControl(): Node {
		return new EndNode(this, this.expectOneOf([ItemType.RightDelim], 'end').pos);
	}

	// Else:
	//
	//	{{else}}
	//
	// Else keyword is past.
	private elseControl(): Node {
		const peek = this.peekNonSpace();
		// The "{{else if ... " and "{{else with ..." will be
		// treated as "{{else}}{{if ..." and "{{else}}{{with ...".
		// So return the else node here.
		if (peek.typ === ItemType.If || peek.typ === ItemType.With) {
			return new ElseNode(this, peek.pos, peek.line);
		}

		const token = this.expectOneOf([ItemType.RightDelim], 'else');
		return new ElseNode(this, token.pos, token.line);
	}

	// Block:
	//
	//	{{block stringValue pipeline}}
	//
	// Block keyword is past.
	// The name must be something that can evaluate to a string.
	// The pipeline is mandatory.
	private blockControl(): Node {
		const context = 'block clause';
		const token = this.nextNonSpace();
		const name = this.parseTemplateName(token, context);
		const pipe = this.pipeline(context, ItemType.RightDelim);

		const block = new Tree(name, []);
		block.mode = this.mode;
		block.parseName = this.parseName;
		block.startParse(this.funcs, this.lexer as Lexer, this.treeSet);
		let end: Node;
		[block.root, end] = block.itemList();
		if (end.type() !== NodeType.End) {
			throw this.errorf(`unexpected ${end} in ${context}`);
		}

		block.add();
		block.stopParse();
		return new TemplateNode(this, token.pos, token.line, name, pipe);
	}

	// Template:
	//
	//	{{template stringValue pipeline}}
	//
	// Template keyword is past. The name must be something that can evaluate
	// to a string.
	private templateControl(): Node {
		const context = 'template clause';
		const token = this.nextNonSpace();
		const name = this.parseTemplateName(token, context);
		let pipe: PipeNode | null = null;
		if (this.nextNonSpace().typ !== ItemType.RightDelim) {
			this.backup();
			// Do not pop variables; they persist until "end".
			pipe = this.pipeline(context, ItemType.RightDelim);
		}

		return new TemplateNode(this, token.pos, token.line, name, pipe);
	}

	private parseTemplateName(token: Item, context: string): string {
		switch (token.typ) {
			case ItemType.String:
			case ItemType.RawString:
				return unquote(token.val);
			default:
				throw this.unexpected(token, context);
		}
	}

	// command:
	//
	//	operand (space operand)*
	//
	// space-separated arguments up to a pipeline character or right delimiter.
	// we consume the pipe character but leave the right delim to terminate the action.
	private command(): CommandNode {
		const cmd = new CommandNode(this, this.peekNonSpace().pos);
		loop: while (true) {
			this.peekNonSpace();
			const operand = this.operand();
			if (operand !== null) {
				cmd.append(operand);
			}

			const token = this.next();
			switch (token.typ) {
				case ItemType.Space:
					continue loop;
				case ItemType.RightDelim:
				case ItemType.RightParen:
					this.backup();
					break;
				case ItemType.Pipe:
					break;
				default:
					throw this.unexpected(token, 'operand');
			}

			break;
		}

		if (cmd.args.length === 0) {
			throw this.errorf('empty command');
		}

		return cmd;
	}

	// operand:
	//
	//	term .Field*
	//
	// An operand is a space-separated component of a command,
	// a term possibly followed by field accesses.
	// A nil return means the next item is not an operand.
	private operand(): Node | null {
		const node = this.term();

		if (node === null) {
			return null;
		}

		if (this.peek().typ === ItemType.Field) {
			const chain = new ChainNode(this, this.peek().pos, node);
			while (this.peek().typ === ItemType.Field) {
				chain.addField(this.next().val);
			}

			// Compatibility with original API: If the term is of type NodeField
			// or NodeVariable, just put more fields on the original.
			// Otherwise, keep the Chain node.
			// Obvious parsing errors involving literal values are detected here.
			// More complex error cases will have to be handled at execution time.
			switch (node.type()) {
				case NodeType.Field:
					return new FieldNode(this, chain.pos, chain.toString());
				case NodeType.Variable:
					return new VariableNode(this, chain.pos, chain.toString());
				case NodeType.Bool:
				case NodeType.String:
				case NodeType.Number:
				case NodeType.Nil:
				case NodeType.Dot:
					throw this.errorf(`unexpected . after term "${node.toString()}"`);
				default:
					return chain;
			}
		}

		return node;
	}

	// term:
	//
	//	literal (number, string, nil, boolean)
	//	function (identifier)
	//	.
	//	.Field
	//	$
	//	'(' pipeline ')'
	//
	// A term is a simple "expression".
	// A nil return means the next item is not a term.
	private term(): Node | null {
		const token = this.nextNonSpace();
		switch (token.typ) {
			case ItemType.Identifier:
				if (!this.mode.skip_func_check && !this.hasFunction(token.val)) {
					throw this.errorf(`function "${token.val}" is not defined`);
				}

				return new IdentifierNode(this, token.pos, token.val);
			case ItemType.Dot:
				return new DotNode(this, token.pos);
			case ItemType.Nil:
				return new NilNode(this, token.pos);
			case ItemType.Variable:
				return this.useVar(token.pos, token.val);
			case ItemType.Field:
				return new FieldNode(this, token.pos, token.val);
			case ItemType.Bool:
				return new BoolNode(this, token.pos, token.val === 'true');
			case ItemType.CharConstant:
			case ItemType.Complex:
			case ItemType.Number:
				try {
					return new NumberNode(this, token.pos, token.val, token.typ);
				} catch (e) {
					throw this.errorf(e as string);
				}
			case ItemType.LeftParen:
				return this.pipeline('parenthesized pipeline', ItemType.RightParen);
			case ItemType.String:
			case ItemType.RawString:
				try {
					return new StringNode(this, token.pos, token.val, unquote(token.val));
				} catch (e) {
					throw this.errorf(e as string);
				}
		}

		this.backup();
		return null;
	}

	private hasFunction(name: string): boolean {
		for (let i = 0; i < this.funcs.length; i++) {
			if (this.funcs[i][name]) {
				return true;
			}
		}

		return false;
	}

	// popVars trims the variable list to the specified length
	private popVars(n: number): void {
		this.vars = this.vars.slice(0, n);
	}

	private useVar(pos: number, name: string): Node {
		const v = new VariableNode(this, pos, name);
		for (const name of this.vars) {
			if (name == v.ident[0]) {
				return v;
			}
		}

		throw this.errorf(`undefined variable "${v.ident[0]}"`);
	}
}

export const isEmptyTree = (n: Node | null): boolean => {
	if (!n) {
		return true;
	}

	const typ = n.type();
	if ([NodeType.Action, NodeType.If, NodeType.Range, NodeType.Template, NodeType.With].includes(typ)) {
		return false;
	}

	if (typ === NodeType.Comment) {
		return true;
	}

	if (typ === NodeType.List) {
		const listNode = n as ListNode;
		for (const node of listNode.nodes) {
			if (!isEmptyTree(node)) {
				return false;
			}
		}

		return true;
	}

	if (typ === NodeType.Text) {
		const textNode = n as TextNode;
		return textNode.text.trim().length === 0;
	}

	throw `unknown node: ${n.toString()}`;
};

const unquote = (s: string): string => {
	if (s.length < 2) {
		throw 'expected length >= 2';
	}

	const openQuote = s[0];
	if (!['"', "'", '`'].includes(openQuote)) {
		throw `invalid open quote: '${openQuote}''`;
	}

	if (s[s.length - 1] !== openQuote) {
		throw `expected "${openQuote} to end quote, got ${s[s.length - 1]}`;
	}

	let unquoted = s.substring(1, s.length - 1);
	unquoted = unquoted.replace('\\n', '\n');
	unquoted = unquoted.replace('\\t', '\t');
	unquoted = unquoted.replace('\\"', '"');
	unquoted = unquoted.replace(`\\'`, `'`);

	return unquoted;
};

export const Parse = (name: string, text: string, leftDelim: string, rightDelim: string, funcs: Record<string, Function>[]) => {
	const treeSet: Record<string, Tree> = {};
	const t = new Tree(name, []);
	t.parse(text, leftDelim, rightDelim, treeSet, funcs);
	return treeSet;
};
