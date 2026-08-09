# Good and Bad Tests

## Test the contract

Every function or module has a **contract**: what it promises for given inputs (arguments, config) and what it returns (values, side effects, errors). Tests verify that contract — not internal variables, call order, or library options passed under the hood.

**Refactor-survival rule:** if someone refactors internals but output stays the same, should the test break? If yes, you're testing implementation details.

```typescript
import { expect, test } from "vitest";
import { formatPrice } from "./formatPrice.js";

// GOOD: checks output, not Intl.NumberFormat options
test("formats USD prices", () => {
  expect(formatPrice(10, "USD")).toBe("$10.00");
});

test("handles negative amounts", () => {
  expect(formatPrice(-5.5, "USD")).toBe("-$5.50");
});
```

## Structure: Arrange / Act / Assert

Most tests follow three parts — setup, action, assertion. Comments aren't required; the structure should read clearly.

```typescript
import { expect, test } from "vitest";

test("removes an item from the list", () => {
  const list = new ShoppingList();
  list.add("milk");
  list.add("bread");

  list.remove("milk");

  expect(list.getItems()).toEqual(["bread"]);
});
```

- **One behavior per test.** If the name needs "and" ("formats price and handles errors"), split it.
- Keep each test focused on a single outcome.

## Naming

Names describe **behavior**, not implementation. When a test fails in CI, the name should tell you what broke without reading the body.

```typescript
// GOOD
test("returns 0 for an empty cart", () => { /* ... */ });
test("throws if the email format is invalid", () => { /* ... */ });

// BAD
test("works correctly", () => { /* ... */ });
test("calls Intl.NumberFormat with correct options", () => { /* ... */ });
```

## Edge cases

After the happy path, cover boundaries, error paths, and unusual but valid inputs. You don't need every possible input — focus on what real callers might trigger.

```typescript
import { expect, test } from "vitest";
import { parseAge } from "./parseAge.js";

test("parses a valid age", () => {
  expect(parseAge("25")).toBe(25);
});

test("handles the upper boundary", () => {
  expect(parseAge("150")).toBe(150);
});

test("throws for numbers above 150", () => {
  expect(() => parseAge("151")).toThrow("Invalid age: 151");
});

test("throws for non-numeric strings", () => {
  expect(() => parseAge("abc")).toThrow("Invalid age: abc");
});
```

**Heuristic:** could a real user or caller trigger this? If yes, test it.

For functions with very wide input ranges, consider **property-based testing** with [fast-check](https://fast-check.dev/) — describe properties that must hold for any input and let the framework hunt counterexamples.

## Organization

Follow the project's existing test layout and naming conventions. When a module exports multiple functions, group with `describe` blocks — one per function or feature area. Avoid nesting `describe` more than one or two levels deep; deep trees usually mean the source module does too much.

If a test file grows beyond a few hundred lines, split by theme (e.g. `userService.creation.test.ts` and `userService.auth.test.ts`) so you can run subsets during development.

## Independence

Each test should start from fresh state so tests can run in any order.

```typescript
import { describe, expect, test } from "vitest";
import { createTodoList } from "./todoList.js";

describe("add", () => {
  test("adds a new todo", () => {
    const list = createTodoList();
    const todo = list.add("Buy groceries");
    expect(todo.text).toBe("Buy groceries");
  });

  test("assigns unique IDs to each todo", () => {
    const list = createTodoList();
    const first = list.add("First");
    const second = list.add("Second");
    expect(first.id).not.toBe(second.id);
  });
});
```

When the same setup repeats in every test, extract it to `beforeEach` or a [`test.extend`](https://vitest.dev/guide/test-context#extend-test-context) fixture.

**Shared module state:** if the module keeps counters or caches at module scope, tests must not depend on specific values from prior tests — assert relative behavior (e.g. IDs are unique) rather than absolute ones (e.g. `id === 1`).

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
import { expect, test } from "vitest";

// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
import { expect, test, vi } from "vitest";

// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockProcess = vi.fn();
  vi.mock("./paymentService", () => ({ process: mockProcess }));
  await checkout(cart, payment);
  expect(mockProcess).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
import { expect, test } from "vitest";

// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```typescript
import { expect, test } from "vitest";

// BAD: Expected value is recomputed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
