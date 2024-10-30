import { Template } from './template';

test('.X', () => {
	testExecute({ input: '-{{.X}}-', output: '-x-', data: tVal, ok: true }, null);
});

test('.U.V', () => {
	testExecute({ input: '-{{.U.V}}-', output: '-v-', data: tVal, ok: true }, null);
});

test('map .one', () => {
	testExecute({ input: '{{.MSI.one}}', output: '1', data: tVal, ok: true }, null);
});

test('map .two', () => {
	testExecute({ input: '{{.MSI.two}}', output: '2', data: tVal, ok: true }, null);
});

test('map .NO', () => {
	testExecute({ input: '{{.MSI.NO}}', output: '<no value>', data: tVal, ok: true }, null);
});

test('map .one interface', () => {
	testExecute({ input: '{{.MSI.one}}', output: '1', data: tVal, ok: true }, null);
});

test('dot int', () => {
	testExecute({ input: '<{{.}}>', output: '<13>', data: 13, ok: true }, null);
});

test('dot bool', () => {
	testExecute({ input: '<{{.}}>', output: '<true>', data: true, ok: true }, null);
});

test('dot string', () => {
	testExecute({ input: '<{{.}}>', output: '<hello>', data: 'hello', ok: true }, null);
});

test('dot array', () => {
	testExecute({ input: '<{{.}}>', output: '<[-1 -2 -3]>', data: [-1, -2, -3], ok: true }, null);
});

test('dot map', () => {
	testExecute({ input: '<{{.}}>', output: '<{"two":22}>', data: { two: 22 }, ok: true }, null);
});

test('$ int', () => {
	testExecute({ input: '{{$}}', output: '123', data: 123, ok: true }, null);
});

test('$.I', () => {
	testExecute({ input: '{{$.I}}', output: '17', data: tVal, ok: true }, null);
});

test('$.U.V', () => {
	testExecute({ input: '{{$.U.V}}', output: 'v', data: tVal, ok: true }, null);
});

test('declare in action', () => {
	testExecute({ input: '{{$x := $.U.V}}{{$x}}', output: 'v', data: tVal, ok: true }, null);
});

test('simple assignment', () => {
	testExecute({ input: '{{$x := 2}}{{$x = 3}}{{$x}}', output: '3', data: tVal, ok: true }, null);
});

test('nested assignment', () => {
	testExecute({ input: '{{$x := 2}}{{if true}}{{$x = 3}}{{end}}{{$x}}', output: '3', data: tVal, ok: true }, null);
});

test('nested assignment changes the last declaration', () => {
	testExecute(
		{ input: '{{$x := 1}}{{if true}}{{$x := 2}}{{if true}}{{$x = 3}}{{end}}{{end}}{{$x}}', output: '1', data: tVal, ok: true },
		null
	);
});

test('.Method0', () => {
    testExecute({input: "-{{.Method0}}-", output: "-M0-", data: tVal, ok: true}, null);
});

test('.Method1(1234)', () => {
    testExecute({input: "-{{.Method1 1234}}-", output: "-1234-", data: tVal, ok: true}, null);
});

test('.Method1(.I)', () => {
    testExecute({input: "-{{.Method1 .I}}-", output: "-17-", data: tVal, ok: true}, null);
});

test('.Method2(3, .X)', () => {
    testExecute({input: "-{{.Method2 3 .X}}-", output: "-Method2: 3 x-", data: tVal, ok: true}, null);
});

interface execTest {
	input: string;
	output: string;
	data: any;
	ok: boolean;
}

const testExecute = (test: execTest, template: Template | null) => {
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
    'Method0': () => 'M0',
    'Method1': (a: number) => a,
    'Method2': (a: number, s: string) => `Method2: ${a} ${s}`
};
