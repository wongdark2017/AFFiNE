# Admin UI 英文文案盘点（自动扫描，共 217 条）

> 生成方式见 scratchpad/scan-strings.mjs；启发式扫描，实施时以逐文件人工确认为准。

## app.tsx (1)

- `app.tsx:58` [toast] You are not an admin, please login the admin account.

## components (18)

- `components/shared/confirm-dialog.tsx:29` [prop] Cancel
- `components/shared/confirm-dialog.tsx:30` [prop] Confirm
- `components/shared/data-table-pagination.tsx:64` [jsx] Rows per page
- `components/shared/data-table-pagination.tsx:94` [jsx] Go to first page
- `components/shared/data-table-pagination.tsx:103` [jsx] Go to previous page
- `components/shared/data-table-pagination.tsx:112` [jsx] Go to next page
- `components/shared/data-table-pagination.tsx:121` [jsx] Go to last page
- `components/shared/discard-changes.tsx:8` [prop] Changes will not be saved.
- `components/shared/discard-changes.tsx:20` [prop] Discard Changes
- `components/shared/discard-changes.tsx:22` [prop] Discard
- `components/shared/feature-filter-popover.tsx:70` [jsx] Filter by feature
- `components/ui/breadcrumb.tsx:101` [jsx] More
- `components/ui/carousel.tsx:238` [jsx] Previous slide
- `components/ui/carousel.tsx:267` [jsx] Next slide
- `components/ui/dialog.tsx:47` [jsx] Close
- `components/ui/pagination.tsx:73` [jsx] Previous
- `components/ui/pagination.tsx:88` [jsx] Next
- `components/ui/pagination.tsx:104` [jsx] More pages

## modules/about (6)

- `modules/about/about.tsx:26` [prop] Star AFFiNE on GitHub
- `modules/about/about.tsx:31` [prop] Report an Issue
- `modules/about/about.tsx:36` [prop] Self-host Document
- `modules/about/about.tsx:41` [prop] Upgrade to Team
- `modules/about/about.tsx:49` [jsx] About AFFiNE
- `modules/about/index.tsx:9` [prop] Server

## modules/accounts (61)

