import { ItemType } from './lexer';
import { Tree } from './parser';

export enum NodeType {
	Text, // Plain text.
	Action, // A non-control action such as a field evaluation.
	Bool, // A boolean constant.
	Chain, // A sequence of field accesses.
	Command, // An element of a pipeline.
	Dot, // The cursor, dot.
	Else, // An else action. Not added to tree.
	End, // An end action. Not added to tree.
	Field, // A field or method name.
	Identifier, // An identifier; always a function name.
	If, // An if action.
	List, // A list of Nodes.
	Nil, // An untyped nil constant.
	Number, // A numerical constant.
	Pipe, // A pipeline of commands.
	Range, // A range action.
	String, // A string constant.
	Template, // A template invocation action.
	Variable, // A $ variable.
	With, // A with action.
	Comment, // A comment.
	Break, // A break action.
	Continue, // A continue action.
}

export interface Node {
	tree: Tree | null;
	pos: number;

	type(): NodeType;
	toString(): string;
	copy(): Node;
}

export class ListNode implements Node {
	tree: Tree | null;
	pos: number;
	nodes: Node[];

	constructor(tree: Tree | null, pos: number) {
		this.pos = pos;
		this.tree = tree;
		this.nodes = [];
	}

	type(): NodeType {
		return NodeType.List;
	}

	append(n: Node): void {
		this.nodes.push(n);
	}

	toString(): string {
		return this.nodes.map((n) => n.toString()).join('');
	}

	copy(): Node {
		const newList = new ListNode(this.tree, this.pos);
		newList.nodes = this.nodes.map((n) => n.copy());

		return newList;
	}
}

export class TextNode implements Node {
	tree: Tree | null;
	pos: number;
	text: string;

	constructor(tree: Tree | null, pos: number, text: string) {
		this.pos = pos;
		this.tree = tree;
		this.text = text;
	}

	type(): NodeType {
		return NodeType.Text;
	}

	toString(): string {
		return this.text;
	}

	copy(): Node {
		return new TextNode(this.tree, this.pos, `${this.text}`);
	}
}

export class CommentNode implements Node {
	tree: Tree | null;
	pos: number;
	text: string; // comment text.

	constructor(tree: Tree | null, pos: number, text: string) {
		this.pos = pos;
		this.tree = tree;
		this.text = text;
	}

	type(): NodeType {
		return NodeType.Comment;
	}

	toString(): string {
		return `{{ ${this.text} }}`;
	}

	copy(): Node {
		return new CommentNode(this.tree, this.pos, `${this.text}`);
	}
}

export class PipeNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;
	isAssign: boolean;
	decl: VariableNode[];
	commands: CommandNode[];

	constructor(tree: Tree | null, pos: number, line: number, vars: VariableNode[]) {
		this.pos = pos;
		this.tree = tree;
		this.line = line;
		this.isAssign = false;
		this.decl = vars;
		this.commands = [];
	}

	type(): NodeType {
		return NodeType.Pipe;
	}

	append(c: CommandNode): void {
		this.commands.push(c);
	}

	toString(): string {
		let output = '';
		if (this.decl.length > 0) {
			output += this.decl.map((node) => node.toString()).join(', ');

			if (this.isAssign) {
				output += ' = ';
			} else {
				output += ' := ';
			}
		}

		this.commands.forEach((node, i) => {
			if (i > 0) {
				output += ' | ';
			}

			output += node.toString();
		});

		return output;
	}

	copy(): Node {
		const vars = this.decl.map((n) => n.copy() as VariableNode);
		const commands = this.commands.map((n) => n.copy() as CommandNode);

		const out = new PipeNode(this.tree, this.pos, this.line, vars);
		out.commands = commands;
		out.isAssign = this.isAssign;

		return out;
	}
}

export class VariableNode implements Node {
	tree: Tree | null;
	pos: number;
	ident: string[];

	constructor(tree: Tree | null, pos: number, ident: string) {
		this.tree = tree;
		this.pos = pos;
		this.ident = ident.split('.');
	}

	type(): NodeType {
		return NodeType.Variable;
	}

	toString(): string {
		return this.ident.join('.');
	}

	copy(): Node {
		return new VariableNode(this.tree, this.pos, this.ident.join('.'));
	}
}

export class CommandNode implements Node {
	tree: Tree | null;
	pos: number;
	args: Node[];

	constructor(tree: Tree | null, pos: number) {
		this.tree = tree;
		this.pos = pos;
		this.args = [];
	}

	type(): NodeType {
		return NodeType.Command;
	}

	append(n: Node): void {
		this.args.push(n);
	}

	toString(): string {
		return this.args
			.map((node, i) => {
				if (node.type() == NodeType.Pipe) {
					return `(${node.toString()})`;
				}

				return node.toString();
			})
			.join(' ');
	}

