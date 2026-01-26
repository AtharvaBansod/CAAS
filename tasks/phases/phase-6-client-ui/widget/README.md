# Embeddable Chat Widget Feature

## Overview

A lightweight, embeddable chat widget that can be added to any website with a simple script tag. Provides a floating chat button that opens a full chat interface.

## Architecture

```
packages/widget/
├── src/
│   ├── index.ts              # Entry point, exposes CAASWidget
│   ├── Widget.tsx            # Main widget component
│   ├── WidgetButton.tsx      # Floating launcher button
│   ├── WidgetWindow.tsx      # Chat window container
│   ├── WidgetFrame.tsx       # Iframe wrapper (optional)
│   ├── WidgetProvider.tsx    # Context provider
│   ├── hooks/                # Widget-specific hooks
│   ├── styles/               # Scoped styles
│   └── utils/                # Utilities
├── embed/
│   ├── loader.ts             # Script tag loader
│   └── embed.html            # Demo embed page
├── package.json
├── tsconfig.json
└── webpack.config.js         # Bundle for CDN
```

## Key Features

### Embedding
- Single `<script>` tag integration
- Zero dependencies (SDK included)
- Works on any website

### Customization
- Position: bottom-left, bottom-right
- Colors and branding
- Custom launcher icon
- Initial message

### Security
- Optional iframe isolation
- CSP compatible
- XSS protection

## Usage Example

```html
<!-- Simple embed -->
<script src="https://cdn.caas.io/widget.min.js"></script>
<script>
  CAASWidget.init({
    appId: 'your-app-id',
    apiKey: 'your-api-key',
    position: 'bottom-right',
    theme: {
      primaryColor: '#4F46E5'
    }
  });
</script>
```

## Technologies

- React 18 (bundled)
- CSS-in-JS (shadow DOM)
- Web Components (optional)
- Webpack for bundling

## Task Groups

1. **01-widget-core.json** - Widget core and launcher
2. **02-widget-customization.json** - Theming and configuration
