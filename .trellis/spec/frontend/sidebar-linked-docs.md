# Sidebar linked-doc children (navigation panel)

## How doc-node children work

- Desktop sidebar doc tree: `packages/frontend/core/src/desktop/components/navigation-panel/nodes/doc/`.
- A doc node's children are **derived data**: `DocsSearchService.watchRefsFrom(docId)`
  searches the full-text index for blocks with `refDocId` — i.e. children = docs
  referenced from the parent's content (inline `@doc` refs and embed blocks).
  There is no stored child list; UI updates only after the indexer re-indexes.
- Visibility is gated by the `showLinkedDocInSidebar` app setting.
- Linked children are rendered via `NavigationPanelLinkedDocNode` (same file),
  which wraps `NavigationPanelDocNode` and injects extra operations from
  `useNavigationPanelDocLinkedNodeOperations(parentDocId, docId)`.

## Mutating links from outside the editor

- `DocsService.addLinkedDoc(target, linked)` appends a paragraph with a
  `LinkedPage` inline reference to the parent doc.
- `DocsService.removeLinkedDoc(target, linked)` removes all references to a doc
  from the parent's content. Core logic is the pure helper
  `removeDocReferences(store, linkedDocId)`
  (`modules/doc/services/remove-doc-references.ts`, unit-tested with
  `TestWorkspace` + `getStoreManager()` extensions): deletes
  `affine:embed-linked-doc`/`affine:embed-synced-doc` blocks whose
  `props.pageId` matches, strips matching inline reference deltas from
  paragraph/list text, and drops paragraphs the removal emptied.
- Both open the doc via `docsService.open()` + `addPriorityLoad(10)` +
  `waitForSyncReady()` and `release()` in a `finally`.
- Permission pattern at call sites: `guardService.can('Doc_Update', parentDocId)`
  → `toast(t['com.affine.no-permission']())` on failure; menu items are wrapped
  in `<Guard docId={...} permission="Doc_Update">` for disabled state.

## Gotcha: reactive `Text` signals inside transactions

`Text.length` / `Text.deltas$` (blocksuite reactive text) are backed by signals
updated in a `yText.observe` callback, which Yjs fires only when the
**outermost transaction commits**. Inside a `store.transact(() => { ... })`
block, reads after a mutation return stale values. Use the underlying
`text.yText.length` / `text.toDelta()` (reads `_yText` directly) for
read-after-write within a transaction.