	copy(): Node {
		const newCommand = new CommandNode(this.tree, this.pos);
		newCommand.args = this.args.map((a) => a.copy());

		return newCommand;
	}
}

export class ActionNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;
	pipe: PipeNode;

	constructor(tree: Tree | null, pos: number, line: number, pipe: PipeNode) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
		this.pipe = pipe;
	}

	type(): NodeType {
		return NodeType.Action;
	}

	toString(): string {
		return `{{${this.pipe.toString()}}}`;
	}

	copy(): Node {
		return new ActionNode(this.tree, this.pos, this.line, this.pipe.copy() as PipeNode);
	}
}

export class IdentifierNode implements Node {
	tree: Tree | null;
	pos: number;
	ident: string;

	constructor(tree: Tree | null, pos: number, ident: string) {
		this.tree = tree;
		this.pos = pos;
		this.ident = ident;
	}

	type(): NodeType {
		return NodeType.Identifier;
	}

	toString(): string {
		return this.ident;
	}

	copy(): Node {
		return new IdentifierNode(this.tree, this.pos, this.ident);
	}
}

export class DotNode implements Node {
	tree: Tree | null;
	pos: number;

	constructor(tree: Tree | null, pos: number) {
		this.tree = tree;
		this.pos = pos;
	}

	type(): NodeType {
		return NodeType.Dot;
	}

	toString(): string {
		return '.';
	}

	copy(): Node {
		return new DotNode(this.tree, this.pos);
	}
}

export class NilNode implements Node {
	tree: Tree | null;
	pos: number;

	constructor(tree: Tree | null, pos: number) {
		this.tree = tree;
		this.pos = pos;
	}

	type(): NodeType {
		return NodeType.Nil;
	}

	toString(): string {
		return 'nil';
	}

	copy(): Node {
		return new NilNode(this.tree, this.pos);
	}
}

export class FieldNode implements Node {
	tree: Tree | null;
	pos: number;
	ident: string[];

	constructor(tree: Tree | null, pos: number, ident: string) {
		this.tree = tree;
		this.pos = pos;
		this.ident = ident.substring(1).split('.'); // substring(1) to trim the leading `.`.
	}

	type(): NodeType {
		return NodeType.Field;
	}

	toString(): string {
		return `.${this.ident.join('.')}`;
	}

	copy(): Node {
		return new FieldNode(this.tree, this.pos, `.${this.ident.join('.')}`);
	}
}

// ChainNode holds a term followed by a chain of field accesses (identifier starting with '.').
// The names may be chained ('.x.y').
// The periods are dropped from each ident.
export class ChainNode implements Node {
	pos: number;
	tree: Tree | null;
	node: Node;
	field: string[];

	constructor(tree: Tree | null, pos: number, node: Node) {
		this.tree = tree;
		this.pos = pos;
		this.node = node;
		this.field = [];
	}

	type(): NodeType {
		return NodeType.Chain;
	}

	// Add adds the named field (which should start with a period) to the end of the chain.
	addField(field: string) {
		if (field.length == 0 || field[0] != '.') {
			throw 'no dot in field';
		}

		field = field.substring(1);
		if (field.length == 0) {
			throw 'empty field';
		}

		this.field.push(field);
	}

	toString(): string {
		if (this.node.type() == NodeType.Pipe) {
			return `(${this.node.toString()}).${this.field.join('.')}`;
		} else {
			return `${this.node.toString()}.${this.field.join('.')}`;
		}
	}

	copy(): Node {
		const newChain = new ChainNode(this.tree, this.pos, this.node);
		newChain.field = [...this.field];
		return newChain;
	}
}

export class BoolNode implements Node {
	pos: number;
	tree: Tree | null;
	val: boolean;

	constructor(tree: Tree | null, pos: number, val: boolean) {
		this.tree = tree;
		this.pos = pos;
		this.val = val;
	}

	type(): NodeType {
		return NodeType.Bool;
	}

	toString(): string {
		if (this.val) {
			return 'true';
		}

		return 'false';
	}

	copy(): Node {
		return new BoolNode(this.tree, this.pos, this.val);
	}
}

// NumberNode holds a number. This is much less flexible than Go's
// implementation, because Javascript only has the one `number`.
export class NumberNode implements Node {
	pos: number;
	tree: Tree | null;
	num: number;
	private text: string;
	private typ: ItemType;

