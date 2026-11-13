# Scripts Overview

This section documents the automation and development scripts available in the monorepo. These scripts streamline common development workflows and ensure consistency across the team.

## Available Scripts

### Development Automation

- **[Branch Change](./change-branch.md)** - Automated branch switching workflow
  - Handles secret file encryption/decryption
  - Manages dependency updates across branches
  - Ensures clean working directory state
  - Interactive branch selection

- **[Git Secrets](./git-secrets.md)** - Secure secret file management
  - AES-256-GCM encryption for sensitive files
  - Password-based encryption/decryption
  - Supports multiple environment configurations
  - Integrates with version control workflow

## Usage

All scripts are located in the `scripts/` directory at the repository root:

```bash
# Branch switching with secret handling
node scripts/change-branch.js [branch-name] [--force]

# Encrypt secrets before committing
node scripts/git-secrets.js hide [--force]

# Decrypt secrets after pulling/switching
node scripts/git-secrets.js reveal [--force]
```

## Script Integration

The scripts are designed to work together:

1. **change-branch.js** automatically calls **git-secrets.js** during branch switches
2. Secrets are encrypted before leaving a branch
3. Dependencies are cleaned and reinstalled after switching
4. Secrets are decrypted for the new branch

This integrated workflow ensures:

- No secret leakage between branches
- Clean dependency state
- Consistent development environment
- Safe version control of sensitive files

## Requirements

- Node.js (ESM modules)
- Git repository
- pnpm package manager (for dependency management)
- Environment variable `LIWE3_GIT_SECRET` (or interactive password input)

## Best Practices

1. **Use change-branch.js instead of manual git checkout** - Ensures proper secret handling
2. **Never commit plain secret files** - Always encrypt before committing
3. **Store LIWE3_GIT_SECRET securely** - Use environment variable or password manager
4. **Share encryption password securely with team** - Use secure channels, never commit it

## Customization

Scripts can be customized by editing:

- **Target files**: `scripts/git-secrets.js` - Line 19 (`TARGET_FILES` array)
- **Excluded directories**: `scripts/git-secrets.js` - Line 29 (`EXCLUDED_DIRS` array)
- **Encryption algorithm**: `scripts/git-secrets.js` - Line 31 (`ALGORITHM` constant)

Refer to individual script documentation for detailed customization options.
