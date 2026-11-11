# Repository Development Guidelines

These rules apply to all AI coding assistants working in this repository.

## Communication and Commit Language

- Use Chinese when communicating with the user, explaining changes, and reporting results.
- Git commit messages, including both the subject and body, must be written in English and follow the Conventional Commits format: `<type>[optional scope][!]: <description>`. For example: `fix(auth): reject disabled users`.
- PR titles and descriptions must be written in English.
- Preserve code identifiers, commands, paths, and necessary quotations in their original form.

## Code Formatting

- Keep handwritten CSS, JavaScript, and TypeScript source code in a readable multiline format. Do not minify it into a single line.
- Put each CSS declaration on its own line, and format selectors and braces according to the project's existing style.
- Write separate JavaScript and TypeScript statements on separate lines. Expand code blocks across multiple lines and indent them correctly.
- Apply the same rules to inline `<style>` and `<script>` blocks in templates.
- Generated build artifacts, minified files, and third-party code are exempt from these formatting requirements. Do not reformat them manually.
- Follow the project's existing formatter and static analysis configuration.
- Do not modify files unrelated to the current task merely to standardize formatting.

## Server-Side Constants

- `global.firekylin` defines the constants used on the server (see `src/bootstrap/worker.js`). When checking user types, user statuses, article/page types, post statuses, or feature flags, use the corresponding constants instead of magic numbers.
- Examples include `firekylin.USER_ADMIN`, `firekylin.USER_AVAILABLE`, `firekylin.POST_ARTICLE`, `firekylin.POST_PAGE`, `firekylin.POST_PUBLISH`, `firekylin.POST_PUBLIC`, and `firekylin.POST_ALLOW_COMMENT`. Choose constants by their meaning; do not interchange unrelated constants merely because they share the same numeric value.

## Completion Checks

- Check that the changes comply with these guidelines.
- Run existing checks relevant to the changes. If a check cannot be run, explain why.
- Report only the changes actually completed and the verification results actually obtained. Do not describe checks that were not run as passing.
