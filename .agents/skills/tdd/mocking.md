# When to Mock

Reach for mocks when the real dependency is **slow, flaky, or has side effects you can't control** in a test. Otherwise prefer real implementations — the closer tests are to real usage, the more confidence they give.

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)

Don't mock:

- **The unit under test** — if you're testing `UserService`, don't mock `UserService`; mock its dependencies and let the service run for real.
- Your own classes/modules (when they're fast and reliable)
- Internal collaborators
- Simple in-memory data structures or pure functions

## HTTP requests

Prefer [Mock Service Worker (MSW)](https://mswjs.io/) over mocking `fetch` directly. See Vitest's [Mocking Requests](https://vitest.dev/guide/mocking/requests) guide for setup.

## Time and randomness

When code depends on the current date, random numbers, or UUIDs, control them in tests:

```typescript
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-15"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of one generic function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
