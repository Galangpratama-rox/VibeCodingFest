# Security Specification for MedisCek

## 1. Data Invariants
- `history_pemeriksaan`: Each record must have a `userId` matching the authenticated user's UID. The `userEmail` must match the authenticated user's email. Timestamps must be server-generated.
- `users`: Users can only access and modify their own profile based on their UID.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a history record with another user's `userId`.
2. **Email Spoofing**: Attempt to create a history record with a different `userEmail` than the auth token.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user profile.
4. **Timestamp Manipulation**: Sending a manual `timestamp` instead of `serverTimestamp()`.
5. **Unauthorized Access**: Unauthenticated user attempting to read the `history_pemeriksaan` collection.
6. **Cross-User Data Leak**: User A trying to read User B's history by ID.
7. **Recursive Cost Attack**: Attempting to use a very long string as a document ID.
8. **PII Blanket Read**: Trying to list all users in the `users` collection.
9. **State Shortcutting**: (N/A for this app, but relevant for transitions).
10. **Malicious Payload**: Sending an extremely large object as `jawaban_ai`.
11. **ID Poisoning**: Using a non-alphanumeric ID for a history record.
12. **Insecure Search**: Listing history without a `where('userId', '==', uid)` clause.

## 3. The Test Runner (Plan)
- We will verify that each of these attempts returns PERMISSION_DENIED.
