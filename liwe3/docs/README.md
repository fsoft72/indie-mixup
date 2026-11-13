# LiWE3 Documentation

This directory contains the documentation for the LiWE3 Cloudflare Workers monorepo, built with [MkDocs](https://www.mkdocs.org/) and the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

Optional:

- Node.js and pnpm (for using pnpm scripts)

## Installation

### Using Python virtual environment (recommended)

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Using pnpm (optional)

```bash
# Install pnpm dependencies for convenience scripts
pnpm install
```

## Running the Documentation

### Development Server

Start the development server with live reload:

```bash
# Using MkDocs directly
mkdocs serve

# Or using pnpm
pnpm docs:serve
```

The documentation will be available at `http://127.0.0.1:8000`

### Building the Documentation

Build the static site:

```bash
# Using MkDocs directly
mkdocs build

# Or using pnpm
pnpm docs:build
```

The built site will be in the `website/` directory.

## Documentation Structure

```
docs/
├── mkdocs.yml              # MkDocs configuration
├── requirements.txt        # Python dependencies
├── package.json            # pnpm scripts
├── README.md               # This file
├── .gitignore              # Git ignore rules
├── source/                 # Documentation source files
│   ├── index.md           # Homepage
│   ├── backend/           # Backend documentation
│   │   ├── liwe3/        # Core library docs
│   │   ├── modules/      # Module-specific docs
│   │   └── best-practices/ # Best practices and guides
│   ├── stylesheets/      # Custom CSS
│   ├── javascripts/      # Custom JavaScript
│   └── includes/         # Reusable content (abbreviations, etc.)
└── website/               # Build output (gitignored)
```

## Adding New Documentation

1. Create a new Markdown file in the appropriate directory under `source/`
2. Add the file to the `nav` section in `mkdocs.yml`
3. Use the development server to preview your changes
4. Commit your changes

## Features

The documentation includes:

- **Material Theme**: Modern, responsive design
- **Dark Mode**: Automatic dark/light mode switching
- **Search**: Full-text search functionality
- **Code Highlighting**: Syntax highlighting for multiple languages
- **Code Copy**: One-click code copying
- **Navigation**: Tabbed navigation with instant loading
- **Admonitions**: Note, warning, tip, and other callout boxes
- **Abbreviations**: Hover over abbreviations for definitions
- **Mermaid Diagrams**: Support for Mermaid diagrams

## Customization

- **Theme Colors**: Edit `mkdocs.yml` under `theme.palette`
- **Custom CSS**: Add styles to `source/stylesheets/extra.css`
- **Custom JavaScript**: Add scripts to `source/javascripts/extra.js`
- **Abbreviations**: Add abbreviations to `source/includes/abbreviations.md`

## Deployment

The documentation can be deployed to:

- **GitHub Pages**: Using `mkdocs gh-deploy`
- **Cloudflare Pages**: Connect your repository and build with `mkdocs build`
- **Any static hosting**: Upload the `website/` directory

## Learn More

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Markdown Guide](https://www.markdownguide.org/)
