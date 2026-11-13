# Branch Change Script

## Overview

The `change-branch.js` script provides an automated, safe workflow for switching Git branches in the monorepo. It handles secret file encryption/decryption, dependency management, and ensures a clean working directory throughout the process.

## Purpose

When working with multiple branches that may have different dependencies and encrypted secret files, manually switching branches can be error-prone. This script automates the entire workflow to ensure:

- Secret files are properly encrypted before switching
- Changes to secret files are committed and pushed
- The working directory is clean before switching
- Dependencies are updated after switching to match the target branch
- Secret files are properly decrypted after switching

## Usage

### Interactive Mode

Run the script without arguments to see an interactive branch selector:

```bash
node scripts/change-branch.js
```

The interactive selector will:

- Fetch the latest remote branches
- Display all available branches (local and remote)
- Highlight the current branch
- Allow you to select a branch using arrow keys

### Direct Branch Selection

Specify a branch name directly:

```bash
node scripts/change-branch.js <branch-name>
```

### Command-Line Options

- `--force` or `-f` - Force encryption/decryption operations (passed to git-secrets.js)

Examples:

```bash
# Switch to develop branch
node scripts/change-branch.js develop

# Switch to feature branch with force flag
node scripts/change-branch.js feature/new-api --force

# Interactive selection with force flag
node scripts/change-branch.js --force
```

## Workflow Steps

The script executes the following steps in sequence:

### 1. Pre-Flight Checks

- **Check for uncommitted changes**: Ensures the working directory is clean
- **Validate branch existence**: Verifies the target branch exists locally or remotely
- **Display branch type**: Shows whether the branch is local, remote, or both

### 2. Secret File Handling

- **Encrypt secrets**: Runs `git-secrets.js hide` to encrypt all `.secret` files
- **Commit changes**: If `.secret` files were modified during encryption, commits them with message:
  ```
  chore: update encrypted secrets before branch switch
  ```
- **Push to remote**: Automatically pushes the secret file changes to ensure they're backed up

### 3. Working Directory Cleanup

- **Clean ignored files**: Runs `git clean -fdX` to remove all files matching `.gitignore` patterns
  - This includes `node_modules`, build artifacts, and other ignored files
  - Ensures a fresh start on the new branch without conflicts
- **Validate clean state**: Confirms no uncommitted files remain after cleanup

### 4. Branch Switch

- **Checkout local branch**: If the branch exists locally, checks it out directly
- **Create tracking branch**: If the branch only exists remotely, creates a local tracking branch:
  ```bash
  git checkout -b <branch-name> origin/<branch-name>
  ```

### 5. Post-Switch Setup

- **Decrypt secrets**: Runs `git-secrets.js reveal` to decrypt `.secret` files for the new branch
- **Install dependencies**: Runs `pnpm install` to update dependencies to match the new branch's `package.json` files

## Error Handling

The script includes comprehensive error handling:

### Uncommitted Changes

If uncommitted changes are detected at the start:

```
Please commit or stash your changes before switching branches.
```

### Branch Not Found

If the specified branch doesn't exist:

```
Branch '<branch-name>' does not exist locally or remotely.
```

### Uncommitted Files After Cleanup

If files remain uncommitted after the cleanup step:

```
Uncommitted files detected after cleanup. Please review and commit or stash them.
```

### Operation Failures

Any failure during the workflow will:

- Stop the spinner with "Operation failed" message
- Display the specific error message
- Exit with code 1

## User Interface

