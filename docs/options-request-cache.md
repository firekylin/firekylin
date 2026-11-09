# Request-local options reads

`getOptions(includePrivate = false)` retains its API. The first ordinary read in
an HTTP request stores the raw `select()` Promise; later reads with the same
database configuration and table reuse it, even through new ThinkJS model
instances. Concurrent callers also share the query. Failed queries are evicted.

The first middleware establishes the scope, before MCP, OAuth, plugin routes,
trace/error rendering, logic and controllers. Each request has its own scope.
Finishing a request clears it and disables caching for detached async work.
Startup, migration and other non-request reads continue to query normally.

Every call builds a new result, independently parses JSON and filters private
fields. Object-valued custom adapter results are cloned too. Neither callers
nor public/private filtering can modify the stored rows or another result.
The cache never stores transformed public or private response objects.

## Writes and special connections

Options model CRUD, bulk helpers, credential methods, `query()`/`execute()` and
transaction boundaries invalidate the current request before and after the
operation. This also covers CRUD and transactions on its `db()` adapter.
Reads during an in-flight write do not populate the cache. Failed operations
invalidate too, since a batch may have partially succeeded. Clearing a request
does not affect another request's snapshot.

Chained query-builder reads (`where`, `field`, `table`, etc.) bypass caching and
consume their options normally. Transactions, explicitly rebound adapters,
`reuseDB` and dynamic SQL-routing configurations also bypass shared reads.
Distinct database configurations and table prefixes cannot share an entry.

Mutating the options table through an unrelated model, a driver's internal
`query`/socket API or an external database client is outside this model's
invalidation boundary. Use the options model's write methods for read-after-write
within a request. Other requests may keep their existing snapshot until they
finish; this is not a cross-request consistency or shared-cache mechanism.

## Verification

Run `node --test test/model/options-request-cache.test.js` for real ThinkJS
model factories, SQLite queries and overlapping local HTTP requests. The tests
disable the adapter's own query debounce so SQL counts measure this cache:

- 23 sequential/concurrent reads across model instances: 1 full options SELECT.
- 88 reads in 8 concurrent HTTP requests: 8 full options SELECTs.
- The next request queries again and sees committed writes.
- Public/private isolation, failed queries, late query completion, write races,
  partial failures, direct CRUD, multiple databases and commit/rollback are covered.

The existing live ThinkJS OAuth/MCP suite also exercises the new middleware
through actual application login, consent, MCP calls, refresh and revocation.
Its fixture disables external social-provider discovery. MySQL/PostgreSQL
servers and production latency are not measured by these SQLite tests.
