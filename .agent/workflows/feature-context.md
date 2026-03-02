---
description: Load full project context and keep FEATURES.md updated
---

# Feature Context Workflow

## At the Start of Every Conversation

1. **Read `c:\mypro\FEATURES.md`** to understand all existing features before doing any work.
2. This file contains the complete feature registry of the AI Hiring Platform, organized by module.

## After Making Changes

3. After implementing, modifying, or removing any feature, **update `c:\mypro\FEATURES.md`** to reflect the change.
4. Update the `Last Updated` date at the top of the file.
5. If a new feature was added, add it under the appropriate section with `[x]` checkbox.
6. If a feature was removed, remove its entry.
7. If a feature was modified, update its description.

## How Automatic Updates Work

**Antigravity (the AI Assistant) handles this automatically.** 
- When you run this workflow using `/feature-context`, I read these instructions.
- I am then committed to following the "After Making Changes" section for the rest of the conversation.
- Every time I use `write_to_file` or `replace_file_content` to change a feature, I will automatically perform an additional step to update `FEATURES.md`.

## Manual / Force Update

If you want me to do a fresh scan of the codebase and update `FEATURES.md` right now:
1. Type: **"Please perform a full sync of FEATURES.md"**
2. I will then list the directories, scan the code, and ensure every checkmark is correct.

## Rules
- Never skip reading FEATURES.md at the start of a conversation involving code changes.
- Keep all entries in checkbox format `[x]` for implemented features.
- Maintain the section groupings (Authentication, Onboarding, Interview, etc.).
- Include file paths for new features added.