The script uses [@clack/prompts](https://www.npmjs.com/package/@clack/prompts) for a professional CLI experience:

- **Intro message**: "Branch Change Script"
- **Spinner**: Shows progress for each operation with descriptive messages
- **Success outro**: Displays final confirmation with branch name
- **Interactive select**: Provides a searchable, keyboard-navigable branch list

### Spinner Messages

During execution, the spinner displays these messages:

1. "Checking working directory"
2. "Validating branch"
3. "Checking for secret file changes"
4. "Encrypting secret files" (from git-secrets.js)
5. "Committing encrypted secret files" (if needed)
6. "Pushing changes to remote" (if needed)
7. "Cleaning ignored files"
8. "Validating clean state"
9. "Switching to branch: \<branch-name\>"
10. "Decrypting secret files" (from git-secrets.js)
11. "Installing dependencies"

## Branch List Format

The interactive branch selector displays branches with:

- **Label**: Branch name with "(current)" marker if applicable
- **Hint**: Shows "local", "remote", or "local + remote"
- **Sorting**: Current branch first, then local branches, then remote branches, all alphabetically sorted

Example display:

```
● master (current) [local]
  develop [local + remote]
  feature/auth [local]
  feature/api-v2 [remote]
```

## Integration with Other Scripts

This script depends on and integrates with:

### git-secrets.js

Located at `scripts/git-secrets.js`, this script handles encryption/decryption of `.secret` files:

- Called with `hide` mode before branch switch
- Called with `reveal` mode after branch switch
- Receives `--force` flag if provided to the branch change script

## Dependencies

The script requires the following npm packages:

- `@clack/prompts` - Interactive CLI prompts and UI components
- Node.js built-in modules: `child_process`, `path`, `url`

## Best Practices

### When to Use

Use this script instead of manual `git checkout` when:

- Your branch has encrypted `.secret` files
- Different branches have different dependencies
- You want to ensure a clean working directory
- You're switching between branches with significant differences

### Before Running

1. Ensure all your work is committed or stashed
2. Make sure you have network connectivity (for git fetch and push)
3. Verify you have the necessary permissions to push to the remote repository

### After Running

The script automatically:

- Updates all dependencies via `pnpm install`
- Decrypts secret files for the new branch
- Leaves you with a clean, ready-to-use working directory

## Troubleshooting

### "Command failed with code X"

If you encounter command failures:

1. Check that git is properly configured
2. Verify you have network access for remote operations
3. Ensure the git-secrets.js script exists and is executable
4. Check that pnpm is installed and available in your PATH

### Secrets Not Decrypting

If secrets fail to decrypt after switching:

1. Verify the `.secret` files exist in the new branch
2. Check that git-secrets.js has the correct encryption keys
3. Try running `node scripts/git-secrets.js reveal --force` manually

### Dependencies Not Installing

If `pnpm install` fails:

1. Check that pnpm is installed: `pnpm --version`
2. Verify the package.json files in the new branch are valid
3. Clear the pnpm cache: `pnpm store prune`
4. Try running `pnpm install` manually to see detailed error messages

## Technical Implementation

### Command Execution

The script uses two execution modes:

**execCommand**: Captures stdout/stderr for parsing

```javascript
const execCommand = ( command, args = [], options = {} ) => {
	return new Promise( ( resolve, reject ) => {
		const proc = spawn( command, args, {
			...options,
			stdio: [ 'inherit', 'pipe', 'pipe' ],
		} );
		// Collects and returns stdout
	} );
};
```

**execCommandInteractive**: Inherits stdio for user interaction

```javascript
const execCommandInteractive = ( command, args = [], options = {} ) => {
	return new Promise( ( resolve, reject ) => {
		const proc = spawn( command, args, {
			...options,
			stdio: 'inherit',
		} );
		// User sees real-time output
	} );
};
```

### Branch Detection

The script fetches and parses all branches:

- Runs `git fetch` to update remote branch information
- Executes `git branch -a` to list all local and remote branches
- Filters out `HEAD` references
- Deduplicates branches that exist both locally and remotely
- Sorts with current branch first, then local, then remote

### Safety Checks

Multiple safety checks prevent data loss:

1. **Pre-switch uncommitted changes check**: Prevents losing unstaged work
2. **Branch existence validation**: Ensures target branch exists before proceeding
3. **Post-cleanup validation**: Confirms no unexpected files remain
4. **Secret file change detection**: Ensures encrypted secrets are backed up

## Related Documentation

- [Git Secrets Script](./git-secrets.md) - Secret file encryption/decryption
- [Development Workflow](../index.md#development-patterns) - General development patterns
