# How to Use Cursor Rules - Quick Start Guide

## 🎯 What Are These Rules?

These rules are **instructions for Cursor AI** that automatically guide code generation, suggestions, and refactoring to match your project's architecture and best practices.

## ✨ Automatic Application

All rules in this project are set to **`alwaysApply: true`**, which means:

- ✅ They're **automatically included** in every Cursor Chat and Agent session
- ✅ No need to manually @-mention them
- ✅ AI will follow these patterns by default
- ✅ Consistent code generation across the entire project

## 💬 Using Cursor Chat with Rules

### Example 1: Creating a New Feature

**You ask:**
```
Create a venue management system with CRUD operations
```

**Cursor AI will automatically:**
- ✅ Create DAL in `/lib/data-access/venues.dal.ts`
- ✅ Create Service in `/lib/services/venues/venue.service.ts`
- ✅ Create Server Actions in `/lib/actions/venues.ts`
- ✅ Create Zod schema in `/lib/validation/venues.schema.ts`
- ✅ Use `ActionResponse<T>` format
- ✅ Add permission checks
- ✅ Include audit logging
- ✅ Follow naming conventions

### Example 2: Creating a Form Component

**You ask:**
```
Create a form to create new events with title, description, date, and venue
```

**Cursor AI will automatically:**
- ✅ Use "use client" directive
- ✅ Use react-hook-form with Zod resolver
- ✅ Use shadcn/ui form components
- ✅ Call Server Action for submission
- ✅ Show toast notifications
- ✅ Handle loading states
- ✅ Display validation errors

### Example 3: Adding Authorization

**You ask:**
```
Add permission check to ensure only event creators can edit events
```

**Cursor AI will automatically:**
- ✅ Use `requireCanEditEvent()` guard
- ✅ Place check in Service Layer
- ✅ Throw `PermissionError` if unauthorized
- ✅ Log the action in audit trail
- ✅ Return user-friendly error message

## 🔍 Referencing Specific Rules

While rules apply automatically, you can explicitly reference them:

```
@backend-architecture Create a new approval service
```

```
@validation-patterns Create validation schema for event reports
```

```
@permissions-authorization How do I check if a user can approve an event?
```

## 🎨 Common Use Cases

### 1. Creating a New Database Table

**Ask:**
```
Create a database table for event templates with name, user_id, and template_data
```

**AI will follow:**
- `database-patterns` rule for schema conventions
- Add `id`, `created_at`, `updated_at` columns automatically
- Create appropriate indexes
- Add RLS policies for pyramid visibility

### 2. Building a Server Action

**Ask:**
```
Create a server action to submit an event for approval
```

**AI will follow:**
- `backend-architecture` for 3-layer pattern
- `validation-patterns` for input validation
- `error-handling` for try-catch and error responses
- `permissions-authorization` for permission checks

### 3. Creating UI Components

**Ask:**
```
Create a card component to display event details with title, date, venue, and status badge
```

**AI will follow:**
- `ui-styling-patterns` for shadcn/ui components
- `frontend-patterns` for Server vs Client Component decision
- Use Tailwind CSS classes
- Include proper spacing and typography

### 4. Adding Permission Checks

**Ask:**
```
Add permission check to ensure only Global Director can ban venues
```

**AI will follow:**
- `permissions-authorization` for `requireGlobalDirector()` guard
- Place check at start of Service function
- Log action in audit trail

## 📝 Best Practices for Prompts

### ✅ Good Prompts

**Specific and clear:**
```
Create a server action to approve an event with comment validation
```

**Mentions the layer:**
```
Add a service function to check if user can request cancellation
```

**References existing patterns:**
```
Create a form component like EventForm but for venues
```

### ❌ Avoid Vague Prompts

```
Make it work
```

```
Fix the bug
```

```
Add some validation
```

## 🔧 Customizing Rules

### Temporarily Override a Rule

If you need to deviate from a rule for a specific case:

```
Create a public API endpoint for event export (ignore the Server Actions preference)
```

### Request Rule Clarification

```
@backend-architecture What's the difference between DAL and Service layer?
```

### Suggest Rule Improvements

If you find a pattern that should be added:

```
Should we add a rule for handling file uploads? I see we're doing it differently in multiple places.
```

## 🎓 Learning from Rules

### View Rule Content

You can read the rules directly:
- Open `.cursor/rules/[rule-name]/RULE.md`
- Each rule contains examples and anti-patterns

### Ask for Examples

```
@validation-patterns Show me an example of conditional validation with refine
```

```
@frontend-patterns How do I use TanStack Query for optimistic updates?
```

## 🚀 Advanced Usage

### Multi-Step Features

For complex features, break down your request:

```
I want to add event modification workflow:
1. First, create the database schema for event_versions
2. Then, create the service layer for requesting modifications
3. Finally, create the UI components for the modification form
```

### Refactoring with Rules

```
Refactor this component to follow our frontend-patterns rule (it's currently mixing Server and Client Component logic)
```

### Code Review with Rules

```
Review this Server Action and ensure it follows our backend-architecture and error-handling rules
```

## 📊 Rule Priority

When rules might conflict, they follow this priority:

1. **Explicit user instruction** (your direct request)
2. **Project-specific rules** (these `.cursor/rules`)
3. **General best practices** (Cursor's built-in knowledge)

## 🐛 Troubleshooting

### AI Not Following Rules?

1. **Check rule is in `.cursor/rules/` folder**
2. **Verify `alwaysApply: true` in frontmatter**
3. **Restart Cursor** to reload rules
4. **Be explicit in your prompt**: "Follow the backend-architecture rule"

### Rules Too Strict?

You can temporarily override:
```
Create this component without following the frontend-patterns rule (I need to use useEffect here)
```

### Need More Context?

Reference multiple rules:
```
@backend-architecture @validation-patterns @error-handling 
Create a complete server action for event approval
```

## 📚 Next Steps

1. **Read the README.md** in this folder for rule overview
2. **Browse individual RULE.md files** to understand patterns
3. **Try creating a simple feature** and see rules in action
4. **Experiment with prompts** to see how AI applies rules
5. **Provide feedback** if rules need adjustment

## 💡 Pro Tips

- **Rules save time**: No need to explain architecture every time
- **Consistency**: All team members get same code patterns
- **Learning tool**: Rules document best practices
- **Living document**: Update rules as patterns evolve
- **Version control**: Rules are committed with code

---

**Remember:** These rules are here to help, not restrict. If you need to deviate for a good reason, just be explicit in your prompt!

**Questions?** Ask Cursor AI: "Explain how the [rule-name] rule works"

