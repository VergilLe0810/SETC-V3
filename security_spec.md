# Security Specification for Petrovietnam SETC Application

This specification describes the security invariants, malicious payloads, and rules testing strategy to protect the application's Firestore database from unauthorized access, identity spoofing, and data poisoning.

## 1. Data Invariants

- **Identity Isolation**: A user's profile metadata (such as `authorizedLevel`) cannot be escalated by the user themselves. Only Level 4 Administrative Officers can grant higher access levels (Level 2, 3, 4).
- **Relational Integrity**: Courses, Course Sessions, and Tasks must have valid identifier structures and correct owner associations.
- **Strict Fields Enforcements**: During document creation, exact keys must be matched to prevent shadow or phantom fields from being added.
- **Temporal Validation**: Any timestamp tracking creation/updates must strictly match `request.time` (the server's verified clock).

## 2. The Dirty Dozen Payloads (Fail Cases)

The following payload scenarios must be rejected by Firestore Security Rules:

1. **Privilege Escalation on Create**: User registers a new member but sets `authorizedLevel: "level 4"` without administrative clearance.
2. **Privilege Escalation on Update**: User attempts to update their own `authorizedLevel` field from `"level 1"` to `"level 4"`.
3. **Identity Spoofing on Member Creation**: User specifies an email address of an admin, but is not verified or authenticated as that admin.
4. **ID Poisoning Attack**: User attempts to inject a 10KB junk-character string as a course or member ID.
5. **Phantom Fields Injection**: User creates a Course document containing unlisted arbitrary fields like `isApproved: true`.
6. **Task Hijacking**: User attempts to delete or modify a task that was assigned to another personnel member.
7. **Task State Forgery**: Contributor attempts to modify the course name or due date of a task where they are only allowed to update the status to `"Completed"`.
8. **Relational Deletion Spoofing**: Regular trainer attempt to delete a Classroom Course structure without Level 4 clearance.
9. **Tampered Client Clock (Create)**: User attempts to bypass server timestamp verification by providing a client-side timestamp `"2025-01-01"` as `createdAt`.
10. **Tampered Client Clock (Update)**: User attempts to modify `updatedAt` to an arbitrary timestamp instead of enforcing `request.time`.
11. **Malicious Empty Fields**: User attempts to save a member record with an empty `name` or invalid empty `email` pattern.
12. **Bypassing Query Enforcement**: User performs a wildcard read on unauthorized task sheets without passing their assigned login constraints in the client query list.

## 3. Security Rules Design Summary

The rules must implement:
- Default deny catch-all `match /{document=**} { allow read, write: if false; }`.
- Unified validation helpers (`isValidMember`, `isValidCourse`, `isValidSession`, `isValidTask`).
- Strict key checks with `affectedKeys().hasOnly(...)` during updates.
- Temporal integrity checks utilizing `request.time`.
- Admin permissions resolved dynamically from the matching admin email validation or Level 4 profile checks.
