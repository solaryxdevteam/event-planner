---
description: Guidelines for where to place business logic - database vs backend services
alwaysApply: true
---

# Business Logic Placement: Database vs Backend

## Core Principle

**Business logic belongs in the backend service layer, NOT in the database.**

Database functions should be limited to:
- Simple data transformations
- Triggers for data integrity
- Performance-critical read operations

## Why Backend Over Database?

### ✅ Advantages of Backend Implementation

1. **Testability**
   - Easy to write unit tests
   - Mock dependencies easily
   - Test edge cases thoroughly

2. **Maintainability**
   - Easier to read and modify
   - Better IDE support (autocomplete, refactoring)
   - Simpler debugging

3. **Flexibility**
   - Can add logging, metrics, notifications
   - Easy to integrate with external services
   - Can handle complex business rules

4. **Type Safety**
   - TypeScript provides compile-time checks
   - Better error handling
   - Clear interfaces and contracts

5. **Version Control**
   - Changes tracked in source control
   - Easy to review in PRs
   - Clear migration path

### ❌ Disadvantages of Database Functions

1. **Hard to Test**
   - Requires database connection
   - Difficult to mock dependencies
   - Integration tests are slow

2. **Limited Debugging**
   - Poor error messages
   - Hard to step through code
   - Limited logging capabilities

3. **Vendor Lock-in**
   - PostgreSQL-specific syntax
   - Harder to migrate databases
   - Limited portability

4. **Difficult to Maintain**
   - Must use SQL/PL-pgSQL
   - No IDE autocomplete
   - Hard to refactor

---

## Decision Matrix

### ✅ Use Database Functions For:

#### Triggers
```sql
-- GOOD: Data integrity at database level
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Why:** Guarantees consistency regardless of how data is updated

#### Simple Transformations
```sql
-- GOOD: Simple data transformation
CREATE OR REPLACE FUNCTION slugify(text TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(trim($1), '[^a-z0-9]+', '-', 'gi'));
$$ LANGUAGE SQL IMMUTABLE;
```

**Why:** Pure function, no side effects, performance benefit

#### Performance-Critical Operations
```sql
-- GOOD: Leverages database indexes and query optimization
CREATE OR REPLACE FUNCTION get_recent_events(days INTEGER)
RETURNS TABLE (id UUID, title TEXT) AS $$
  SELECT id, title FROM events 
  WHERE event_date >= CURRENT_DATE - days
  ORDER BY event_date DESC;
