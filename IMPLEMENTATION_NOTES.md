# Implementation Notes

> Fill this in as part of your submission. 1–2 pages, bullet points are fine. Delete these
> instructions before submitting.

## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

-

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

- The app has two sides: a list of change requests for the signed-in user’s company, and a detail page for one request.
- The list tracks idle / loading / loaded / empty / error, and it has a status dropdown, but that filter is not working yet, changing it still shows every row.
- The detail page uses the same loading/error idea, then shows line-item changes, history, and Approve/Reject.
- The timeline looks reversed.
- Approve and Reject do not work. The buttons only look at status, not the user’s permissions.
- The selected row in the CR list does not show up in the detail view, it stays fixed on one CR even after I click another row.
- The layout is very tight: no real visual separator or enough space between the two views.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

-

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
