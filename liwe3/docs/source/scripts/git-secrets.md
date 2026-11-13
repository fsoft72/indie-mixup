# Git Secrets Script

## Overview

The `git-secrets.js` script provides secure encryption and decryption of sensitive configuration files in the monorepo. It uses military-grade AES-256-GCM encryption to protect environment variables, API keys, and other secrets that need to be version controlled but kept confidential.

## Purpose

Managing secrets across multiple branches and environments is challenging. This script solves several problems:

- **Secure version control**: Encrypt sensitive files before committing to Git
- **Team collaboration**: Share encrypted secrets safely with team members
- **Branch switching**: Automatically encrypt/decrypt secrets when changing branches
- **Multi-environment support**: Manage different secrets for development, staging, and production

## Security

### Encryption Algorithm

The script uses **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode):

- **Key size**: 256 bits (32 bytes)
- **Authentication**: Built-in authenticated encryption with AEAD (Authenticated Encryption with Associated Data)
- **IV (Initialization Vector)**: 16 bytes, randomly generated for each encryption
- **Salt**: 32 bytes, randomly generated for each encryption
- **Auth Tag**: 16 bytes, ensures data integrity and authenticity

### Key Derivation

Password-based encryption using **scrypt**:

- Derives a 256-bit key from the password
- Uses a randomly generated 32-byte salt
- Resistant to brute-force and rainbow table attacks
- Memory-hard algorithm prevents GPU acceleration attacks

### Security Features

- **Unique encryption per file**: Each file gets its own random IV and salt
- **Authentication**: GCM mode prevents tampering and ensures integrity
- **No password storage**: Password must be provided via environment variable or prompt
- **Secure password input**: Terminal input is hidden when prompting for password

## Usage

### Basic Syntax

```bash
node scripts/git-secrets.js <mode> [options]
```

**Modes:**

- `hide` - Encrypt target files and create `.secret` files
- `reveal` - Decrypt `.secret` files back to original files

**Options:**

- `--force` or `-f` - Skip overwrite confirmation when revealing files

### Hide Mode (Encrypt)

Encrypt all target files in the repository:

```bash
# Using environment variable
LIWE3_GIT_SECRET="your-password" node scripts/git-secrets.js hide

# Interactive password prompt
node scripts/git-secrets.js hide
```

**What it does:**

1. Searches the entire repository for target files (excluding node_modules, .git, etc.)
2. Encrypts each found file using AES-256-GCM
3. Creates a `.secret` file for each encrypted file
4. Displays progress and results

**Example output:**

```
Mode: hide
Searching in: /home/user/project

Found 3 file(s) to encrypt:

✓ Encrypted: apps/worker/.dev.vars → apps/worker/.dev.vars.secret
✓ Encrypted: apps/worker/.env.local → apps/worker/.env.local.secret
✓ Encrypted: .env.staging → .env.staging.secret

Encrypted 3 of 3 file(s).
```

### Reveal Mode (Decrypt)

Decrypt all `.secret` files in the repository:

```bash
# Using environment variable
LIWE3_GIT_SECRET="your-password" node scripts/git-secrets.js reveal

# Interactive password prompt
node scripts/git-secrets.js reveal

# Force overwrite without confirmation
LIWE3_GIT_SECRET="your-password" node scripts/git-secrets.js reveal --force
```

**What it does:**

1. Searches the entire repository for `.secret` files
2. Checks if original files already exist
3. Prompts for overwrite confirmation (unless `--force` is used)
4. Decrypts each `.secret` file to its original filename
5. Displays progress and results

**Example output:**

```
Mode: reveal
Searching in: /home/user/project

Found 3 .secret file(s) to decrypt:

✓ Decrypted: apps/worker/.dev.vars.secret → apps/worker/.dev.vars
File apps/worker/.env.local already exists. Overwrite? (y/N): y
✓ Decrypted: apps/worker/.env.local.secret → apps/worker/.env.local
✓ Decrypted: .env.staging.secret → .env.staging

Decrypted 3 of 3 file(s).
```

## Target Files

The script automatically processes the following files:

```javascript
.env.local          // Local development environment
.env.staging        // Staging environment
.env.prod          // Production environment
.dev.vars          // Cloudflare Workers dev variables
.dev.vars.prod     // Cloudflare Workers production variables
.dev.vars.state    // Cloudflare Workers state variables
```

These files are defined in the `TARGET_FILES` constant in `scripts/git-secrets.js:19`.

### Excluded Directories

The script skips these directories during file search:

- `node_modules` - NPM dependencies
- `.svelte-kit` - SvelteKit build artifacts
- `.git` - Git repository data
- `dist` - Build output
- `build` - Build output

## Password Management

### Environment Variable (Recommended)

Set the `LIWE3_GIT_SECRET` environment variable:

```bash
# Linux/macOS - session-specific
export LIWE3_GIT_SECRET="your-secure-password"

# Linux/macOS - add to ~/.bashrc or ~/.zshrc for persistence
echo 'export LIWE3_GIT_SECRET="your-secure-password"' >> ~/.bashrc

# Windows PowerShell - session-specific
$env:LIWE3_GIT_SECRET="your-secure-password"

# Windows PowerShell - persistent user variable
[System.Environment]::SetEnvironmentVariable('LIWE3_GIT_SECRET','your-secure-password','User')
```

### Interactive Prompt

If the environment variable is not set, the script will prompt for a password:

```
Enter LIWE3_GIT_SECRET: ********
```

The input is hidden for security (displays asterisks instead of actual characters).

### Password Requirements

- **Strength**: Use a strong, unique password (minimum 16 characters recommended)
- **Sharing**: Share the password securely with team members (use a password manager)
- **Consistency**: All team members must use the same password to decrypt files
- **Storage**: Never commit the password to Git or store it in unencrypted files

## File Structure

### Encrypted File Format

`.secret` files are binary files with the following structure:

```
[Salt (32 bytes)][IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Content]
```

- **Salt**: Random 32-byte value for key derivation
- **IV**: Random 16-byte initialization vector
- **Auth Tag**: 16-byte authentication tag from GCM mode
- **Encrypted Content**: The actual encrypted file content

### Workflow Example

**Original file (`.env.local`):**

```
DATABASE_URL=mysql://localhost/dev
API_KEY=secret-key-12345
```

**After encryption (`.env.local.secret`):**

```
[Binary encrypted data - not human readable]
```

**Git workflow:**

1. Work with plain `.env.local` file (in `.gitignore`)
2. Run `git-secrets.js hide` to create `.env.local.secret`
3. Commit and push `.env.local.secret` to Git
4. Other developers pull and run `git-secrets.js reveal` to decrypt

## Integration with Other Scripts

### Branch Change Script

The `change-branch.js` script automatically calls `git-secrets.js`:

**Before branch switch:**

```javascript
await runGitSecrets( 'hide', force );
```

**After branch switch:**

```javascript
await runGitSecrets( 'reveal', force );
```

This ensures secrets are properly encrypted before leaving a branch and decrypted after switching to a new branch.

## Error Handling

### Encryption Errors

If encryption fails for a file:

```
✗ Failed to encrypt /path/to/file: Error message
```

**Common causes:**

- File is read-only or locked
- Insufficient disk space
- File doesn't exist or was deleted
- Permission issues

### Decryption Errors

If decryption fails for a file:

```
✗ Failed to decrypt /path/to/file.secret: Error message
```

**Common causes:**

- **Wrong password**: Most common - verification will fail with "Unsupported state or unable to authenticate data"
- **Corrupted file**: The `.secret` file was modified or corrupted
- **Insufficient permissions**: Can't write to the target directory
- **Wrong encryption version**: File was encrypted with a different algorithm

### File Conflicts

When revealing and the original file exists:

```
File /path/to/file already exists. Overwrite? (y/N):
```

- Press `y` to overwrite with decrypted content
- Press `n` to skip decryption and keep existing file
- Use `--force` flag to skip all prompts and overwrite automatically

## Best Practices

### Development Workflow

1. **Initial setup:**
   ```bash
   # Decrypt all secrets after cloning
   node scripts/git-secrets.js reveal
   ```

2. **Modifying secrets:**
   ```bash
   # Edit the plain file
   nano .env.local

   # Encrypt before committing
   node scripts/git-secrets.js hide
   git add *.secret
   git commit -m "Update environment variables"
   ```

3. **Branch switching:**
   ```bash
   # Use the automated script instead of manual git checkout
   node scripts/change-branch.js develop
   ```

### Security Best Practices

- **Never commit plain files**: Always add target files to `.gitignore`
- **Rotate passwords periodically**: Re-encrypt all files with a new password
- **Use strong passwords**: Minimum 16 characters, mixed case, numbers, symbols
- **Secure password sharing**: Use a password manager or secure vault
- **Audit access**: Track who has access to the encryption password
- **Backup `.secret` files**: Ensure encrypted files are properly backed up in Git

### Git Configuration

Add target files to `.gitignore`:

```gitignore
# Environment files (plain text - never commit)
.env.local
.env.staging
.env.prod
.dev.vars
.dev.vars.prod
.dev.vars.state

# Encrypted files (commit these)
!*.secret
```

This ensures:

- Plain files are never accidentally committed
- Encrypted `.secret` files are tracked in Git

## Troubleshooting

### "Unsupported state or unable to authenticate data"

**Cause**: Wrong password or corrupted file

**Solution:**

1. Verify you're using the correct password
2. Ask team members for the correct password
3. If file is corrupted, restore from Git history:
   ```bash
   git checkout HEAD -- path/to/file.secret
   ```

### "No files found to encrypt"

**Cause**: Target files don't exist in the repository

**Solution:**

1. Verify target files exist in the expected locations
2. Check file names match exactly (case-sensitive)
3. Ensure files aren't in excluded directories
4. Create the files if they should exist:
   ```bash
   touch .env.local
   ```

