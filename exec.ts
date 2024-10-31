import { findFunction } from './funcs';
import {
	ActionNode,
	BoolNode,
	ChainNode,
	CommandNode,
	FieldNode,
	IdentifierNode,
	IfNode,
	ListNode,
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
} from './parse/node';
import { Template } from './template';

const MAX_EXEC_DEPTH = 1000;

class Writer {
	out: string;
	constructor() {
		this.out = '';
	}

	write(s: string): void {
		this.out += s;
	}
}

interface Variable {
	name: string;
	value: any;
}

export class State {
	tmpl: Template;
	node: Node | null;
	vars: Variable[];
	out: Writer;
	depth: number;

	constructor(template: Template, vars: Variable[]) {
		this.tmpl = template;
		this.node = null;
		this.vars = vars;
		this.out = new Writer();
		this.depth = 0;
	}

	pushVar(name: string, value: any): void {
		this.vars.push({ name, value });
	}

	varMark(): number {
		return this.vars.length;
	}

	popVar(mark: number) {
		this.vars = this.vars.slice(0, mark);
	}

	// setVar overwrites the last declared variable with the given name.
	// Used by variable assignments.
	setVar(name: string, value: any) {
		for (let i = this.vars.length - 1; i >= 0; i--) {
			if (this.vars[i].name === name) {
				this.vars[i].value = value;
				return;
			}
		}

		throw `undefined variable: ${name}`;
	}

	// setTopVar overwrites the top-nth variable on the stack. Used by range iterations.
	setTopVar(n: number, value: any): void {
		this.vars[this.vars.length - n].value = value;
	}

	varValue(name: string): any {
		for (let i = this.vars.length - 1; i >= 0; i--) {
			if (this.vars[i].name === name) {
				return this.vars[i].value;
			}
		}

		throw `undefined variable: ${name}`;
	}

	at(node: Node): void {
		this.node = node;
	}

	errorf(format: string): void {
		if (this.node === null) {
			throw `template: ${this.tmpl.getName()}: ${format}`;
		} else {
			const [location, context] = this.tmpl.tree?.errorContext(this.node) ?? ['', ''];
			throw `template: ${location}: executing "${this.tmpl.getName()}" at <${context}>: ${format}`;
		}
	}

	printValue(node: Node, val: any): void {
		this.at(node);
		if(typeof val === "string") {
			this.out.write(val);
		} else if(Array.isArray(val)) {
			// Munge the array into Go's array syntax (i.e. ` ` instead of `,` for seperators).
			this.out.write(`[${val.map(String).join(' ')}]`);
		} else {
			this.out.write(JSON.stringify(val));
		}
	}

	walk(dot: any, node: Node) {
		this.at(node);
		switch (node.type()) {
			case NodeType.Action:
				const val = this.evalPipeline(dot, (node as ActionNode).pipe);
				if ((node as ActionNode).pipe.decl.length === 0) {
					this.printValue(node, val);
				}
				break;
			case NodeType.Break:
				throw `break`;
			case NodeType.Comment:
				break;
			case NodeType.Continue:
				throw `continue`;
			case NodeType.If:
				const ifNode = node as IfNode;
				this.walkIfOrWith(NodeType.If, dot, ifNode.pipe, ifNode.list, ifNode.els);
				break;
			case NodeType.List:
				for (const subNode of (node as ListNode).nodes) {
					this.walk(dot, subNode);
				}
				break;
			case NodeType.Range:
				this.walkRange(dot, node as RangeNode);
				break;
			case NodeType.Template:
				this.walkTemplate(dot, node as TemplateNode);
				break;
			case NodeType.Text:
				this.out.write((node as TextNode).text);
				break;
			case NodeType.With:
				const withNode = node as WithNode;
				this.walkIfOrWith(NodeType.With, dot, withNode.pipe, withNode.list, withNode.els);
				break;
			default:
				throw `unknown node: ${node}`;
		}
	}

	walkIfOrWith(nodeType: NodeType, dot: any, pipe: PipeNode, list: ListNode, elseList: ListNode | null) {
		const mark = this.varMark();
		try {
			const val = this.evalPipeline(dot, pipe);
			if (val) {
				if (nodeType === NodeType.With) {
					this.walk(val, list);
				} else {
					this.walk(dot, list);
				}
			} else if (elseList !== null) {
				this.walk(dot, elseList);
			}
		} finally {
			this.popVar(mark);
		}
	}

