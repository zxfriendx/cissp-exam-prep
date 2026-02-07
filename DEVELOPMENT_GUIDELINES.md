# Development Guidelines & QA Protocol

## 1. QA Checklist (Required After Changes)
Before sending any change to the `main` branch or requesting user review, you must perform the following:

- [ ] **Run the Build**: `npm run build` to catch TypeScript errors and type mismatches.
- [ ] **Lint Check**: `npm run lint` to catch ESLint errors (especially Hook rules).
- [ ] **Runtime Verification**:
    - Open the app in a browser (`http://localhost:3000`).
    - Navigate to the affected page.
    - Open the Browser Console (F12) to check for Red Errors.
- [ ] **Feature Validation**:
    - If modifying Quiz logic, take a full quiz.
    - If modifying Navigation, click all back/forward buttons.

## 2. Coding Standards
- **Hooks**: Must be at the top level of the component. Never inside `if`, `for`, or other conditional blocks.
- **State**: Use Zustand for global state, React state for local UI.
- **Components**: keep them small and single-purpose.

## 3. Common Pitfalls
- **"Rendered more hooks than during the previous render"**: This means a Hook (`useEffect`, `useState`, `useStore`) was called after an early `return` statement. Always move Hooks to the very top of the function.
