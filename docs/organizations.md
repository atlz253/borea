# Organizations

Organizations provide namespaces for repositories. Repositories with the same
name can exist independently in different organizations.

## Organization List

Open `/organizations` to view the organizations available to the current user.
In full authentication mode this list contains only organizations created by
or shared with that user. Organization names remain globally unique.
The sidebar shows the five most recently created organizations. Use
**Show more** to display the complete list and **Show less** to collapse it.

Select an organization in the page content or sidebar to open its repository
list.

## Organization Repositories

Inside an organization, the sidebar changes to **Repositories** and shows only
repositories the current user can read. Organization owners, administrators,
and moderators see every repository; ordinary members need an explicit
repository grant. The same repository list remains visible
while browsing repository files, commits, pull requests, and settings.

The sidebar initially shows the five most recently created repositories. Use
**Show more** and **Show less** to expand or collapse the list. Select the
**Repositories** heading to return to the current organization's repository
list.

In NoAuth single-organization mode, `/organizations` redirects to the fixed
`default` organization, so the sidebar opens directly in repository context.

## Members and Roles

The organization page lists each member and their role. Authorized users can
invite existing accounts, change roles, or remove members. The owner can
transfer ownership by assigning the `owner` role to another member.

Repository access is managed from the repository **Settings** tab. Grants use
the `read`, `write`, and `moderator` roles. See
[Access Control](security/access-control.md) for the full permission matrix.