	constructor(tree: Tree | null, pos: number, text: string, typ: ItemType) {
		this.tree = tree;
		this.pos = pos;
		this.text = text;
		this.typ = typ;
		if (typ === ItemType.CharConstant) {
			if (text.length != 3 || text[0] != text[2]) {
				throw `malformed character constant: ${text}`;
			}

			this.num = text[1].charCodeAt(0) + '0'.charCodeAt(0);
			return;
		} else if (typ === ItemType.Complex || (text.length > 0 && text[text.length - 1] == 'i')) {
			throw `Complex numbers are not supported`;
		}

		// Go allows implicit conversions of char literals to their unicode code points.
		// Here we handle that.
		if (text.startsWith(`'`) && text.endsWith(`'`)) {
			let strippedText = text.substring(1, text.length - 1); // strip the quotes.
			strippedText = strippedText.replace('\\n', '\n');
			strippedText = strippedText.replace('\\\\', '\\');
			strippedText = strippedText.replace("\\'", "'");
			const codepointLiteralMatch = strippedText.match(/^\\[xXuU]{?([0-9A-Fa-f]+)}?$/);
			if (codepointLiteralMatch) {
				// Code Point Literals, e.g. '\xFF', '\u3096` etc.
				text = '' + parseInt(codepointLiteralMatch[1], 16);
			} else if (strippedText.length == 1) {
				text = '' + strippedText.charCodeAt(0);
			} else {
				throw `illegal number syntax: "${text}"`;
			}
		}

		// Strip any `_`s from the number, to emulate Go's behaviour where numbers can have `_` in them for easier reading.
		// Technically this is more lax than go's parser - go does not allow multiple `_`s in a row, or starting or ending on a `_`
		// but (famous last words) I don't think that will be much of a problem.
		text = text.replace(/_/g, '');

		// Force numbers with a leading `0` to start with `0[a-zA-Z]` so that Javascript correctly parses it as Octal.
		if (text.startsWith('0') && text.length > 1 && !text.match(/^0[a-zA-Z]/)) {
			text = `0o${text.substring(1)}`;
		}

		// Handle Go's Hex exponent system, e.g. 0x1p4 == 1 * 2^4 === 16.
		if (text.startsWith('0x') || text.startsWith('0X')) {
			const normalized = normaliseHexExponent(text);
			if (normalized) {
				text = normalized;
			}
		}

		// Javascript doesn't support signs on non-decimal bases (e.g. -0x1 === -1), so this
		// strips out the sign and applies it again after the conversion.
		let sign = '+';
		if (text.startsWith('-') || text.startsWith('+')) {
			if (text.length >= 2 && (text[1] === '+' || text[1] === '-')) {
				// Manually handle the `+-1` case where we have two signs, because
				// we have to do this strip dance.
				throw `illegal number syntax: "${text}"`;
			}
			sign = text[0];
			text = text.substring(1);
		}

		this.num = Number(text);

		// Reapply the sign.
		if (sign === '-') {
			this.num *= -1;
		}

		if (isNaN(this.num)) {
			throw `illegal number syntax: "${text}"`;
		}
	}

	type(): NodeType {
		return NodeType.Number;
	}

	toString(): string {
		return this.text;
	}

	copy(): Node {
		return new NumberNode(this.tree, this.pos, this.text, this.typ);
	}
}

// Javascript doesn't support Go's `hex exponent` syntax (https://go.dev/ref/spec#Floating-point_literals)
// This function attempts to manually parse it and turn it into a string that Javascript _can_ understand.
export const normaliseHexExponent = (s: string): string | null => {
	s = s.replace(/_/g, '');
	if (s.match(/^(0[xX][^eE]+)[eE]([^eE]+)$/)) {
		throw `p exponent requires hexadecimal mantissa`;
	}

	const hexMatches = s.match(/^(0[xX][^pP]+)[pP]([^pP]+)$/);
	if (hexMatches === null) {
		return null;
	}

	const mantissa = hexMatches[1];
	// Mantissa looks like 0x[number], but Javascript doesn't allow us to have `0xy.z`, so we
	// need to manually parse it here.
	const [wholePart, fractionalPart] = mantissa.substring(2).split('.'); // Strip the 0x and split into (y.z).
	if (!wholePart && !fractionalPart) {
		throw `illegal mantissa: ${mantissa}`;
	}
	let numWholePart = Number(`0x${wholePart ? wholePart : '0'}`);
	if (isNaN(numWholePart)) {
		throw `illegal whole part: ${wholePart}`;
	}

	if (fractionalPart) {
		const numFractionalPart = Number(`0x${fractionalPart}`);
		if (isNaN(numFractionalPart)) {
			throw `illegal mantissa syntax: ${fractionalPart}`;
		}

		const fractionalPartLength = fractionalPart.length;
		numWholePart += numFractionalPart * Math.pow(16, -fractionalPartLength);
	}

	let exponent = hexMatches[2];

	const numExponent = Math.pow(2, Number(`${exponent}`));
	if (isNaN(numExponent)) {
		throw `illegal exponent syntax: "${exponent}"`;
	}

	return '' + numExponent * numWholePart;
};

export class StringNode implements Node {
	pos: number;
	tree: Tree | null;
	quoted: string;
	text: string;