$$ LANGUAGE SQL STABLE;
```

**Why:** Database can optimize this better than application code

---

### ❌ Use Backend Services For:

#### Complex Business Logic
```typescript
// GOOD: Complex logic in backend service
export async function buildApprovalChain(creatorUserId: string): Promise<string[]> {
  const config = await getApprovalConfig();
  const path = await getPathToRoot(creatorUserId);
  const potentialApprovers = path.slice(1);
  
  return potentialApprovers
    .filter(user => config.config_data[user.role] === true)
    .map(user => user.id);
}
```

**Why:** Easy to test, debug, and modify. Can add logging and metrics.

#### Multi-Step Workflows
```typescript
// GOOD: Orchestration in service layer
export async function submitEventForApproval(eventId: string) {
  // 1. Validate event
  const event = await validateEvent(eventId);
  
  // 2. Build approval chain
  const approvers = await buildApprovalChain(event.creator_id);
  
  // 3. Create approval records
  await createApprovalRecords(eventId, approvers);
  
  // 4. Send notifications
  await notifyFirstApprover(approvers[0], eventId);
  
  // 5. Log audit trail
  await auditLog.log('submit_for_approval', eventId);
  
  // 6. Update event status
  await updateEventStatus(eventId, 'in_review');
}
```

**Why:** Clear flow, easy to modify, integrated with external services.

#### External Integrations
```typescript
// GOOD: External service calls in backend
export async function sendApprovalNotification(userId: string, eventId: string) {
  const user = await getUser(userId);
  const event = await getEvent(eventId);
  
  // Send email via external service
  await emailService.send({
    to: user.email,
    subject: 'New Event Awaiting Approval',
    template: 'approval-request',
    data: { user, event }
  });
}
```

**Why:** Database cannot call external APIs easily.

#### State Machine Logic
```typescript
// GOOD: State transitions in service layer
export async function transitionEventStatus(
  eventId: string,
  newStatus: EventStatus
): Promise<void> {
  const event = await getEvent(eventId);
  
  // Validate transition
  if (!isValidTransition(event.status, newStatus)) {
    throw new Error(`Cannot transition from ${event.status} to ${newStatus}`);
  }
  
  // Perform transition
  await updateEvent(eventId, { status: newStatus });
  
  // Side effects based on status
  switch (newStatus) {
    case 'in_review':
      await createApprovalChain(eventId);
      break;
    case 'approved_scheduled':
      await notifyCreator(event.creator_id, 'approved');
      break;
    case 'completed_awaiting_report':
      await notifyCreator(event.creator_id, 'submit_report');
      break;
  }
  
  // Audit log
  await logStatusChange(eventId, event.status, newStatus);
}
```

**Why:** Complex logic with multiple side effects.

---

## Migration Example

### ❌ Before (Database Function)

```sql
-- BAD: Complex business logic in database
CREATE OR REPLACE FUNCTION get_subordinate_user_ids(target_user_id UUID)
RETURNS UUID[] AS $$
  WITH RECURSIVE subordinates AS (
    SELECT id, parent_id FROM users WHERE id = target_user_id AND is_active = true
    UNION
    SELECT u.id, u.parent_id
    FROM users u
    INNER JOIN subordinates s ON u.parent_id = s.id
    WHERE u.is_active = true
  )
  SELECT ARRAY_AGG(id) FROM subordinates;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Problems:**
- Hard to test different scenarios
- Can't add logging or metrics
- Difficult to handle edge cases
- No type safety

### ✅ After (Backend Service)

```typescript
// GOOD: Business logic in service layer
export async function getSubordinateUserIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  
  // Fetch all active users
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, parent_id, is_active')
    .eq('is_active', true);
  
  if (error) {
    logger.error('Failed to fetch users', { error, userId });
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  if (!allUsers) {
    return [userId];
  }
  
  // Build hierarchy in memory
  const collectSubordinates = (currentUserId: string, visited = new Set<string>()): string[] => {
    // Prevent infinite loops
    if (visited.has(currentUserId)) {
      logger.warn('Circular reference detected', { userId: currentUserId });
      return [];
    }
    visited.add(currentUserId);
    
    const subordinates = [currentUserId];
    const children = allUsers.filter(u => u.parent_id === currentUserId);
    
    for (const child of children) {
      subordinates.push(...collectSubordinates(child.id, visited));
    }
    
    return subordinates;
  };
  
  const result = collectSubordinates(userId);
  logger.info('Subordinates calculated', { userId, count: result.length });
  
  return result;
}
```

**Benefits:**
- Easy to test with mocked data
- Can add logging and metrics
- Type-safe with TypeScript
- Can handle edge cases gracefully
- Clear error messages

---

## Testing Comparison

### Database Function Testing (Hard)

```typescript
// Requires actual database connection
describe('get_subordinate_user_ids', () => {
  it('should return subordinates', async () => {
    // Must set up real database
    await setupTestDatabase();
    
    // Must insert test data
    const globalDirector = await insertUser({ role: 'global_director' });
    const cityCurator = await insertUser({ role: 'city_curator', parent_id: globalDirector.id });
    const planner = await insertUser({ role: 'event_planner', parent_id: cityCurator.id });
    
    // Call database function
    const { data } = await supabase.rpc('get_subordinate_user_ids', { 
      target_user_id: globalDirector.id 
    });
    
    expect(data).toContain(cityCurator.id);
    expect(data).toContain(planner.id);
  });
});
```

