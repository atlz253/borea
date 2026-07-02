---
name: create-skill
description: Creates new skills for the Nirvana project based on user requirements
---

# Create Skill

This skill helps generate new skills for the Nirvana project. It can be used in two modes:
1. Interactive mode - prompts for the skill name and description
2. CLI arguments mode - accepts parameters via command line arguments

## What it does

1. Creates a new skill directory with proper structure
2. Generates the SKILL.md file with frontmatter
3. Creates a basic implementation file (checker.js or similar)
4. Sets up documentation

## Usage

Always start by asking the user for:
1. **Skill name** — short identifier (e.g., "lint-check", "test-runner")
2. **Description** — what the skill does
3. **Purpose** — main problem it solves or goal it achieves

Once you have these three pieces of information, proceed to implement the skill entirely by yourself.

Do not use CLI arguments mode — always prompt the user interactively for the required parameters.

## Arguments (provided by user)

- **Name**: short identifier for the skill (e.g., "lint-check", "test-runner")
- **Description**: brief description of functionality
- **Purpose**: main purpose of the skill (what problem it solves)

## Examples

**User provides:**
- Name: `code-quality-checker`
- Description: `Checks code quality against standards`
- Purpose: `Enforces coding standards and identifies potential issues`

The model then implements the entire skill by itself using these parameters.