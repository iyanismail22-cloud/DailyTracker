# Security Specification - LifeLink

## Data Invariants
1. A task or finance entry cannot exist without a valid `ownerId` that matches the authenticated user.
2. Health entries are unique per date per user.
3. Timestamps `createdAt` and `updatedAt` must be server-validated.
4. Document IDs must be alphanumeric and length-restricted.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Theft**: Creating a task with `ownerId` of another user.
2. **ID Poisoning**: Using a 2KB string as `taskId`.
3. **Shadow Update**: Adding `isVerified: true` to a task update.
4. **PII Leak**: Non-owner trying to 'get' a health entry (journal).
5. **Timestamp Spoofing**: Sending a manual client timestamp for `createdAt`.
6. **Type Mismatch**: Sending a string for `amount` in finance.
7. **Boundary Breach**: Setting `energyLevel` to 11.
8. **Orphan Write**: Creating a sub-document for a non-existent `userId`.
9. **Blanket Query**: Requesting all tasks without a user filter.
10. **State Corruption**: Updating `date` on an existing finance entry.
11. **Excessive Storage**: Sending a 5MB string in `description`.
12. **Malicious Regex**: Sending invalid characters in ID fields.

## Test Runner Logic
Verified in `firestore.rules.test.ts`.
