# Image and description search upgrade

Status: Implementation verified; merge pending (2026-09-12)

- [x] Camera and gallery are separate, accessible mobile actions.
- [x] Large photos are resized and compressed before upload.
- [x] Search progress and low-confidence fallback states are clear.
- [x] Visual results open the normal marketplace search page when requested.
- [x] Storefront build and release-contract checks pass.
- [ ] Feature branch is merged and pushed.

Verification:

- `pnpm run build` passed on 2026-09-12, including SEO, marketplace-release, network, accessibility/security, TypeScript, Vite and performance-budget checks.
- Mobile image-search panel was visually checked at a 319 × 925 viewport with the camera/gallery controls, preview and result action visible without horizontal overflow.
