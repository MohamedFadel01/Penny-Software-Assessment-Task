# Implementation Notes

> Fill this in as part of your submission. 1–2 pages, bullet points are fine. Delete these
> instructions before submitting.

## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

- Task 1
  - Diff: `computeDiff` only compared unit price, so a quantity-only change (CR-1: SKU-A 10 → 11) was marked `unchanged`. I also compare quantity and description, so a line is `changed` if any of those fields differ.
  - Approve permission: `canApprove` only checked that the CR is `PENDING_APPROVAL`, so a read-only viewer still got an enabled Approve button. I also require the current user to have the `cr_a_o` policy. Approvers can still approve pending CRs; viewers cannot.
- Task 2
  - Status filter: `visibleRows` always returned every loaded row, so the status dropdown did nothing. It now returns all rows when the filter is `ALL`, and only rows with that status otherwise. Loading / empty / error are unchanged.

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

- The app has two sides: a list of change requests for the signed-in user’s company, and a detail page for one request.
- The list tracks idle / loading / loaded / empty / error, and it has a status dropdown that now filters the table through `visibleRows`.
- The detail page uses the same loading/error idea, then shows line-item changes, history, and Approve/Reject.
- The timeline looks reversed.
- Approve and Reject do not work yet. Approve now also checks `cr_a_o`; Reject still only looks at status.
- The selected row in the CR list does not show up in the detail view, it stays fixed on one CR even after I click another row.
- The layout is very tight: no real visual separator or enough space between the two views.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|
| If quantity, price, or description changes, the preview must say `changed`, not `unchanged` | `computeDiff` in `diff.util.ts` |
| A user who cannot approve must not get an enabled Approve button, even if the CR is pending | `canApprove` in `cr-detail.component.ts` (status is `PENDING_APPROVAL` **and** user has `cr_a_o`); the button uses `[disabled]="!canApprove"` |
| The list table only shows rows that match the status dropdown (`ALL` shows every loaded row) | `visibleRows` in `cr-list.component.ts`; the table loops `visibleRows` |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

- I use TDD for all new behavior: write tests first (they fail), then implement until they pass. Prefer component/DOM tests that pin what the user sees.
- List filter: tests change `.cr-list__filter` and check the rendered row ids. Cover `ALL`, each status that has fixtures, statuses with no rows, and switching back to `ALL`. Empty org still uses the empty message, not the table.

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- If the status filter matches no rows, I keep `state` as `loaded` and show an empty table. The empty message is only for “this org has no change requests.”

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
