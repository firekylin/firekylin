# Admin Hooks migration baseline

The admin UI migration was measured against commit `1c1899a`.

- React class components in `www/static/src`: 61 before, 0 after.
- Legacy React lifecycle methods: 28 files before, 0 after.
- TypeScript diagnostics from `tsc -p tsconfig.json --noEmit`: 152 before, 150 after.

The TypeScript project still contains historical diagnostics in dependency declarations,
asset module declarations, and existing business types. New work must not increase the
150-diagnostic baseline until those issues are addressed separately.

The executable migration guard is `test/service/admin-hooks.test.js`. UI lifecycle tests
run through `npm run test:admin-ui`.
