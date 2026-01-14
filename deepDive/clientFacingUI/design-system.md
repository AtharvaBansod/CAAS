# Client Facing UI - Design System

> **Parent Roadmap**: [Client Facing UI](../../roadmaps/1_clientFacingUI.md)

---

## Overview

The design system is the foundation of the Client Facing UI, providing consistent, reusable, and accessible components across the entire portal.

---

## Tasks

### 1. Design Tokens Definition
- [ ] **1.1** Define color palette
  - Primary colors (brand)
  - Secondary colors (accents)
  - Semantic colors (success, warning, error, info)
  - Neutral colors (grays)
  - Dark mode variants
- [ ] **1.2** Define typography scale
  - Font families (heading, body, mono)
  - Font sizes (xs to 4xl)
  - Font weights
  - Line heights
  - Letter spacing
- [ ] **1.3** Define spacing scale
  - Base unit (4px or 8px)
  - Spacing tokens (1-20)
  - Layout spacing (section, component, element)
- [ ] **1.4** Define elevation/shadow tokens
  - Shadow levels (sm, md, lg, xl)
  - Elevation system
- [ ] **1.5** Define border radius tokens
  - Radius scale (none, sm, md, lg, full)
- [ ] **1.6** Define transition/animation tokens
  - Duration presets
  - Easing functions

### 2. CSS Custom Properties Setup
- [ ] **2.1** Create CSS variables file
- [ ] **2.2** Implement theme switching mechanism
- [ ] **2.3** Set up dark mode toggle
- [ ] **2.4** Create utility classes

### 3. Component Library Foundation
- [ ] **3.1** Set up component development environment
- [ ] **3.2** Configure Storybook
- [ ] **3.3** Create component template structure
- [ ] **3.4** Set up accessibility testing (axe-core)

### 4. Base Components Implementation

#### 4.1 Button Component
```tsx
// Variants: primary, secondary, outline, ghost, destructive
// Sizes: sm, md, lg
// States: default, hover, active, disabled, loading
<Button variant="primary" size="md" leftIcon={<IconPlus />}>
  Create App
</Button>
```
- [ ] Implement all variants
- [ ] Implement all sizes
- [ ] Add loading state
- [ ] Add icon support
- [ ] Add a11y attributes

#### 4.2 Input Component
```tsx
// Types: text, email, password, number
// States: default, focus, error, disabled
<Input 
  label="API Key Name"
  placeholder="Enter name..."
  error="Name is required"
  leftAddon={<IconKey />}
/>
```
- [ ] Implement base input
- [ ] Add label integration
- [ ] Add error/helper text
- [ ] Add addons (left/right)
- [ ] Add password visibility toggle

#### 4.3 Card Component
- [ ] Basic card with padding
- [ ] Card with header/footer
- [ ] Interactive card (hoverable)
- [ ] Card with image

#### 4.4 Modal Component
- [ ] Modal backdrop
- [ ] Modal container with animation
- [ ] Close button and escape key
- [ ] Focus trap
- [ ] Multiple sizes

#### 4.5 Additional Base Components
- [ ] Badge
- [ ] Avatar
- [ ] Tooltip
- [ ] Dropdown
- [ ] Tabs
- [ ] Toast/Notification

### 5. Layout Components
- [ ] **5.1** Stack (vertical/horizontal)
- [ ] **5.2** Grid
- [ ] **5.3** Container
- [ ] **5.4** Divider
- [ ] **5.5** Spacer

### 6. Form Components
- [ ] **6.1** Select/Dropdown
- [ ] **6.2** Checkbox
- [ ] **6.3** Radio
- [ ] **6.4** Switch/Toggle
- [ ] **6.5** Textarea
- [ ] **6.6** File Upload
- [ ] **6.7** Date Picker
- [ ] **6.8** Form Field wrapper

### 7. Data Display Components
- [ ] **7.1** Table (sortable, paginated)
- [ ]**7.2** Data list
- [ ] **7.3** Stats card
- [ ] **7.4** Progress bar
- [ ] **7.5** Skeleton loaders

### 8. Navigation Components
- [ ] **8.1** Sidebar navigation
- [ ] **8.2** Breadcrumb
- [ ] **8.3** Pagination
- [ ] **8.4** Stepper/Wizard

### 9. Documentation
- [ ] **9.1** Component usage guidelines
- [ ] **9.2** Props documentation
- [ ] **9.3** Accessibility notes
- [ ] **9.4** Design patterns

---

## Technical Specifications

### File Structure
```
src/
├── design-system/
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── ...
│   ├── layouts/
│   └── hooks/
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── reset.css
```

### Color Token Example
```typescript
export const colors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    900: '#312e81',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    // ...
    900: '#111827',
  },
};
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| @radix-ui/* | Accessible primitives |
| class-variance-authority | Component variants |
| tailwind-merge | Class merging |
| lucide-react | Icons |

---

## Acceptance Criteria

- [ ] All components pass WCAG 2.1 AA accessibility audit
- [ ] All components have Storybook stories
- [ ] All components have unit tests (>80% coverage)
- [ ] Design tokens are documented
- [ ] Dark mode works correctly
- [ ] Components are responsive
