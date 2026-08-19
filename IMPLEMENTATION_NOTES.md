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
- Task 3
  - Diff/preview: the template already showed added/removed/changed/unchanged rows plus totals and delta from the CR. The classification bug was fixed in Task 1.
  - Timeline: `audit` was shown as stored (CR-1 was newest-first). `timeline` now copies the array and sorts by `at`, oldest first.
  - Permissions: `canReject` only checked status, so a viewer still saw Reject. It now uses the same rule as `canApprove` (pending **and** `cr_a_o`). Reject stays hidden with `*ngIf`; Approve stays in the DOM but disabled.
  - Actions: `approve()` / `reject()` call the mock API with `submitting` and `actionError`. On success, `state` is replaced with the returned CR. On failure, the loaded CR stays and `.cr-actions__error` shows the message. A second click is ignored while `submitting` is true.
  - List refresh: after a successful action, detail emits `updated` and the shell calls `list.load()`, so the table status updates. Failures do not emit.
  - Reject reason: `rejectControl` uses `Validators.required` and `Validators.pattern(/\S/)`. Empty or spaces-only keeps Reject disabled. `reject()` returns without calling the API if the control is invalid.
- Task 4
  - Detail load states: loading / error / retry were already in the template; I added tests that pin them (same pattern as the list).
  - I kept Approve visible but disabled for a viewer (the original test checks `.disabled`). Reject stays hidden.
  - Selecting a list row now reloads detail: `ngOnChanges` on `id` calls `load()`.
  - Switching “Acting as” clears `selectedId` so we do not keep CR-1 after changing org (that used to show Not found). After the new list loads, the shell selects the first row and opens its detail.

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

- The app has two sides: a list of change requests for the signed-in user’s company, and a detail page for one request.
- The list tracks idle / loading / loaded / empty / error, and it has a status dropdown that filters the table through `visibleRows`.
- The detail page uses the same loading/error idea, then shows line-item changes, a chronological timeline, and Approve/Reject.
- Approve/Reject call the mock API. `submitting` disables the buttons while a call is in flight. Failures set `actionError` and do not clear the loaded CR.
- After a successful action, detail emits `updated` so the list reloads from the same mock API store.
- Changing the selected list row updates `[id]`; detail reloads that CR in `ngOnChanges`.
- Switching user clears the selected CR so detail does not keep an id from another org, then selects the first row of the new list.
- The layout is very tight: no real visual separator or enough space between the two views.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|
| If quantity, price, or description changes, the preview must say `changed`, not `unchanged` | `computeDiff` in `diff.util.ts` |
| A user who cannot approve must not get an enabled Approve button, even if the CR is pending | `canApprove` in `cr-detail.component.ts` (status is `PENDING_APPROVAL` **and** user has `cr_a_o`); the button uses `[disabled]="!canApprove"` |
| The list table only shows rows that match the status dropdown (`ALL` shows every loaded row) | `visibleRows` in `cr-list.component.ts`; the table loops `visibleRows` |
| Timeline is oldest-first | `timeline` getter sorts a copy of `audit` by `at` |
| Reject is only offered when Approve would be allowed | `canReject` returns `canApprove`; template `*ngIf="canReject"` |
| Reject needs a non-blank reason | `rejectControl` validators; button `[disabled]` includes `rejectControl.invalid`; `reject()` returns if invalid |
| A failed Approve/Reject must not wipe the loaded CR | `catch` sets `actionError` only; `state` stays `loaded` |
| The list status must match the API after a successful action | `updated` emit → `list.load()` in `app.component.html` |
| Changing the selected list row must show that CR’s detail | `ngOnChanges` on `id` in `cr-detail.component.ts` |
| Switching user must show the first CR of the new org | `switchUser` sets `selectedId` to `null`; `onListLoaded` picks `rows[0]` |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

- I use TDD for all new behavior: write tests first (they fail), then implement until they pass. Prefer component/DOM tests that pin what the user sees.
- List filter: tests change `.cr-list__filter` and check the rendered row ids. Cover `ALL`, each status that has fixtures, statuses with no rows, and switching back to `ALL`. Empty org still uses the empty message, not the table.
- List load states: loading before `flush`, error via `failNext`, retry after a failed load.
- Diff: extra unit tests for price-only, description-only, and unchanged lines.
- Timeline: CR-1 (reversed fixtures) must render CREATE → SUBMIT → SEND_FOR_APPROVAL with timestamps oldest-first; CR-2/CR-3 stay in order.
- Permissions: viewer sees data but Approve is disabled and Reject is hidden; approver gets both on a pending CR; draft/applied CRs get no actions.
- Actions: success updates status and timeline; in-flight disables Approve; double-click calls the API once; `failNext` keeps the CR and shows `.cr-actions__error`; retry after failure works. No real delays — `flush()` and `failNext` only.
- Validation: empty and whitespace-only reasons disable Reject and show the reason error after touch; `reject()` with an empty reason does not call the API.
- Detail load states: loading before `flush`, error via `failNext`, retry after a failed load. Changing `id` after load shows the new CR.
- Shell: switching user clears `selectedId`, then selects the first loaded CR and shows its detail. A later list reload (after Approve) keeps the current selection.

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- If the status filter matches no rows, I keep `state` as `loaded` and show an empty table. The empty message is only for “this org has no change requests.”
- I gated Approve/Reject on `cr_a_o` (what the seeded approver has), not `canApprovePolicy` (`cr_a_u` / `cr_a_w` / `cr_a_o`).
- Reject uses the same permission as Approve. Spaces-only is not a valid reason.
- I left Approve in the DOM (disabled) because the original test checks `.cr-actions__approve.disabled`. Reject is hidden because the template already used `*ngIf`.
- Totals/delta come from the API CR fields; I did not recompute them from line items.
- Reloading the list after success uses the existing `load()` (including its loading state), so the table can flash “Loading…” briefly.
- Switching user clears the selected CR first (so another org never reuses CR-1), then auto-selects the first row after that org’s list loads. An empty org stays with no detail.

## 6. Where I used AI
I used Cursor for the whole exercise: reading the scaffold, writing tests first, implementing the list/detail/shell changes, and drafting these notes.


## 7. What I'd improve with more time
- A bit more space / a divider between the two panes (visual polish was out of scope).
- Use `canApprovePolicy` so user/workspace approve scopes work, not only `cr_a_o`.
- Refresh the list without flipping back through the loading state.
