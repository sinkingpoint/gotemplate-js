import { State } from './exec';
import { builtins } from './funcs';
import { isEmptyTree, Parse, Tree } from './parse/parser';

enum MissingKeyAction {
	Invalid,
	ZeroValue,
	Error,
}

interface options {
	missingKey: MissingKeyAction;
}

interface Common {
	tmpl: Record<string, Template>;
	option: options;
	parseFuncs: Record<string, Function>;
	execFuncs: Record<string, Function>;
}

export class Template {
	private name: string;
	tree: Tree | null;
	private common: Common;
	private leftDelim: string;
	private rightDelim: string;

	constructor(name: string) {
		this.name = name;
		this.tree = null;
		this.common = {
			tmpl: {},
			parseFuncs: {},
			execFuncs: {},
			option: {
				missingKey: MissingKeyAction.Invalid,
			},
		};
		this.leftDelim = '';
		this.rightDelim = '';
	}

	getName(): string {
		return this.name;
	}

	getTemplates(): Record<string, Template> {
		return this.common.tmpl;
	}

	getExecFunc(name: string): Function | undefined {
		return this.common.execFuncs[name];
	}

	new(name: string): Template {
		const newTemplate = new Template(name);
		newTemplate.common = this.common;
		newTemplate.leftDelim = this.leftDelim;
		newTemplate.rightDelim = this.rightDelim;

		return newTemplate;
	}

	clone(): Template {
		const nt = this.copy(null);
		if (this.common === null) {
			return nt;
		}

		for (const key in this.common.tmpl) {
			if (key === this.name) {
				nt.common.tmpl[this.name] = nt;
				continue;
			}

			const tmpl = this.common.tmpl[key].copy(nt.common);
			nt.common.tmpl[key] = tmpl;
		}

		nt.common.parseFuncs = { ...this.common.parseFuncs };
		nt.common.execFuncs = { ...this.common.execFuncs };

		return nt;
	}

	copy(c: Common | null): Template {
		const n = new Template(this.name);
		n.tree = this.tree;
		if (c !== null) {
			n.common = c;
		}
		n.leftDelim = this.leftDelim;
		n.rightDelim = this.rightDelim;

		return n;
	}

	addParseTree(name: string, tree: Tree) {
		let nt = this as Template;
		if (name !== nt.name) {
			nt = this.new(name);
		}

		if (this.associate(nt, tree) || this.tree === null) {
			nt.tree = tree;
		}

		return nt;
	}

	templates(): Template[] {
		let out = [];
		for (const tmplName in this.common.tmpl) {
			out.push(this.common.tmpl[tmplName]);
		}

		return out;
	}

	delims(left: string, right: string): Template {
		this.leftDelim = left;
		this.rightDelim = right;
		return this;
	}

	funcs(funcMap: Record<string, Function>): Template {
		this.addValueFuncs(funcMap);
		this.addFuncs(funcMap);

		return this;
	}

	private addValueFuncs(funcMap: Record<string, Function>) {
		for (const name in funcMap) {
			if (!goodName(name)) {
				throw `function name "${name}" is not a valid identifier`;
			}

			const func = funcMap[name];
			if (typeof func !== 'function') {
				throw `value for ${name} is not a function`;
			}

			if (!goodFunc(name, func)) {
				throw `function ${name} is not a good func`;
			}

			this.common.execFuncs[name] = func;
		}
	}

	private addFuncs(funcMap: Record<string, Function>) {
		for (const name in funcMap) {
			this.common.parseFuncs[name] = funcMap[name];
		}
	}

	lookup(name: string): Template | null {
		return this.common.tmpl[name];
	}

	parse(text: string): Template {
		const trees = Parse(this.name, text, this.leftDelim, this.rightDelim, [this.common.parseFuncs, builtins()]);
		for (const name in trees) {
			this.addParseTree(name, trees[name]);
		}

		return this;
	}

	private associate(n: Template, tree: Tree): boolean {
		if (n.common !== this.common) {
			throw `internal error: associate not common`;
		}

		const old = this.common.tmpl[n.name];
		if (old && isEmptyTree(tree.root) && old.tree) {
			// If a template by that name exists, don't replace it with an empty template.
			return false;
		}

		this.common.tmpl[n.name] = n;
		return true;
	}

	option(...opts: string[]): Template {
		for (const opt of opts) {
			this.setOption(opt);
		}

		return this;
	}

	private setOption(opt: string): void {
		if (opt === '') {
			throw `empty option string`;
		}

		const [key, value] = opt.split('=', 2);
		switch (key) {
			case 'missingkey':
				switch (value) {
					case 'invalid':
					case 'default':
						this.common.option.missingKey = MissingKeyAction.Invalid;
						return;
					case 'zero':
						this.common.option.missingKey = MissingKeyAction.ZeroValue;
						return;
					case 'error':
						this.common.option.missingKey = MissingKeyAction.Error;
						return;
				}
		}

		throw `unrecognised option ${opt}`;
	}

	execute(data: any): string {
		let state = new State(this, [{ name: '$', value: data }]);
		if (this.tree === null || this.tree.root === null) {
			throw `"${this.name} is an incomplete or empty template`;
		}

		state.walk(data, this.tree.root);

		return state.out.out;
	}
}

// goodName reports whether the function name is a valid identifier.
const goodName = (name: string): boolean => {
	if (name === '') {
		return false;
	}

	for (let i = 0; i < name.length; i++) {
		const r = name.charAt(i);
		if (r === '_') {
			continue;
		}

		if (i === 0 && !isLetter(r)) {
			return false;
		}

		if (!isLetter(r) && !isDigit(r)) {
			return false;
		}
	}

	return true;
};

// Returns true if the given string is one character, and that character is a letter (in the `L` unicode group).
const isLetter = (c: string): boolean => {
	const code = c.charCodeAt(0);
	return c.length === 1 && c.match(/^\p{L}$/u) !== null;
};

// Returns true if the given string is one character, and that character is a digit.
const isDigit = (c: string): boolean => {
	const code = c.charCodeAt(0);
	return c.length === 1 && c.match(/^\p{Nd}$/u) !== null;
};

const goodFunc = (name: string, func: Function): boolean => {
	// The go version of this function checks the returns types to make sure that there
	// is either one return, or two returns where the second one is an error. We're in magical
	// Javascript land where functions can return whatever they want, so we can't be that strict :/

	return true;
};
