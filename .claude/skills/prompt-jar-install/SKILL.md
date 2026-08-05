---
name: prompt-jar-install
description: Install or refresh prompt-jar (github.com/adamlewison/prompt-jar), a personal collection of reusable Claude Code slash commands. Use this whenever the user asks to install, set up, update, refresh, or sync prompt-jar, or says something like "install my prompts" / "get prompt-jar" / "pull the latest prompt-jar commands." Not for creating brand-new custom skills or commands from scratch — this only pulls down the existing prompt-jar repo.
---

# prompt-jar install

prompt-jar is a repo of reusable prompts (`prompts/*.md`) that its install
script turns into global Claude Code slash commands — available in every
project, not just this one.

## What running this does

1. Clones `https://github.com/adamlewison/prompt-jar.git` to `~/.prompt-jar`
   (or does a fast-forward `git pull` if it's already cloned there).
2. Symlinks every `prompts/*.md` file (except `TEMPLATE.md`) into
   `~/.claude/commands/`, so each becomes a `/<prompt-name>` command.
3. Skips (and reports) any name that's already taken by a real file rather
   than a symlink, so it never clobbers a command the user wrote by hand.

This only touches the user's home directory (`~/.prompt-jar`,
`~/.claude/commands`) — it does not modify this project's repo.

## How to run it

Run the installer directly; don't hand-roll the clone/symlink steps
yourself, since the script already handles updates and name collisions:

```bash
curl -fsSL https://raw.githubusercontent.com/adamlewison/prompt-jar/main/install.sh | bash
```

## After running

Report back to the user:
- Which commands were newly installed (printed under "Available in any
  Claude Code session").
- Any commands that were skipped because a non-symlink file already exists
  at that name.
- That they need to start a new Claude Code session for the commands to
  show up (the current session's command list is already loaded and won't
  pick up new symlinks).
