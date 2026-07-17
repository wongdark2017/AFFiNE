# PRD: Sidebar — "Remove linked doc" context menu on linked child nodes

## Background

In the desktop sidebar (navigation panel), a doc node's children are the docs
referenced from its content, derived via
`DocsSearchService.watchRefsFrom(docId)` (full-text index over blocks with
`refDocId`). `DocsService.addLinkedDoc(target, linked)` appends a paragraph
containing a `LinkedPage` inline reference to the parent doc, which is how the
sidebar "+" button adds a child. There is **no reverse operation**: the only
menu action that removes the entry is "Move to trash", which deletes the doc
itself. To merely unlink, users must open the parent doc and manually delete
the inline `@link` — undiscoverable.

## Requirements

Add a context-menu item on **linked child doc nodes** (nodes rendered with
`isLinked` under a parent doc in the desktop navigation panel):

- Label: en "Remove linked doc" / zh-Hans "从父文档移除链接", icon `UnlinkIcon`.
- Shown only on linked children (not on top-level doc nodes in folders,
  favorites, etc.).
- On click: confirm modal; on confirm, remove from the **parent doc content**:
  1. all inline text references whose `reference.pageId === childDocId`;
  2. all `affine:embed-linked-doc` / `affine:embed-synced-doc` blocks with
     `pageId === childDocId`;
  3. paragraphs emptied by (1) that have no children are deleted (cleans up
     the paragraph `addLinkedDoc` created).
- The child doc itself is NOT deleted (still in All docs; other parents keep
  their links).
- Permission: requires `Doc_Update` on the **parent** doc; otherwise toast
  `com.affine.no-permission` (same pattern as addLinkedDoc call sites).
- New service method `DocsService.removeLinkedDoc(targetDocId, linkedDocId)`
  mirroring `addLinkedDoc` (priority load + waitForSyncReady + release).

## Scope

- Desktop navigation panel only
  (`packages/frontend/core/src/desktop/components/navigation-panel/nodes/doc/`).
- Mobile navigation untouched (follow-up if wanted).
- i18n: add keys to `en.json` + `zh-Hans.json`, regenerate `i18n.gen.ts`
  (`yarn workspace @affine/i18n build`).

## Acceptance Criteria

- [x] Right-clicking a linked child under a doc shows the new item; top-level
      doc nodes do not show it. (Injected via `NavigationPanelLinkedDocNode`
      wrapper used only for linked children.)
- [x] Confirming removes the inline `@link` from the parent's content; after
      re-index the child disappears from the sidebar; the doc still exists in
      All docs. (Unit-tested at store level in
      `remove-doc-references.spec.ts`; sidebar disappearance follows from
      `watchRefsFrom` re-index, verified by reading the distinctUntilChanged
      contract.)
- [x] Embed-linked/synced blocks referencing the child are also removed.
      (Unit-tested.)
- [x] Without `Doc_Update` on the parent, action does not mutate and shows the
      no-permission toast; menu item also disabled via `Guard`.
- [x] Typecheck (full `tsc -b`, exit 0) and eslint/oxlint/prettier on changed
      files pass. Unit tests: 5/5 passed.

## Notes

- Lightweight task: PRD-only, no design.md/implement.md.
