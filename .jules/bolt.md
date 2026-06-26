## 2025-05-15 - [Memoizing Expensive Inventory Calculations]
**Learning:** Derived statistics and complex object transformations (like the unit-based inventory breakdown) in React components can become a bottleneck when the component re-renders frequently (e.g., during tab switching or modal interactions). Even if the list size is moderate, the cumulative cost of multiple `reduce` and `forEach` operations in every render adds up.
**Action:** Use `useMemo` for any derived data that depends on large arrays or requires complex looping logic, especially in dashboard-style views.
