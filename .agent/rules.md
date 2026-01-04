# Agent Rules and Best Practices

## General Coding Standards
- Follow the existing coding style (Standard JS/Cesium style).
- Use meaningful variable and function names.
- Document complex logic with comments.
- Avoid adding new dependencies unless absolutely necessary.

## CesiumJS Specific Rules
- **Performance**: Minimize work performed in the `requestAnimationFrame` loop.
- **Event-Driven**: Use Cesium's event system (e.g., `ScreenSpaceEventHandler`) for interactions.
- **Data Loading**: Handle asynchronous data loading gracefully (use `Promise.all` where appropriate).
- **No Private API**: Avoid accessing Cesium properties prefixed with `_` (e.g., `viewer._scene`).
- **Memory Management**: Ensure `destroy()` is called on custom objects to prevent leaks.

## Security
- **Cesium Ion Token**: Never hardcode or log the Ion Token in a way that exposes it to the public. Treat it as a secret.
- **Sanitization**: Sanitize any user input or external data before injecting it into the DOM.

## Deliverables Format
- List findings by severity: `[CRITICAL]`, `[IMPORTANT]`, `[SUGGESTION]`.
- Provide file paths and line numbers for all suggested changes.
- Include a verification plan for every change.