### "No .secret files found to decrypt"

**Cause**: No encrypted files in the repository

**Solution:**

1. Pull latest changes from Git:
   ```bash
   git pull
   ```
2. Check if `.secret` files are in `.gitignore` (they shouldn't be)
3. Ask team members if secrets have been encrypted yet

### Permission Errors

**Cause**: Insufficient file system permissions

**Solution:**

```bash
# Make script executable
chmod +x scripts/git-secrets.js

# Fix file permissions
chmod 644 .env.local
chmod 644 .env.local.secret
```

### Password Prompt Not Working

**Cause**: Terminal input issues in certain environments

**Solution:**
Use environment variable instead:

```bash
export LIWE3_GIT_SECRET="your-password"
node scripts/git-secrets.js reveal
```

## Technical Implementation

### Encryption Process

```javascript
// 1. Generate random salt and IV
const salt = randomBytes( 32 );
const iv = randomBytes( 16 );

// 2. Derive encryption key from password
const key = scryptSync( password, salt, 32 );

// 3. Create cipher with AES-256-GCM
const cipher = createCipheriv( 'aes-256-gcm', key, iv );

// 4. Encrypt content
let encrypted = cipher.update( content, 'utf8', 'hex' );
encrypted += cipher.final( 'hex' );

// 5. Get authentication tag
const tag = cipher.getAuthTag();

// 6. Combine: [salt][iv][tag][encrypted]
const result = Buffer.concat( [ salt, iv, tag, Buffer.from( encrypted, 'hex' ) ] );
```

### Decryption Process

```javascript
// 1. Extract components from encrypted file
const salt = data.subarray( 0, 32 );
const iv = data.subarray( 32, 48 );
const tag = data.subarray( 48, 64 );
const encrypted = data.subarray( 64 );

// 2. Derive same key from password and salt
const key = scryptSync( password, salt, 32 );

// 3. Create decipher
const decipher = createDecipheriv( 'aes-256-gcm', key, iv );
decipher.setAuthTag( tag );

// 4. Decrypt and verify authentication
let decrypted = decipher.update( encrypted, 'binary', 'utf8' );
decrypted += decipher.final( 'utf8' );
```

### File Search Algorithm

The script recursively searches the repository:

1. Start from repository root
2. Read directory entries
3. Skip excluded directories (`node_modules`, `.git`, etc.)
4. Check files against target list
5. Recursively process subdirectories
6. Return all matching file paths

**Performance considerations:**

- Excludes large directories to improve speed
- Handles permission errors gracefully
- Continues searching even if some directories are inaccessible

## Related Documentation

- [Branch Change Script](./change-branch.md) - Automated branch switching with secret handling
- [Development Workflow](../index.md#development-patterns) - General development patterns

## Security Considerations

### Threat Model

**Protected against:**

- ✓ Unauthorized access to Git repository
- ✓ Accidental secret exposure in commits
- ✓ Man-in-the-middle attacks (files are encrypted at rest)
- ✓ Tampering (GCM authentication tag)
- ✓ Brute force attacks (scrypt key derivation)

**Not protected against:**

- ✗ Compromised password
- ✗ Malware on developer machine
- ✗ Physical access to unlocked machine with decrypted files
- ✗ Social engineering to obtain password

### Password Security

**Do:**

- Use a unique, strong password (16+ characters)
- Store password in a secure password manager
- Rotate password if team member leaves
- Use environment variable for automation

**Don't:**

- Share password via email or chat
- Write password down in plain text
- Use the same password as other systems
- Commit password to Git (even in comments)

### File Hygiene

After decryption, plain text secret files exist on disk. Remember to:

1. **Never commit plain files** - Always check before `git add .`
2. **Clear terminal history** - If password was entered in command line
3. **Lock your machine** - When stepping away from your desk
4. **Use full disk encryption** - Protect files at rest on your machine

## Advanced Usage

### Encrypting Custom Files

To encrypt additional file types, edit `scripts/git-secrets.js:19`:

```javascript
const TARGET_FILES = [
	'.env.local',
	'.env.staging',
	'.env.prod',
	'.dev.vars',
	'.dev.vars.prod',
	'.dev.vars.state',
	// Add your custom files
	'config/secrets.json',
	'credentials.yaml',
];
```

### Batch Operations

Process multiple repositories:

```bash
#!/bin/bash
for repo in project1 project2 project3; do
  cd $repo
  LIWE3_GIT_SECRET="$PASSWORD" node scripts/git-secrets.js hide
  cd ..
done
```

### CI/CD Integration

Use in GitHub Actions or other CI/CD:

```yaml
- name: Decrypt secrets
  env:
      LIWE3_GIT_SECRET: ${{ secrets.GIT_SECRET_PASSWORD }}
  run: node scripts/git-secrets.js reveal --force
```

**Note**: Ensure the password is stored as a secret in your CI/CD platform, never hardcoded in workflow files.