- `modules/accounts/components/columns.tsx:106` [prop] Select all
- `modules/accounts/components/columns.tsx:124` [prop] Select row
- `modules/accounts/components/columns.tsx:140` [prop] Name
- `modules/accounts/components/columns.tsx:180` [prop] User Detail
- `modules/accounts/components/columns.tsx:228` [jsx] No features
- `modules/accounts/components/columns.tsx:244` [prop] Actions
- `modules/accounts/components/data-table-row-actions.tsx:70` [toast] Reset password link copied to clipboard
- `modules/accounts/components/data-table-row-actions.tsx:74` [toast] Failed to copy reset password link:
- `modules/accounts/components/data-table-row-actions.tsx:175` [jsx] Open menu
- `modules/accounts/components/data-table-toolbar.tsx:137` [jsx] Import
- `modules/accounts/components/data-table-toolbar.tsx:150` [jsx] Export
- `modules/accounts/components/data-table-toolbar.tsx:176` [prop] Search Email / UUID
- `modules/accounts/components/data-table-toolbar.tsx:186` [jsx] Add User
- `modules/accounts/components/delete-account.tsx:20` [prop] Delete Account ?
- `modules/accounts/components/delete-account.tsx:29` [prop] Delete
- `modules/accounts/components/disable-account.tsx:20` [prop] Disable Account ?
- `modules/accounts/components/disable-account.tsx:30` [prop] Disable
- `modules/accounts/components/enable-account.tsx:20` [prop] Enable Account
- `modules/accounts/components/enable-account.tsx:28` [prop] Enable
- `modules/accounts/components/export-users-dialog.tsx:35` [prop] Username
- `modules/accounts/components/export-users-dialog.tsx:40` [prop] Email
- `modules/accounts/components/export-users-dialog.tsx:62` [toast] Users exported successfully
- `modules/accounts/components/export-users-dialog.tsx:66` [toast] Failed to export users
- `modules/accounts/components/export-users-dialog.tsx:77` [toast] Users copied successfully
- `modules/accounts/components/export-users-dialog.tsx:81` [toast] Failed to copy users
- `modules/accounts/components/import-users/csv-format-guidance.tsx:23` [jsx] CSV file includes username, email, and password.
- `modules/accounts/components/import-users/file-upload-area.tsx:15` [jsx] Promise
- `modules/accounts/components/import-users/file-upload-area.tsx:52` [toast] Please upload a CSV file
- `modules/accounts/components/import-users/import-content.tsx:70` [prop] You need to import the accounts by importing a CSV file in the correct format. Please download the CSV template.
- `modules/accounts/components/import-users/use-import-users-state.ts:68` [toast] Successfully imported ${successCount} users
- `modules/accounts/components/import-users/use-import-users-state.ts:143` [toast] Failed to import users
- `modules/accounts/components/reset-password.tsx:28` [jsx] Account Recovery Link
- `modules/accounts/components/reset-password.tsx:39` [prop] Please type email to confirm
- `modules/accounts/components/reset-password.tsx:44` [jsx] Copy and Close
- `modules/accounts/components/use-user-management.ts:63` [toast] Account updated successfully
- `modules/accounts/components/use-user-management.ts:65` [toast] Failed to update account:
- `modules/accounts/components/use-user-management.ts:138` [toast] Failed to reset password:
- `modules/accounts/components/use-user-management.ts:164` [toast] User deleted successfully
- `modules/accounts/components/use-user-management.ts:168` [toast] Failed to delete user:
- `modules/accounts/components/use-user-management.ts:189` [toast] User ${enableUser.email} enabled successfully
- `modules/accounts/components/use-user-management.ts:193` [toast] Failed to enable user:
- `modules/accounts/components/use-user-management.ts:213` [toast] User ${banUser.email} disabled successfully
- `modules/accounts/components/use-user-management.ts:217` [toast] Failed to disable user:
- `modules/accounts/components/use-user-management.ts:243` [toast] Failed to import users:
- `modules/accounts/components/user-form.tsx:126` [prop] User name
- `modules/accounts/components/user-form.tsx:130` [prop] Enter user name
- `modules/accounts/components/user-form.tsx:138` [prop] Enter email address
- `modules/accounts/components/user-form.tsx:144` [prop] Password
- `modules/accounts/components/user-form.tsx:149` [prop] Enter password
- `modules/accounts/components/user-form.tsx:259` [prop] Create User
- `modules/accounts/components/user-form.tsx:305` [prop] Update User
- `modules/accounts/components/user-form.tsx:318` [jsx] Reset Password
- `modules/accounts/components/user-form.tsx:326` [jsx] Delete Account
- `modules/accounts/index.tsx:46` [prop] Accounts
- `modules/accounts/utils/csv-utils.ts:37` [prop] Invalid password format
- `modules/accounts/utils/csv-utils.ts:71` [prop] Invalid email format
- `modules/accounts/utils/csv-utils.ts:76` [prop] Duplicate email address
- `modules/accounts/utils/csv-utils.ts:122` [toast] Exported ${results.length} import results
- `modules/accounts/utils/csv-utils.ts:168` [toast] CSV file format is incorrect or empty
- `modules/accounts/utils/csv-utils.ts:184` [toast] CSV file contains no valid user data
- `modules/accounts/utils/csv-utils.ts:201` [toast] Failed to parse CSV file

## modules/ai (6)

- `modules/ai/index.tsx:22` [jsx] Enable AI
- `modules/ai/keys.tsx:15` [jsx] Keys
- `modules/ai/keys.tsx:20` [jsx] OpenAI Key
- `modules/ai/keys.tsx:29` [jsx] Save
- `modules/ai/keys.tsx:34` [jsx] Fal.AI Key
- `modules/ai/keys.tsx:48` [jsx] Unsplash Key

## modules/auth (6)

- `modules/auth/index.tsx:62` [toast] Logged in successfully
- `modules/auth/index.tsx:65` [toast] You are not an admin
- `modules/auth/index.tsx:70` [toast] Failed to login: ${err.message}
- `modules/auth/index.tsx:85` [jsx] Login
- `modules/auth/index.tsx:93` [jsx] Email
- `modules/auth/index.tsx:105` [jsx] Password

## modules/dashboard (25)