	constructor(tree: Tree | null, pos: number, quoted: string, text: string) {
		this.tree = tree;
		this.pos = pos;
		this.quoted = quoted;
		this.text = text;
	}

	type(): NodeType {
		return NodeType.String;
	}

	toString(): string {
		return this.quoted;
	}

	copy(): Node {
		return new StringNode(this.tree, this.pos, `${this.quoted}`, `${this.text}`);
	}
}

export class EndNode implements Node {
	tree: Tree | null;
	pos: number;

	constructor(tree: Tree | null, pos: number) {
		this.tree = tree;
		this.pos = pos;
	}

	type(): NodeType {
		return NodeType.End;
	}

	toString(): string {
		return '{{end}}';
	}

	copy(): EndNode {
		return new EndNode(this.tree, this.pos);
	}
}

export class ElseNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;

	constructor(tree: Tree | null, pos: number, line: number) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
	}

	type(): NodeType {
		return NodeType.Else;
	}

	toString(): string {
		return '{{else}}';
	}

	copy(): ElseNode {
		return new ElseNode(this.tree, this.pos, this.line);
	}
}

export class BranchNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;
	typ: NodeType;
	pipe: PipeNode;
	list: ListNode;
	els: ListNode | null;
	constructor(tree: Tree | null, pos: number, line: number, typ: NodeType, pipe: PipeNode, list: ListNode, els: ListNode | null) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
		this.typ = typ;
		this.pipe = pipe;
		this.list = list;
		this.els = els;
	}

	type(): NodeType {
		return this.typ;
	}

	toString(): string {
		let name = '';
		if (this.typ === NodeType.If) {
			name = 'if';
		} else if (this.typ === NodeType.Range) {
			name = 'range';
		} else if (this.typ === NodeType.With) {
			name = 'with';
		} else {
			throw `unknown branch type: ${this.typ}`;
		}

		let out = `{{${name} ${this.pipe.toString()}}}${this.list.toString()}`;
		if (this.els != null) {
			out += `{{else}}${this.els?.toString()}`;
		}

		return `${out}{{end}}`;
	}

	copy(): Node {
		if (this.typ === NodeType.If) {
			return new IfNode(this.tree, this.pos, this.line, this.pipe, this.list, this.els);
		} else if (this.typ === NodeType.Range) {
			return new RangeNode(this.tree, this.pos, this.line, this.pipe, this.list, this.els);
		} else if (this.typ === NodeType.With) {
			return new WithNode(this.tree, this.pos, this.line, this.pipe, this.list, this.els);
		} else {
			throw `unknown branch type: ${this.typ}`;
		}
	}
}

export class IfNode extends BranchNode {
	constructor(tree: Tree | null, pos: number, line: number, pipe: PipeNode, list: ListNode, els: ListNode | null) {
		super(tree, pos, line, NodeType.If, pipe, list, els);
	}
}

export class RangeNode extends BranchNode {
	constructor(tree: Tree | null, pos: number, line: number, pipe: PipeNode, list: ListNode, els: ListNode | null) {
		super(tree, pos, line, NodeType.Range, pipe, list, els);
	}
}

export class WithNode extends BranchNode {
	constructor(tree: Tree | null, pos: number, line: number, pipe: PipeNode, list: ListNode, els: ListNode | null) {
		super(tree, pos, line, NodeType.With, pipe, list, els);
	}
}

export class BreakNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;

	constructor(tree: Tree | null, pos: number, line: number) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
	}

	type(): NodeType {
		return NodeType.Break;
	}

	toString(): string {
		return '{{break}}';
	}

	copy(): Node {
		return new BreakNode(this.tree, this.pos, this.line);
	}
}

export class ContinueNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;

	constructor(tree: Tree | null, pos: number, line: number) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
	}

	type(): NodeType {
		return NodeType.Continue;
	}

	toString(): string {
		return '{{continue}}';
	}

	copy(): Node {
		return new ContinueNode(this.tree, this.pos, this.line);
	}
}

export class TemplateNode implements Node {
	tree: Tree | null;
	pos: number;
	line: number;
	name: string;
	pipe: PipeNode | null;

	constructor(tree: Tree | null, pos: number, line: number, name: string, pipe: PipeNode | null) {
		this.tree = tree;
		this.pos = pos;
		this.line = line;
		this.name = name;
		this.pipe = pipe;
	}

	type(): NodeType {
		return NodeType.Template;
	}

	toString(): string {
		const name = this.name.replace('"', '\\"');
		let out = `{{template "${name}"`;
		if (this.pipe !== null) {
			out += ` ${this.pipe.toString()}`;
		}

		return `${out}}}`;
	}

	copy(): Node {
		return new TemplateNode(this.tree, this.pos, this.line, this.name, this.pipe?.copy() as PipeNode | null);
	}
}