	walkRange(dot: any, r: RangeNode): void {
		this.at(r);
		const startMark = this.varMark();
		try {
			const val = this.evalPipeline(dot, r.pipe);
			const topMark = this.varMark();
			const oneIteration = (index: any, elem: any): void => {
				if (r.pipe.decl.length > 0) {
					if (r.pipe.isAssign) {
						if (r.pipe.decl.length > 1) {
							this.setVar(r.pipe.decl[0].ident[0], index);
						} else {
							this.setVar(r.pipe.decl[0].ident[0], elem);
						}
					} else {
						this.setTopVar(1, elem);
					}
				}

				if (r.pipe.decl.length > 1) {
					if (r.pipe.isAssign) {
						this.setVar(r.pipe.decl[1].ident[0], elem);
					} else {
						this.setTopVar(2, index);
					}
				}

				const mark = this.varMark();
				try {
					this.walk(elem, r.list);
				} finally {
					this.popVar(mark);
				}
			};

			if (Array.isArray(val)) {
				if (val.length > 0) {
					for (let i = 0; i < val.length; i++) {
						oneIteration(i, val[i]);
					}
				}

				return;
			} else if (typeof val === 'object') {
				const keys = Object.keys(val).sort();
				for (const key of keys) {
					oneIteration(key, val[key]);
				}

				return;
			} else if (val) {
				throw `can't iterate over ${val}`;
			}

			if (r.els !== null) {
				this.walk(dot, r.els);
			}
		} finally {
			this.popVar(startMark);
		}
	}

	walkTemplate(dot: any, t: TemplateNode): void {
		this.at(t);
		const template = this.tmpl.lookup(t.name);
		if (template === null) {
			throw this.errorf(`template ${t.name} not found`);
		}

		if (this.depth === MAX_EXEC_DEPTH) {
			throw this.errorf(`exceeded maximum template depth (${MAX_EXEC_DEPTH})`);
		}

		dot = this.evalPipeline(dot, t.pipe);
		const newState = new State(this.tmpl, [{ name: '$', value: dot }]);
		newState.node = this.node;
		newState.depth = this.depth + 1;
		newState.out = this.out;
		newState.walk(dot, template.tree?.root as Node);
	}

	evalPipeline(dot: any, pipe: PipeNode | null): any {
		if (pipe === null) {
			return null;
		}

		this.at(pipe);
		let value = null;
		for (const cmd of pipe.commands) {
			value = this.evalCommand(dot, cmd, value);
		}

		for (const variable of pipe.decl) {
			if (pipe.isAssign) {
				this.setVar(variable.ident[0], value);
			} else {
				this.pushVar(variable.ident[0], value);
			}
		}

		return value;
	}

	notAFunction(args: Node[], final: any): void {
		if (args.length > 1 || final !== null) {
			this.errorf(`can't give argument to non-function ${args[0]}`);
		}
	}

	evalCommand(dot: any, cmd: CommandNode, final: any): any {
		let firstWord = cmd.args[0];
		let typ = firstWord.type();
		switch (typ) {
			case NodeType.Field:
				return this.evalFieldNode(dot, firstWord as FieldNode, cmd.args, final);
			case NodeType.Chain:
				return this.evalChainNode(dot, firstWord as ChainNode, cmd.args, final);
			case NodeType.Identifier:
				return this.evalFunction(dot, firstWord as IdentifierNode, cmd, cmd.args, final);
			case NodeType.Pipe:
				this.notAFunction(cmd.args, final);
				return this.evalPipeline(dot, firstWord as PipeNode);
			case NodeType.Variable:
				return this.evalVariableNode(dot, firstWord as VariableNode, cmd.args, final);
		}

		this.at(firstWord);
		this.notAFunction(cmd.args, final);
		switch (typ) {
			case NodeType.Bool:
				return (firstWord as BoolNode).val;
			case NodeType.Dot:
				return dot;
			case NodeType.Nil:
				throw this.errorf(`nil is not a command`);
			case NodeType.Number:
				return (firstWord as NumberNode).num;
			case NodeType.String:
				return (firstWord as StringNode).text;
		}

		throw `can't evaluate command "${firstWord}"`;
	}

	evalFieldNode(dot: any, field: FieldNode, args: Node[], final: any): any {
		this.at(field);
		return this.evalFieldChain(dot, dot, field, field.ident, args, final);
	}

	evalChainNode(dot: any, chain: ChainNode, args: Node[], final: any): any {
		this.at(chain);
		if (chain.field.length === 0) {
			throw this.errorf(`internal error: no fields in evalChainNode`);
		}

		if (chain.node.type() === NodeType.Nil) {
			throw this.errorf(`indirection through explicit nil in ${chain}`);
		}

		const pipe = this.evalArg(dot, chain.node);
		return this.evalFieldChain(dot, pipe, chain, chain.field, args, final);
	}

