# Agent Tools Guidelines

## Search and Exploration
- Use `grep_search` (ripgrep) to find patterns across the codebase.
- Use `find_by_name` to locate specific files or directories.
- Always check `Apps/` first for application-specific logic.

## File Modification
- Use `replace_file_content` or `multi_replace_file_content` for surgical edits.
- Keep changes minimal and focused.
- Verify changes by running `npm run eslint` if applicable.

## Testing and Verification
- Use `run_command` to execute tests:
  - `npm run test`: Run unit tests.
  - `npm run test-e2e`: Run Playwright end-to-end tests.
- Use `browser_subagent` to verify UI changes in `Apps/3DHeritageMapApp.html`.

## Command Execution
- Always run commands from the project root.
- Be cautious with long-running commands (e.g., `npm start`); use appropriate wait times or check status.
