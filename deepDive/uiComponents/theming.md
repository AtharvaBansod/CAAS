# UI Components - Theming Architecture

> **Parent Roadmap**: [UI Components](../../roadmaps/6_uiComponents.md)

---

## Overview

Flexible theming system allowing SAAS clients to customize the look and feel of CAAS UI components to match their brand.

---

## Tasks

### 1. Design Token System

#### 1.1 Token Categories
```typescript
interface ThemeTokens {
  // Colors
  colors: {
    // Brand
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    
    // Semantic
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Neutral
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    
    // Text
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textInverse: string;
    
    // Chat specific
    messageSent: string;
    messageReceived: string;
    messageSentText: string;
    messageReceivedText: string;
    onlineIndicator: string;
    typingIndicator: string;
  };
  
  // Typography
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSize: {
      xs: string;   // 12px
      sm: string;   // 14px
      md: string;   // 16px
      lg: string;   // 18px
      xl: string;   // 20px
      '2xl': string; // 24px
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  
  // Spacing
  spacing: {
    xs: string;   // 4px
    sm: string;   // 8px
    md: string;   // 16px
    lg: string;   // 24px
    xl: string;   // 32px
    '2xl': string; // 48px
  };
  
  // Border radius
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  
  // Shadows
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  
  // Transitions
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}
```
- [ ] Color token definitions
- [ ] Typography scale
- [ ] Spacing scale
- [ ] Border radius tokens
- [ ] Shadow tokens

### 2. Theme Creation API

#### 2.1 createTheme Function
```typescript
import { createTheme, defaultTheme } from '@caas/ui';

// Create custom theme extending defaults
const myTheme = createTheme({
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    background: '#ffffff',
    surface: '#f8fafc',
    messageSent: '#6366f1',
    messageReceived: '#f1f5f9'
  },
  typography: {
    fontFamily: 'Inter, sans-serif'
  },
  borderRadius: {
    md: '12px',
    lg: '16px'
  }
});

// Deep merge with defaults
function createTheme(overrides: DeepPartial<ThemeTokens>): ThemeTokens {
  return deepMerge(defaultTheme, overrides);
}
```
- [ ] Deep merge utility
- [ ] Type-safe overrides
- [ ] Validation of values

#### 2.2 Pre-built Themes
```typescript
// Default light theme
export const lightTheme = createTheme({
  colors: {
    background: '#ffffff',
    surface: '#f8fafc',
    textPrimary: '#1e293b',
    messageSent: '#6366f1',
    messageReceived: '#f1f5f9'
  }
});

// Default dark theme
export const darkTheme = createTheme({
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    textPrimary: '#f8fafc',
    messageSent: '#4f46e5',
    messageReceived: '#334155'
  }
});

// High contrast theme
export const highContrastTheme = createTheme({
  colors: {
    background: '#000000',
    surface: '#1a1a1a',
    textPrimary: '#ffffff',
    primary: '#00ff00'
  }
});
```
- [ ] Light theme
- [ ] Dark theme
- [ ] High contrast theme
- [ ] Minimal theme

### 3. CSS Variable Implementation

#### 3.1 Token to CSS Variable Mapping
```typescript
// Convert theme tokens to CSS variables
function themeToCSS(theme: ThemeTokens): string {
  const cssVars: string[] = [];
  
  function processObject(obj: any, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const varName = `--caas-${prefix}-${kebabCase(key)}`;
      if (typeof value === 'object') {
        processObject(value, `${prefix}-${kebabCase(key)}`);
      } else {
        cssVars.push(`${varName}: ${value};`);
      }
    }
  }
  
  processObject(theme.colors, 'color');
  processObject(theme.typography, 'font');
  processObject(theme.spacing, 'space');
  processObject(theme.borderRadius, 'radius');
  processObject(theme.shadows, 'shadow');
  
  return `:root { ${cssVars.join('\n')} }`;
}
```

#### 3.2 CSS Variable Usage
```css
/* Component styles using CSS variables */
.caas-message-bubble-sent {
  background-color: var(--caas-color-message-sent);
  color: var(--caas-color-message-sent-text);
  border-radius: var(--caas-radius-lg);
  padding: var(--caas-space-sm) var(--caas-space-md);
  font-family: var(--caas-font-font-family);
  font-size: var(--caas-font-font-size-md);
}

.caas-message-bubble-received {
  background-color: var(--caas-color-message-received);
  color: var(--caas-color-message-received-text);
}
```
- [ ] CSS variable generation
- [ ] Fallback values
- [ ] Runtime theme switching