### Backend Service Testing (Easy)

```typescript
// Can mock database calls
describe('getSubordinateUserIds', () => {
  it('should return subordinates', async () => {
    // Mock the database call
    const mockUsers = [
      { id: 'director-1', parent_id: null, role: 'global_director' },
      { id: 'curator-1', parent_id: 'director-1', role: 'city_curator' },
      { id: 'planner-1', parent_id: 'curator-1', role: 'event_planner' }
    ];
    
    jest.spyOn(supabase.from('users'), 'select').mockResolvedValue({
      data: mockUsers,
      error: null
    });
    
    // Test the logic
    const result = await getSubordinateUserIds('director-1');
    
    expect(result).toContain('curator-1');
    expect(result).toContain('planner-1');
  });
  
  it('should handle circular references', async () => {
    // Easy to test edge cases
    const mockUsers = [
      { id: 'user-1', parent_id: 'user-2' },
      { id: 'user-2', parent_id: 'user-1' } // Circular!
    ];
    
    jest.spyOn(supabase.from('users'), 'select').mockResolvedValue({
      data: mockUsers,
      error: null
    });
    
    const result = await getSubordinateUserIds('user-1');
    
    expect(result).toHaveLength(1); // Only returns self, breaks loop
  });
});
```

---

## Best Practices

### ✅ DO

1. **Keep database functions simple**
   ```sql
   -- GOOD: Simple, single-purpose function
   CREATE FUNCTION is_future_date(d DATE) RETURNS BOOLEAN AS $$
     SELECT d > CURRENT_DATE;
   $$ LANGUAGE SQL IMMUTABLE;
   ```

2. **Use backend for business logic**
   ```typescript
   // GOOD: Complex logic in service
   export async function canUserApprove(userId: string, eventId: string): Promise<boolean> {
     const event = await getEvent(eventId);
     const approvers = await buildApprovalChain(event.creator_id);
     return approvers.includes(userId);
   }
   ```

3. **Document the decision**
   ```typescript
   /**
    * Calculate subordinate users.
    * 
    * NOTE: This was originally a database function but moved to backend
    * for better testability and maintainability.
    * 
    * @see db/migrations/001_initial_schema.sql - removed functions
    */
   ```

### ❌ DON'T

1. **Don't put complex logic in database**
   ```sql
   -- BAD: Too complex for database function
   CREATE FUNCTION process_approval_and_notify(...)
   RETURNS ...
   AS $$
   DECLARE
     -- 50 lines of business logic
   BEGIN
     -- validation, state transitions, external calls, etc.
   END;
   $$;
   ```

2. **Don't duplicate logic**
   ```typescript
   // BAD: Logic exists in both database and backend
   // - Hard to keep in sync
   // - Confusion about source of truth
   ```

3. **Don't mix concerns**
   ```sql
   -- BAD: Mixing data access with business rules
   CREATE FUNCTION get_and_validate_users(...)
   ```

---

## Summary

| Criteria | Database | Backend |
|----------|----------|---------|
| **Business Logic** | ❌ No | ✅ Yes |
| **Data Integrity** | ✅ Yes | ❌ No |
| **External APIs** | ❌ No | ✅ Yes |
| **Complex Workflows** | ❌ No | ✅ Yes |
| **Simple Transforms** | ✅ Yes | ⚠️ Maybe |
| **Testability** | ❌ Hard | ✅ Easy |
| **Maintainability** | ❌ Hard | ✅ Easy |
| **Type Safety** | ❌ No | ✅ Yes |

**Default Rule**: When in doubt, implement in backend services.

---

## Related Files

- **Backend Services**: `/lib/services/`
- **Database Functions**: `/db/functions/` (minimal, simple only)
- **Architecture Rules**: `.cursor/rules/backend-architecture/RULE.md`
- **Database Patterns**: `.cursor/rules/database-patterns/RULE.md`

---

**Last Updated**: 2026-01-08  
**Applies To**: All new development
