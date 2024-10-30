import { isPrintable } from "./parse/lexer";
import { Template } from "./template";

export const builtins = (): Record<string, Function> => {
	return {
		'and': and,
		'call': () => {},
		'html': (...args: any[]) => HTMLEscapeString(evalArgs(args)),
		'index': index,
		'slice': slice,
		'js': (...args: any[]) => JSEscapeString(evalArgs(args)),
		'len': length,
		'not': not,
		'or': or,
		'println': (...args: any[]) => args.map(String).join(' ') + '\n',
        'eq': eq,
        'ge': ge,
        'gt': gt,
        'le': le,
        'lt': lt,
        'ne': ne
	};
};

const HTMLEscapeString = (s: string): string => {
	const disallowedChars = '\'"&<>\0';
	let noIllegalChars = true;
	for (let i = 0; i < s.length; i++) {
		if (disallowedChars.includes(s[i])) {
			noIllegalChars = false;
			break;
		}
	}

	if (noIllegalChars) {
		return s;
	}

	return HTMLEscape(s);
};

const HTMLEscape = (s: string): string => {
	let out = '';
	let last = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		let chr = '';
		switch (c) {
			case '\0':
				chr = 'uFFFD';
				break;
			case '"':
				chr = '&#34;';
				break;
			case "'":
				chr = '&#39;';
				break;
			case '&':
				chr = '&amp;';
				break;
			case '<':
				chr = '&lt;';
				break;
			case '>':
				chr = '&gt;';
				break;
			default:
				continue;
		}

		out += s.substring(last, i);
		out += chr;
		last = i + 1;
	}

	out += s.substring(last);
	return out;
};

const evalArgs = (...args: any[]): string => {
	if (args.length === 1 && typeof args[0] === 'string') {
		return args[0];
	}

	return args.map((a) => String(a)).join(' ');
};

const index = (indexable: any, ...indices: any[]): any => {
	let out = indexable;
	indices.forEach((i) => (out = out[i]));

	return out;
};

const slice = (indexable: any, ...indices: any[]): any => {
	if (indices.length > 3) {
		throw `too many slice indices: ${indices.length}`;
	}

	if (indices.length === 0) {
		return indexable;
	}

	if (indices.length === 1) {
		if (typeof indexable === 'string') {
			return indexable.charAt(indices[0]);
		} else if (Array.isArray(indexable)) {
			return indexable[indices[0]];
		} else {
			throw `can't slice item of type ${typeof indexable}`;
		}
	} else if (indices.length == 2 || indices.length === 3) {
		if (typeof indexable === 'string') {
			return indexable.substring(indices[0], indices[1]);
		} else if (Array.isArray(indexable)) {
			return indexable.slice(indices[0], indices[1]);
		} else {
			throw `can't slice item of type ${typeof indexable}`;
		}
	}
};

const JSEscapeString = (s: string): string => {
	if (!jsIsSpecial(s)) {
		return s;
	}

	return JSEscape(s);
};

const jsIsSpecial = (s: string): boolean => {
	const disallowedChars = '\\\'"<>&=';
	const runeSelf = 0x80; // Char points below this are represented in one byte.
	for (let i = 0; i < s.length; i++) {
		if (disallowedChars.includes(s[i])) {
			return true;
		}

		if (s.charCodeAt(i) < ' '.charCodeAt(0) || s.charCodeAt(i) > runeSelf) {
			return true;
		}
	}

	return false;
};

const JSEscape = (s: string): string => {
	const runeSelf = 0x80; // Char points below this are represented in one byte.
	const hex = '0123456789ABCDEF';
	let last = 0;
	let out = '';

	for (let i = 0; i < s.length; i++) {
		const c = s.charAt(i);
		if (!jsIsSpecial(c)) {
			continue;
		}

		out += s.substring(last, i);

		if (c.charCodeAt(0) < runeSelf) {
			switch (c) {
				case '\\':
					out += `\\\\`;
					break;
				case "'":
					out += "\\'";
					break;
				case '"':
					out += '\\"';
					break;
				case '<':
					out += '\u003C';
					break;
				case '>':
					out += '\u003E';
					break;
				case '&':
					out += '\u0026';
					break;
				case '=':
					out += '\u003D';
					break;
				default:
					const charCode = c.charCodeAt(0);
					const high = charCode >> 4;
					const low = charCode & 0x0f;
					out += `${hex[high]}${hex[low]}`;
					break;
			}
		} else {
			if (isPrintable(c)) {
				out += c;
			} else {
				const r = c.charCodeAt(0).toString(16).padStart(4, '0');
				out += `\\u${r}`;
			}
		}

		last = i + 1;
	}

	out += s.substring(last);
	return out;
};

const length = (item: any): number => {
	if (Array.isArray(item) || typeof item === 'string') {
		return item.length;
	}

	if (typeof item === 'object') {
		return Object.keys(item).length;
	}

	throw `len of type ${typeof item}`;
};

const truth = (item: any): boolean => {
	return Boolean(item);
};

const not = (item: any): boolean => {
	return !truth(item);
};

const and = (...items: any): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (!truth(items[i])) {
			return true;
		}
	}

	return false;
};

const or = (...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (truth(items[i])) {
			return true;
		}
	}

	return false;
};

const print = (...items: any[]): string => {
	return items.map((i) => String(i)).join(' ');
};

const println = (...items: any[]): string => {
	return items.map((i) => String(i)).join(' ') + '\n';
};

const eq = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] === a) {
			return true;
		}
	}

	return false;
};

const ge = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] >= a) {
			return true;
		}
	}

	return false;
};

const gt = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] > a) {
			return true;
		}
	}

	return false;
};

const le = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] <= a) {
			return true;
		}
	}

	return false;
};

const lt = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] < a) {
			return true;
		}
	}

	return false;
};

const ne = (a: any, ...items: any[]): boolean => {
	for (let i = 0; i < items.length; i++) {
		if (items[i] !== a) {
			return true;
		}
	}

	return false;
};

export const findFunction = (name: string, tmpl: Template | null): [any, boolean, boolean] => {
	if(tmpl !== null) {
		const func = tmpl.getExecFunc(name);
		if(func) {
			return [func, false, true];
		}
	}

	const func = builtins()[name];
	if(func) {
		return [func, true, true];
	}

	return [null, false, false];
}
