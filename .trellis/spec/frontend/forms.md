# Frontend Forms & User Input

> How forms are actually built in `packages/frontend/core`, verified against current source.
> No form library is used — no react-hook-form, formik, or zod-for-forms. Form state is plain
> React `useState`; validation is hand-written in the submit handler.

---

## Building blocks — use `@affine/component`, never raw HTML controls

Primitives live in `packages/frontend/component/src/ui/*`, one folder per component with a
colocated vanilla-extract `*.css.ts`:

| Component                                | Path                                        | Notes                                                                                                                         |
| ---------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Input`                                  | `ui/input/input.tsx`                        | `onChange` yields `(value: string)`, not the event. Has `status` (`error`/`success`/`warning`), `preFix`/`endFix`, `onEnter`. |
| `RowInput`                               | `ui/input/row-input.tsx`                    | Bare input; used directly in dialogs (e.g. create-workspace).                                                                 |
| `AuthInput`                              | `components/auth-components/auth-input.tsx` | `Input` + `label`, `error`, `errorHint`. Auth flows only.                                                                     |
| `Button`                                 | `ui/button/button.tsx`                      | `variant`, `size`, `loading`, `block`.                                                                                        |
| `Modal` / `ConfirmModal` / `PromptModal` | `ui/modal/`                                 | `ConfirmModal` takes async `onConfirm` and `customConfirmButton`.                                                             |
| `RadioGroup`, `Switch`, `Checkbox`       | `ui/radio/`, `ui/switch/`, `ui/checkbox/`   |                                                                                                                               |
| `notify`                                 | `ui/notification/notify.tsx`                | The standard toast: `notify.success(...)` / `notify.error(...)`.                                                              |

---

## The form pattern

Reference implementations:

- `packages/frontend/core/src/components/sign-in/sign-in.tsx` (email step)
- `packages/frontend/core/src/components/sign-in/sign-in-with-email.tsx` (OTP step)
- `packages/frontend/core/src/desktop/dialogs/create-workspace/index.tsx` (dialog form)

1. **State**: plain `useState` per field, plus booleans for validity and mutation-in-flight:

   ```tsx
   const [email, setEmail] = useState('');
   const [isValidEmail, setIsValidEmail] = useState(true);
   const [isMutating, setIsMutating] = useState(false);
   ```

2. **Services via DI, reactive reads via LiveData** — not jotai/redux for form data:

   ```tsx
   const authService = useService(AuthService);
   const status = useLiveData(authService.session.status$);
   ```

3. **Submission**: wrap the async handler in `useAsyncCallback` from
   `packages/frontend/core/src/components/hooks/affine-async-hooks.ts` — it routes uncaught
   errors to `AsyncCallbackContext`. `<form onSubmit>` calls `event.preventDefault()` then the
   callback.

   ```tsx
   const onContinue = useAsyncCallback(async () => {
     if (!validateEmail(email)) {
       setIsValidEmail(false);
       return;
     }
     setIsMutating(true);
     try {
       await authService.checkUserByEmail(email);
     } catch (err: any) {
       notify.error({ title: '...', message: err.message });
     }
     setIsMutating(false);
   }, [authService, email]);
   ```

4. **Validation**: hand-written in the submit handler (regex/length checks), surfaced through
   the input's `error`/`errorHint` props. There is no schema-driven form validation. (`zod` is a
   dependency but is used for data/spec validation, not forms.)

5. **Feedback**: `Button loading={isMutating} disabled={isMutating}`; `notify.error` /
   `notify.success` toasts; backend errors normalized with `UserFriendlyError.fromAny(err)`
   (`@affine/error`) and mapped to i18n keys: ``t[`error.${error.name}`](error.data)``.

6. **Analytics**: user-visible actions fire `track.*` events (see
   `create-workspace/index.tsx` → `track.$.$.$.createWorkspace(...)`).

---

## Calling GraphQL mutations from a form

Components never call GraphQL directly. The chain is:

```
@affine/graphql typed operation → Store/Service method using GraphQLService.gql()
  → component calls the service from a useAsyncCallback handler
```

- Service: `packages/frontend/core/src/modules/cloud/services/graphql.ts` — `GraphQLService.gql({ query, variables })`; normalizes errors to `UserFriendlyError` and revalidates the session on 401. `rxGql` exists for reactive queries.
- Example mutation site: `packages/frontend/core/src/modules/cloud/stores/auth.ts`:

  ```ts
  async updateLabel(label: string) {
    await this.gqlService.gql({
      query: updateUserProfileMutation,
      variables: { input: { name: label } },
    });
  }
  ```

There is **no `useMutation` hook** (no Apollo/urql). New mutations go into a store/service under
`packages/frontend/core/src/modules/<domain>/{stores,services}/`.

---

## Styling

vanilla-extract `.css.ts` colocated with the component, tokens from `@toeverything/theme`
(`cssVar`) and `@toeverything/theme/v2` (`cssVarV2`), state toggled via selector classes
combined with `clsx`. Example: `packages/frontend/component/src/ui/input/style.css.ts`.

---

## Anti-patterns

- Adding react-hook-form/formik or zod-based form schemas — not used anywhere in this repo.
- Raw `<input>`/`<button>` instead of `@affine/component` primitives.
- Calling `GraphQLService.gql()` directly from a component — put it in a store/service.
- Bare async handlers on events — wrap with `useAsyncCallback` (or `useCatchEventCallback`) so errors are routed.
- Hardcoded colors instead of `cssVarV2(...)` tokens.
