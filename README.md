# gotemplate

This is more or less a direct translation of Go's `text/template` package into typescript. 

## Examples

See [example.test.ts](./example.test.ts) for larger examples, but generally:

```
import { Template } from '@sinkingpoint/gotemplate';

const template = new Template('test');
template.parse(`Hello {{.}}`);
console.log(template.execute('World!')); // Hello World!
```

## Notes on compatibility

While this is _more or less_ a direct translation, and efforts have been made to make it emulate the Go api as much as possible, there are a few fundemental differences between this and Go's package.

### No strongly typed numbers

Go's library strongly types its number output - the `numberNode` struct contains dedicated entries for `uint8` etc. In Javascript land, we only have `number`s, so we lose some precision.

#### No support for Complex Numbers

Go supports a native complex number (e.g. `1+2i`) implementation. This is niche enough that it is not implemented here. If there is an actual usecase then I'm happy to add it.

### No typechecking on function calls

Go's implementation does a lot of `reflect` magic to ensure that the number and type of arguments passed to a function is correct, and will fail fast if they are not. In magic Javascript land, we have no such type support, functions can take an arbitrary number of arguments, and return any type they want (or multiple types, depending on a branch). This means we have to be much less strict when parsing templates, potentially leading to run time crashes on what would be in Go template compilation errors.

### No differentiating between structs and maps

In Go, a `map` is different than a `struct` in a meaningful way. This results in the output being different when printing a map (which prints as `map [ "a": "b", "c": "d])`) and a struct (which prints as `{b d}`). In Javascript, they are one and the same. In Go's case, trying to access a field on a struct that doesn't exist will result in a panic, but here we assume that everything is a map in Javascript. This means that we don't hard panic on trying to access undefined variables, instead treating them as a non existant map key, which treats the output as "<no value\>".
