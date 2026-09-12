# Compact marketplace search upgrade

Status: Completed and published (2026-09-12)

- [x] Keep the header as the single central marketplace search.
- [x] Close autocomplete on submit and ignore stale suggestion responses.
- [x] Prevent iOS search focus zoom with 16px form controls.
- [x] Replace stacked catalogue cards with a category rail and unified control bar.
- [x] Keep active filters removable in a compact horizontal row.
- [x] Production build and responsive structure checks pass.
- [x] Feature branch is merged and pushed.

Release evidence: production build passed with SEO, marketplace, network, accessibility/security and performance validations. Final rendered-device acceptance follows the main-branch deployment because the restricted local environment could not bind a preview port.

Feature commit: `2ebddc8`

Main merge commit: `f64a9f4`