### 4. Theme Provider Component

#### 4.1 ThemeProvider Implementation
```tsx
import { createContext, useContext, useMemo, useEffect } from 'react';

interface ThemeContextValue {
  theme: ThemeTokens;
  setTheme: (theme: ThemeTokens) => void;
  colorMode: 'light' | 'dark' | 'system';
  setColorMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  theme = lightTheme,
  children,
  colorMode = 'system'
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [mode, setMode] = useState(colorMode);
  
  // Apply CSS variables to :root
  useEffect(() => {
    const css = themeToCSS(currentTheme);
    let styleEl = document.getElementById('caas-theme');
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'caas-theme';
      document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = css;
  }, [currentTheme]);
  
  // Handle system color scheme
  useEffect(() => {
    if (mode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setCurrentTheme(e.matches ? darkTheme : lightTheme);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);
  
  const value = useMemo(() => ({
    theme: currentTheme,
    setTheme: setCurrentTheme,
    colorMode: mode,
    setColorMode: setMode
  }), [currentTheme, mode]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```
- [ ] Theme context
- [ ] CSS injection
- [ ] System preference detection
- [ ] Theme persistence

### 5. Component Styling Patterns

#### 5.1 CSS-in-JS with Theme Access
```typescript
import { styled } from '@emotion/styled';
import { useTheme } from '@caas/ui';

// Option 1: Emotion styled with theme
const MessageBubble = styled.div<{ sent: boolean }>`
  background-color: ${({ sent, theme }) => 
    sent ? theme.colors.messageSent : theme.colors.messageReceived};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

// Option 2: CSS variables (preferred for performance)
const MessageBubble = styled.div<{ sent: boolean }>`
  background-color: var(${({ sent }) => 
    sent ? '--caas-color-message-sent' : '--caas-color-message-received'});
  padding: var(--caas-space-sm) var(--caas-space-md);
  border-radius: var(--caas-radius-lg);
`;
```

#### 5.2 Class Name Overrides
```tsx
// Allow className overrides for customization
interface ChatWindowProps {
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    messageList?: string;
    inputArea?: string;
  };
}

function ChatWindow({ className, classNames }: ChatWindowProps) {
  return (
    <div className={cn('caas-chat-window', className, classNames?.root)}>
      <div className={cn('caas-chat-header', classNames?.header)}>
        {/* ... */}
      </div>
      <div className={cn('caas-message-list', classNames?.messageList)}>
        {/* ... */}
      </div>
    </div>
  );
}
```
- [ ] className prop support
- [ ] classNames object for parts
- [ ] CSS module compatibility

### 6. Theme Persistence

#### 6.1 Storage Options
```typescript
interface ThemeStorageConfig {
  key: string;
  storage: 'localStorage' | 'sessionStorage' | 'cookie';
  syncTabs: boolean;
}

function usePersistedTheme(config: ThemeStorageConfig) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(config.key);
    return stored ? JSON.parse(stored) : lightTheme;
  });
  
  useEffect(() => {
    localStorage.setItem(config.key, JSON.stringify(theme));
  }, [theme]);
  
  // Cross-tab sync
  useEffect(() => {
    if (!config.syncTabs) return;
    
    const handler = (e: StorageEvent) => {
      if (e.key === config.key && e.newValue) {
        setTheme(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [config.key, config.syncTabs]);
  
  return [theme, setTheme];
}
```
- [ ] localStorage persistence
- [ ] Cross-tab synchronization
- [ ] Server-side preference

---

## Usage Examples

### Basic Theme Setup
```tsx
import { CaasProvider, lightTheme, darkTheme, createTheme } from '@caas/ui';

const customTheme = createTheme({
  colors: {
    primary: '#your-brand-color'
  }
});

function App() {
  return (
    <CaasProvider
      apiKey="your-api-key"
      theme={customTheme}
      colorMode="system"
    >
      <ChatWindow />
    </CaasProvider>
  );
}
```

### Dynamic Theme Switching
```tsx
function ThemeSwitcher() {
  const { colorMode, setColorMode } = useTheme();
  
  return (
    <select 
      value={colorMode} 
      onChange={(e) => setColorMode(e.target.value)}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

---

## Related Documents

- [Build System](./build-system.md)
- [Chat List Implementation](./chat-list.md)
