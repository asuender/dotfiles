# Typescript Guidelines

## Types vs Interfaces

- Always prefer interfaces over types.
- Use types when...:
  - defining an alias for primitive types (string, boolean, number, bigint, symbol, etc)
  - defining tuple types
  - defining function types
  - defining a union
  - trying to overload functions in object types via composition
  - when needing to take advantage of mapped types
- Use interfaces...:
  - for all object types where using type is not required (see above)
  - when you want to take advantage of declaration merging.