	evalVariableNode(dot: any, variable: VariableNode, args: Node[], final: any): any {
		this.at(variable);
		const value = this.varValue(variable.ident[0]);
		if (variable.ident.length === 1) {
			this.notAFunction(args, final);
			return value;
		}

		return this.evalFieldChain(dot, value, variable, variable.ident.slice(1), args, final);
	}

	// evalFieldChain evaluates .X.Y.Z possibly followed by arguments.
	// dot is the environment in which to evaluate arguments, while
	// receiver is the value being walked along the chain.
	evalFieldChain(dot: any, receiver: any, node: Node, ident: string[], args: Node[], final: any): any {
		const n = ident.length;
		for (let i = 0; i < n - 1; i++) {
			receiver = this.evalField(dot, ident[i], node, [], {}, receiver);
			if(typeof receiver === "undefined") {
				// Go makes a disinction here between structs and maps. If one tries to access an undefined
				// field on a struct, then this will panic. If you try the same on a _map_ we return `<no value>`.
				// In the Javascript case, there is no such distinction, so we err on the side of not exploding.
				return "<no value>";
			}
		}

		const val = this.evalField(dot, ident[n - 1], node, args, final, receiver);
		if(typeof val === "undefined") {
			return "<no value>";
		}

		return val;
	}

	evalFunction(dot: any, node: IdentifierNode, cmd: Node, args: Node[], final: any): any {
		this.at(node);
		const name = node.ident;
		const [func, isBuiltin, exists] = findFunction(name, this.tmpl);
		if (!exists) {
			throw this.errorf(`"${name} is not a defined function`);
		}

		return this.evalCall(dot, func, isBuiltin, cmd, name, args, final);
	}

	// evalField evaluates an expression like (.Field) or (.Field arg1 arg2).
	// The 'final' argument represents the return value from the preceding
	// value of the pipeline, if any.
	evalField(dot: any, fieldName: string, node: Node, args: Node[], final: any, receiver: any): any {
		if (receiver === null) {
			throw this.errorf(`null encountered evaluation ${typeof receiver}:${fieldName}`);
		}

		if (typeof receiver[fieldName] === 'function') {
			return this.evalCall(dot, receiver[fieldName] as Function, false, node, fieldName, args, final);
		}

		return receiver[fieldName];
	}

	// evalCall executes a function or method call. If it's a method, fun already has the receiver bound, so
	// it looks just like a function call. The arg list, if non-nil, includes (in the manner of the shell), arg[0]
	// as the function itself.
	evalCall(dot: any, fun: Function, isBuiltin: boolean, node: Node, name: string, args: Node[], final: any): any {
		if (args !== null) {
			args = args.slice(1);
		}

		let numIn = args.length;
		if (final !== null) {
			numIn++;
		}

		let argv = [];
		args.forEach((a) => {
			argv.push(this.evalArg(dot, a));
		});

		if (final) {
			argv.push(final);
		}

		if (isBuiltin && name === 'call') {
			const calleeName = String(args[0]);
			argv = [calleeName, ...argv];
			fun = call;
		}

		try {
			return call(name, fun, ...argv);
		} catch (e) {
			this.at(node);
			throw this.errorf(e as string);
		}
	}

	evalArg(dot: any, n: Node): any {
		this.at(n);
		switch(n.type()) {
		case NodeType.Dot:
			return dot;
		case NodeType.Nil:
			return null;
		case NodeType.Field:
			return this.evalFieldNode(dot, n as FieldNode, [n], null);
		case NodeType.Variable:
			return this.evalVariableNode(dot, n as VariableNode, [], null);
		case NodeType.Pipe:
			return this.evalPipeline(dot, n as PipeNode);
		case NodeType.Identifier:
			return this.evalFunction(dot, n as IdentifierNode, n as IdentifierNode, [], null);
		case NodeType.Chain:
			return this.evalChainNode(dot, n as ChainNode, [], null);
		case NodeType.Bool:
			return (n as BoolNode).val;
		case NodeType.Number:
			return (n as NumberNode).num;
		case NodeType.String:
			return (n as StringNode).text;
		}
	}
}

const call = (name: string, func: Function, ...args: any[]) => {
	if (func === null || func === undefined) {
		throw `call of nil`;
	}

	if (typeof func !== 'function') {
		throw `non function ${name}: ${func}`;
	}

	return func.call(func, ...args);
};
