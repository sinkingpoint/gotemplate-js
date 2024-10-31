import { Template } from './template';

test('example', () => {
	const letter = `Dear {{.Name}},
{{if .Attended}}
It was a pleasure to see you at the wedding.
{{- else}}
It is a shame you couldn't make it to the wedding.
{{- end}}
{{with .Gift -}}
Thank you for the lovely {{.}}.
{{end}}
Best wishes,
Josie`;

	const recipients = [
		{
			Name: 'Aunt Mildred',
			Gift: 'bone china tea set',
			Attended: true,
		},
		{
			Name: 'Uncle John',
			Gift: 'moleskin pants',
			Attended: false,
		},
		{
			Name: 'Cousin Rodney',
			Gift: '',
			Attended: false,
		},
	];

	const template = new Template('letter').parse(letter);
	let out = ``;
	for (const recipient of recipients) {
		out += template.execute(recipient);
		out += '\n\n';
	}

	expect(out).toBe(`Dear Aunt Mildred,

It was a pleasure to see you at the wedding.
Thank you for the lovely bone china tea set.

Best wishes,
Josie

Dear Uncle John,

It is a shame you couldn't make it to the wedding.
Thank you for the lovely moleskin pants.

Best wishes,
Josie

Dear Cousin Rodney,

It is a shame you couldn't make it to the wedding.

Best wishes,
Josie

`);
});

test('block', () => {
	const master = `Names:{{block "list" .}}{{"\\n"}}{{range .}}{{println "-" .}}{{end}}{{end}}`;
	const overlay = `{{define "list"}} {{join . ", "}}{{end}} `;

	var funcs = { join: (vals: any[], seperator: string) => vals.map(String).join(seperator) };
	const guardians = ['Gamora', 'Groot', 'Nebula', 'Rocket', 'Star-Lord'];
	const masterTmpl = new Template('master').funcs(funcs).parse(master);
	const overlayTmpl = masterTmpl.clone().parse(overlay);
	expect(masterTmpl.execute(guardians)).toBe(`Names:
- Gamora
- Groot
- Nebula
- Rocket
- Star-Lord
`);
	expect(overlayTmpl.execute(guardians)).toBe(`Names: Gamora, Groot, Nebula, Rocket, Star-Lord`);
});
