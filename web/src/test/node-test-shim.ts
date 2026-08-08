// Compatibility shim that maps Node's native `node:test` API surface onto
// vitest. A handful of tests were originally authored against `node --test`
// (with hooks like `before`/`after`); vitest exposes the same behavior under
// `*All`/`*Each` names, so re-export them under the node:test names.
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  test,
} from 'vitest'

export {
  describe,
  it,
  test,
  beforeAll as before,
  beforeAll,
  beforeEach,
  afterAll as after,
  afterAll,
  afterEach,
}
