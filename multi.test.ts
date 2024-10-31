import { Template } from './template';

test('empty', () => {
	const tmpl = new Template('test').parse('');
});

test('one', () => {
	const tmpl = new Template('one').parse(`{{define "foo"}} FOO {{end}}`);
	expect(Object.keys(tmpl.getTemplates()).length).toBe(2);
	expect(tmpl.getTemplates()['foo']).toBeDefined();
	expect(tmpl.getTemplates()['foo'].tree?.root?.toString()).toBe(` FOO `);
});

test('two', () => {
	const tmpl = new Template('two').parse(`{{define "foo"}} FOO {{end}}{{define "bar"}} BAR {{end}}`);
	expect(Object.keys(tmpl.getTemplates()).length).toBe(3);
	expect(tmpl.getTemplates()['foo']).toBeDefined();
	expect(tmpl.getTemplates()['bar']).toBeDefined();
	expect(tmpl.getTemplates()['foo'].tree?.root?.toString()).toBe(` FOO `);
	expect(tmpl.getTemplates()['bar'].tree?.root?.toString()).toBe(` BAR `);
});

test('missing end', () => {
	expect(() => new Template('missing end').parse(`{{define "foo"}} FOO `)).toThrow();
});

test('malformed name', () => {
	expect(() => new Template('malformed name').parse(`{{define "foo}} FOO `)).toThrow();
});

interface execTest {
	input: string;
	output: string;
	data: any;
	ok: boolean;
}

const testExecute = (test: execTest, template: Template) => {
	const funcs = {
		add: (vals: number[]) => vals.reduce((old: number, next: number) => old + next),
		count: (n: number) => '*'.repeat(n),
		die: () => {
			throw `die`;
		},
		echo: (n: any) => n,
		makemap: (...vals: string[]) => {
			if (vals.length % 2 !== 0) {
				throw `bad makemap`;
			}

			const out: Record<string, string> = {};
			for (let i = 0; i < vals.length; i += 2) {
				out[vals[i]] = vals[i + 1];
			}

			return out;
		},
		mapOfThree: () => {
			return { three: 3 };
		},
		oneArg: (a: any) => `oneArg=${a}`,
		returnInt: () => 7,
		stringer: (a: any) => String(a),
		twoArgs: (a: any, b: any) => `twoArgs=${a}${b}`,
		typeOf: (a: any) => typeof a,
		valueString: () => 'value is ignored',
		vfunc: (a: any, b: any) => 'vfunc',
		zeroArgs: () => 'zeroargs',
	};

	let tmpl: Template;
	if (!template) {
		tmpl = new Template(expect.getState().currentTestName ?? '').funcs(funcs).parse(test.input);
	} else {
		tmpl = template
			.new(expect.getState().currentTestName ?? '')
			.funcs(funcs)
			.parse(test.input);
	}

	if (!test.ok) {
		expect(() => tmpl.execute(test.data)).toThrow();
	} else {
		expect(tmpl.execute(test.data)).toBe(test.output);
	}
};

const multiTest = (multiTest: execTest) => {
	const template = new Template('root').parse(`
	{{define "x"}}TEXT{{end}}
	{{define "dotV"}}{{.V}}{{end}}
`);
	template.parse(`
	{{define "dot"}}{{.}}{{end}}
	{{define "nested"}}{{template "dot" .}}{{end}}
`);

	testExecute(multiTest, template);
};

const tVal = {
	True: true,
	I: 17,
	U16: 16,
	X: 'x',
	S: 'xyz',
	U: { V: 'v' },
	V0: { j: 6666 },
	V1: { j: 7777 },
	W0: { k: 888 },
	W1: { k: 999 },
	SI: [3, 4, 5],
	SICap: [0, 0, 0, 0, 0],
	AI: [3, 4, 5],
	SB: [true, false],
	MSI: { one: 1, two: 2, three: 3 },
	MSIone: { one: 1 },
	MXI: { one: 1 },
	MII: { 1: 1 },
	MI32S: { 1: 'one', 2: 'two' },
	MI64S: { 2: 'i642', 3: 'two' },
	MUI32S: { 2: 'u322', 3: 'u323' },
	MUI64S: { 2: 'i642', 3: 'i643' },
	MI8S: { 2: 'i82', 3: 'i83' },
	MUI8S: { 2: 'u82', 3: 'u83' },
	SMSI: [
		{ one: 1, two: 2 },
		{ eleven: 11, twelve: 12 },
	],
	Empty1: 3,
	Empty2: 'empty2',
	Empty3: [7, 8],
	Empty4: { U: 'UinEmpty' },
	NonEmptyInterface: { X: 'x' },
	STR: 'fozzle',
};

test('empty', () => {
	multiTest({ input: '', output: '', data: null, ok: true });
});

test('text', () => {
	multiTest({ input: 'some text', output: 'some text', data: null, ok: true });
});

test('invoke x', () => {
	multiTest({ input: '{{template "x" .SI}}', output: 'TEXT', data: tVal, ok: true });
});

test('invoke x no args', () => {
	multiTest({ input: '{{template "x"}}', output: 'TEXT', data: tVal, ok: true });
});

test('invoke dot int', () => {
	multiTest({ input: '{{template "dot" .I}}', output: '17', data: tVal, ok: true });
});

test('invoke dot int[]', () => {
	multiTest({ input: '{{template "dot" .SI}}', output: '[3 4 5]', data: tVal, ok: true });
});

test('invoke dotV', () => {
	multiTest({ input: '{{template "dotV" .U}}', output: 'v', data: tVal, ok: true });
});

test('invoke nested int', () => {
	multiTest({ input: '{{template "nested" .I}}', output: '17', data: tVal, ok: true });
});

test('variable declared by template', () => {
	multiTest({ input: '{{template "nested" $x:=.SI}},{{index $x 1}}', output: '[3 4 5],4', data: tVal, ok: true });
});

test('testFunc literal', () => {
	multiTest({ input: '{{oneArg "joe"}}', output: 'oneArg=joe', data: tVal, ok: true });
});

test('testFunc .', () => {
	multiTest({ input: '{{oneArg .}}', output: 'oneArg=joe', data: 'joe', ok: true });
});

test('new', () => {
	const t1 = new Template('test').parse(`{{define "test"}}foo{{end}}`);
	const t2 = t1.new('test');

	expect(t1.tree).toBeTruthy();
	expect(t2.tree).toBeFalsy();
});

test('parse', () => {
	// In multiple calls to Parse with the same receiver template, only one call
	// can contain text other than space, comments, and template definitions
	const t1 = new Template('test');
	t1.parse(`{{define "test"}}{{end}}`);
	t1.parse(`{{define "test"}}{{/* this is a comment */}}{{end}}`);
	t1.parse(`{{define "test"}}foo{{end}}`);
});