- `modules/dashboard/index.tsx:266` [jsx] No data
- `modules/dashboard/index.tsx:621` [jsx] License Preview
- `modules/dashboard/index.tsx:640` [jsx] Confirm
- `modules/dashboard/index.tsx:666` [toast] No license file selected.
- `modules/dashboard/index.tsx:672` [toast] Failed to open license file picker.
- `modules/dashboard/index.tsx:709` [toast] Failed to preview license.
- `modules/dashboard/index.tsx:722` [prop] Preview license
- `modules/dashboard/index.tsx:751` [prop] Dashboard menu
- `modules/dashboard/index.tsx:790` [prop] Dashboard
- `modules/dashboard/index.tsx:888` [jsx] Top Shared Links
- `modules/dashboard/index.tsx:913` [jsx] Go to Workspaces
- `modules/dashboard/index.tsx:920` [jsx] Document
- `modules/dashboard/index.tsx:921` [jsx] Workspace
- `modules/dashboard/index.tsx:922` [jsx] Views
- `modules/dashboard/index.tsx:923` [jsx] Unique
- `modules/dashboard/index.tsx:924` [jsx] Guest
- `modules/dashboard/index.tsx:925` [jsx] Last Accessed
- `modules/dashboard/index.tsx:1138` [jsx] Status
- `modules/dashboard/index.tsx:1139` [jsx] Mail type
- `modules/dashboard/index.tsx:1140` [jsx] Success / failure
- `modules/dashboard/index.tsx:1148` [jsx] Sent
- `modules/dashboard/index.tsx:1154` [jsx] Not delivered
- `modules/dashboard/index.tsx:1160` [jsx] Pending
- `modules/dashboard/index.tsx:1166` [jsx] Success rate
- `modules/dashboard/index.tsx:1321` [prop] Copilot Conversations

## modules/layout.tsx (1)

- `modules/layout.tsx:297` [jsx] Right Panel

## modules/nav (13)

- `modules/nav/nav.tsx:37` [prop] Dashboard
- `modules/nav/nav.tsx:44` [prop] Accounts
- `modules/nav/nav.tsx:51` [prop] Workspaces
- `modules/nav/nav.tsx:58` [prop] Queue
- `modules/nav/nav.tsx:71` [prop] About
- `modules/nav/server-version.tsx:23` [prop] New Version ${availableUpgrade.version} Available
- `modules/nav/server-version.tsx:26` [jsx] New Version
- `modules/nav/server-version.tsx:28` [jsx] Available
- `modules/nav/settings-item.tsx:11` [prop] Settings
- `modules/nav/user-dropdown.tsx:49` [jsx] Admin
- `modules/nav/user-dropdown.tsx:91` [toast] Logged out successfully
- `modules/nav/user-dropdown.tsx:95` [toast] Failed to logout: ${err.message}
- `modules/nav/user-dropdown.tsx:123` [jsx] Logout

## modules/queue (1)

- `modules/queue/index.tsx:88` [prop] Queue

## modules/settings (25)

