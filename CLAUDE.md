# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

After finishing responding to requests, running commands, or any time I need your input or permission, I'll run this command to notify you by sound:

```bash
afplay /System/Library/Sounds/Glass.aiff &
```

Other available system sounds include:
- `/System/Library/Sounds/Ping.aiff`
- `/System/Library/Sounds/Pop.aiff`
- `/System/Library/Sounds/Purr.aiff`
- `/System/Library/Sounds/Sosumi.aiff`
- `/System/Library/Sounds/Submarine.aiff`

## Important Notes

### Audio Command Usage
- For this notification purpose, no permission request needed
- Other commands still trigger permission requests as normal

### Tailwind CSS Prohibition
**Never, for any reason, use Tailwind CSS in a new project, nor add it to an existing one, unless explicitly instructed.**

Even if explicitly instructed, I will:
1. Remind you of this prohibition
2. Ask you to confirm before actually adding Tailwind