- `modules/settings/config-input-row.tsx:136` [prop] Select an option
- `modules/settings/config.ts:49` [prop] Server
- `modules/settings/config.ts:54` [prop] Auth
- `modules/settings/config.ts:62` [prop] Minimum account age in seconds before new accounts can invite members or create share links.
- `modules/settings/config.ts:69` [prop] Minimum length requirement of password
- `modules/settings/config.ts:75` [prop] Maximum length requirement of password
- `modules/settings/config.ts:80` [prop] Notification
- `modules/settings/config.ts:94` [prop] Storage
- `modules/settings/config.ts:99` [prop] The storage provider for user uploaded blobs
- `modules/settings/config.ts:108` [prop] The bucket name for user uploaded blobs storage
- `modules/settings/config.ts:114` [prop] The S3 compatible config for the storage provider (endpoint/region/credentials).
- `modules/settings/config.ts:118` [prop] The storage provider for user avatars
- `modules/settings/config.ts:127` [prop] The bucket name for user avatars storage
- `modules/settings/config.ts:138` [prop] The public path prefix for user avatars(e.g. https://my-bucket.s3.amazonaws.com/)
- `modules/settings/config.ts:160` [prop] The storage provider for copilot blobs
- `modules/settings/config.ts:169` [prop] The bucket name for copilot blobs storage
- `modules/settings/index.tsx:36` [prop] Settings
- `modules/settings/index.tsx:70` [jsx] Promise
- `modules/settings/operations/send-test-email.tsx:19` [prop] Test email sent
- `modules/settings/operations/send-test-email.tsx:20` [prop] The test email has been successfully sent.
- `modules/settings/operations/send-test-email.tsx:25` [prop] Failed to send test email
- `modules/settings/operations/send-test-email.tsx:31` [jsx] Send Test Email
- `modules/settings/use-app-config.ts:127` [prop] Saved
- `modules/settings/use-app-config.ts:128` [prop] Settings have been saved successfully.
- `modules/settings/use-app-config.ts:133` [prop] Failed to save

## modules/setup (5)

- `modules/setup/create-admin.tsx:64` [jsx] Name
- `modules/setup/create-admin.tsx:74` [jsx] Email
- `modules/setup/create-admin.tsx:90` [jsx] Password
- `modules/setup/form.tsx:118` [toast] Admin account created successfully.
- `modules/setup/form.tsx:174` [toast] Goto Admin Panel failed, please try again.

## modules/workspaces (47)

- `modules/workspaces/components/columns.tsx:19` [jsx] Workspace
- `modules/workspaces/components/columns.tsx:49` [jsx] No features
- `modules/workspaces/components/columns.tsx:58` [jsx] Owner
- `modules/workspaces/components/columns.tsx:62` [jsx] Unknown
- `modules/workspaces/components/columns.tsx:84` [jsx] Usage
- `modules/workspaces/components/columns.tsx:105` [jsx] Active Members
- `modules/workspaces/components/columns.tsx:112` [jsx] active members
- `modules/workspaces/components/columns.tsx:116` [jsx] shared pages
- `modules/workspaces/components/columns.tsx:128` [jsx] Actions
- `modules/workspaces/components/data-table-row-actions.tsx:110` [jsx] Edit
- `modules/workspaces/components/data-table-row-actions.tsx:119` [jsx] Shared links
- `modules/workspaces/components/data-table-row-actions.tsx:130` [prop] Changes to this workspace will not be saved.
- `modules/workspaces/components/data-table-toolbar.tsx:38` [prop] Created time
- `modules/workspaces/components/data-table-toolbar.tsx:39` [prop] Blob count
- `modules/workspaces/components/data-table-toolbar.tsx:40` [prop] Blob size
- `modules/workspaces/components/data-table-toolbar.tsx:41` [prop] Snapshot count
- `modules/workspaces/components/data-table-toolbar.tsx:42` [prop] Snapshot size
- `modules/workspaces/components/data-table-toolbar.tsx:43` [prop] Member count
- `modules/workspaces/components/data-table-toolbar.tsx:44` [prop] Public pages
- `modules/workspaces/components/data-table-toolbar.tsx:90` [prop] Public
- `modules/workspaces/components/data-table-toolbar.tsx:91` [prop] Enable sharing
- `modules/workspaces/components/data-table-toolbar.tsx:92` [prop] Enable AI
- `modules/workspaces/components/data-table-toolbar.tsx:93` [prop] Enable URL preview
- `modules/workspaces/components/data-table-toolbar.tsx:94` [prop] Enable doc embedding
- `modules/workspaces/components/data-table-toolbar.tsx:190` [prop] Search Workspace / Owner
- `modules/workspaces/components/workspace-panel.tsx:130` [toast] Workspace updated successfully
- `modules/workspaces/components/workspace-panel.tsx:137` [toast] Failed to update workspace: ${(e as Error).message}
- `modules/workspaces/components/workspace-panel.tsx:156` [prop] Update Workspace
- `modules/workspaces/components/workspace-panel.tsx:163` [jsx] Workspace ID
- `modules/workspaces/components/workspace-panel.tsx:166` [jsx] Name
- `modules/workspaces/components/workspace-panel.tsx:172` [prop] Workspace name
- `modules/workspaces/components/workspace-panel.tsx:180` [prop] Allow public access to workspace pages
- `modules/workspaces/components/workspace-panel.tsx:189` [prop] Allow AI features in this workspace
- `modules/workspaces/components/workspace-panel.tsx:197` [prop] Enable URL Preview
- `modules/workspaces/components/workspace-panel.tsx:198` [prop] Allow URL previews in shared pages
- `modules/workspaces/components/workspace-panel.tsx:206` [prop] Allow Workspace Sharing
- `modules/workspaces/components/workspace-panel.tsx:207` [prop] Allow pages in this workspace to be shared publicly
- `modules/workspaces/components/workspace-panel.tsx:215` [prop] Enable Doc Embedding
- `modules/workspaces/components/workspace-panel.tsx:216` [prop] Allow document embedding for search
- `modules/workspaces/components/workspace-panel.tsx:226` [prop] Snapshot Size
- `modules/workspaces/components/workspace-panel.tsx:230` [prop] Snapshot Count
- `modules/workspaces/components/workspace-panel.tsx:234` [prop] Blob Size
- `modules/workspaces/components/workspace-panel.tsx:237` [prop] Blob Count
- `modules/workspaces/components/workspace-panel.tsx:243` [prop] Shared Pages
- `modules/workspaces/components/workspace-shared-links-panel.tsx:41` [prop] Shared Links
- `modules/workspaces/components/workspace-shared-links-panel.tsx:63` [jsx] No shared links.
- `modules/workspaces/index.tsx:31` [prop] Workspaces

## use-mutation.ts (1)

- `use-mutation.ts:32` [prop] John Doe

## use-query.ts (1)

- `use-query.ts:38` [jsx] Promise
