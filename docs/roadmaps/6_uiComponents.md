# UI Components - NPM Package & Widget Library

> **Purpose**: Customizable React component library distributed via NPM, providing drop-in chat UI widgets for SAAS client integration.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Phase 1: Package Foundation](#phase-1-package-foundation)
- [Phase 2: Core Components](#phase-2-core-components)
- [Phase 3: Chat Features](#phase-3-chat-features)
- [Phase 4: Media Components](#phase-4-media-components)
- [Phase 5: Display Windows](#phase-5-display-windows)
- [Phase 6: Theming & Customization](#phase-6-theming--customization)
- [Related Resources](#related-resources)

---

## Overview

The UI Components package provides:
- Pre-built React components for all chat features
- TypeScript support with full type definitions
- Customizable theming and styling
- Framework-agnostic core (with React wrapper)
- Accessibility (WCAG 2.1 AA compliant)
- Mobile-responsive design

### Package Structure
```
@caas/ui
├── core/                    # Framework-agnostic core
├── react/                   # React components
├── hooks/                   # React hooks
├── themes/                  # Pre-built themes
├── types/                   # TypeScript definitions
└── utils/                   # Helper utilities
```

---

## Phase 1: Package Foundation

### 1.1 Monorepo Setup
- [ ] pnpm workspace configuration
- [ ] Package structure design
- [ ] Shared dependencies management
- [ ] Internal package linking
- [ ] Version management strategy

### 1.2 Build System
- [ ] Rollup/Vite build configuration
- [ ] ESM and CJS output
- [ ] Tree-shaking optimization
- [ ] Source maps generation
- [ ] Bundle size monitoring

**📁 Deep Dive**: [NPM Package Build System](../deepDive/uiComponents/build-system.md)

### 1.3 Development Environment
- [ ] Storybook setup for documentation
- [ ] Component playground
- [ ] Hot module replacement
- [ ] Visual regression testing
- [ ] A11y testing integration

### 1.4 Testing Framework
- [ ] Jest/Vitest configuration
- [ ] React Testing Library
- [ ] Snapshot testing
- [ ] Integration tests
- [ ] E2E tests with Playwright

### 1.5 Documentation
- [ ] API documentation generation
- [ ] Usage examples
- [ ] Props table generation
- [ ] Migration guides
- [ ] Changelog automation

---

## Phase 2: Core Components

### 2.1 Provider Components
```tsx
<CaasProvider
  apiKey="your-api-key"
  userId="user-123"
  options={{
    theme: 'dark',
    locale: 'en',
    debug: false
  }}
>
  <ChatWindow />
</CaasProvider>
```
- [ ] CaasProvider (context setup)
- [ ] ThemeProvider
- [ ] LocalizationProvider
- [ ] ConnectionProvider
- [ ] AuthProvider

**📊 Flow Diagram**: [Component Provider Architecture](../flowdiagram/component-provider-architecture.md)

### 2.2 Connection Components
- [ ] ConnectionStatus indicator
- [ ] ReconnectBanner
- [ ] OfflineIndicator
- [ ] NetworkQuality meter

### 2.3 Base UI Components
- [ ] Avatar (with presence indicator)
- [ ] Badge (notification counts)
- [ ] Button (various styles)
- [ ] Input (text, multiline)
- [ ] Modal/Dialog
- [ ] Dropdown
- [ ] Tooltip
- [ ] Loading states
- [ ] Empty states
- [ ] Error states

### 2.4 Layout Components
- [ ] SplitPane
- [ ] ScrollContainer (infinite scroll)
- [ ] ResizablePanel
- [ ] CollapsibleSection
- [ ] TabContainer

---

## Phase 3: Chat Features

### 3.1 Chat List Component
```tsx
<ChatList
  onConversationSelect={(conv) => setActive(conv.id)}
  onCreateGroup={() => openGroupModal()}
  filters={{
    unreadOnly: false,
    searchQuery: ''
  }}
  renderItem={(conv) => <CustomConversationItem {...conv} />}
/>
```
- [ ] Conversation list with virtualization
- [ ] Search and filter functionality
- [ ] Unread indicators
- [ ] Last message preview
- [ ] Pinned conversations
- [ ] Group indicators
- [ ] Create new chat/group button
- [ ] Skeleton loading states

**📁 Deep Dive**: [Chat List Implementation](../deepDive/uiComponents/chat-list.md)

### 3.2 Chat Window Component
```tsx
<ChatWindow
  conversationId="conv-123"
  onSendMessage={(msg) => handleSend(msg)}
  features={{
    reactions: true,
    threads: true,
    fileUpload: true
  }}
/>
```
- [ ] Message list with infinite scroll
- [ ] Message input with formatting
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message reactions
- [ ] Thread/reply view
- [ ] Message search
- [ ] Date separators
- [ ] System messages
- [ ] Message grouping by sender

**📊 Flow Diagram**: [Chat Window State Management](../flowdiagram/chat-window-state.md)

### 3.3 Message Components
- [ ] TextMessage
- [ ] ImageMessage (with lightbox)
- [ ] VideoMessage (with player)
- [ ] FileMessage (with download)
- [ ] LinkPreview
- [ ] LocationMessage
- [ ] ContactMessage
- [ ] SystemMessage
- [ ] MessageBubble wrapper
- [ ] MessageActions (edit, delete, reply)

**📁 Deep Dive**: [Message Component Design](../deepDive/uiComponents/message-components.md)

### 3.4 Input Components
- [ ] MessageInput (rich text)
- [ ] EmojiPicker
- [ ] MentionSelector
- [ ] FileUploader
- [ ] VoiceRecorder
- [ ] GIFPicker (Giphy integration)
- [ ] AttachmentPreview

### 3.5 Group Management
- [ ] GroupCreationModal
- [ ] GroupSettings
- [ ] MemberList
- [ ] AddMemberModal
- [ ] GroupAvatar uploader
- [ ] AdminControls

---

## Phase 4: Media Components

### 4.1 Voice Call UI
```tsx
<VoiceCallWindow
  callId="call-123"
  participants={participants}
  onHangup={() => endCall()}
  onMute={(muted) => toggleMute(muted)}
/>
```
- [ ] Incoming call modal
- [ ] Outgoing call screen
- [ ] Active call interface
- [ ] Call controls (mute, speaker, hold)
- [ ] Participant list
- [ ] Call quality indicator
- [ ] Call duration timer

### 4.2 Video Call UI
- [ ] Video grid layout
- [ ] Active speaker detection display
- [ ] Picture-in-picture mode
- [ ] Camera toggle
- [ ] Virtual background selector
- [ ] Screen share button
- [ ] Participant controls
- [ ] Meeting toolbar

**📁 Deep Dive**: [Video Call UI Design](../deepDive/uiComponents/video-call-ui.md)

### 4.3 Screen Sharing
- [ ] ScreenSharePreview
- [ ] ViewerControls
- [ ] AnnotationToolbar
- [ ] ShareSelector (screen/window/tab)

### 4.4 Whiteboard Component
```tsx
<Whiteboard
  roomId="whiteboard-123"
  tools={['pen', 'shape', 'text', 'eraser']}
  collaborative={true}
/>
```
- [ ] Drawing canvas
- [ ] Tool palette
- [ ] Color picker
- [ ] Shape tools
- [ ] Text tool
- [ ] Image upload
- [ ] Undo/Redo
- [ ] Export functionality
- [ ] Real-time sync indicators

**📊 Flow Diagram**: [Whiteboard Collaboration Flow](../flowdiagram/whiteboard-flow.md)

---

## Phase 5: Display Windows

### 5.1 Infinity Scroll Window
```tsx
<InfinityScrollWindow
  type="posts" | "reels" | "files"
  fetchMore={loadNextPage}
  renderItem={(item) => <PostCard post={item} />}
/>
```
- [ ] Generic infinite scroll container
- [ ] Pull-to-refresh
- [ ] Loading indicators
- [ ] End-of-list detection
- [ ] Error retry handling

### 5.2 Content Display Types
- [ ] PostCard (social media style)
- [ ] ReelCard (vertical video)
- [ ] StoryViewer (ephemeral content)
- [ ] FileListItem
- [ ] ImageGallery
- [ ] VideoPlayer

**📁 Deep Dive**: [Infinity Scroll Implementation](../deepDive/uiComponents/infinity-scroll.md)

### 5.3 Task & Calendar Components
- [ ] TaskCard
- [ ] TaskList
- [ ] CalendarView (month/week/day)
- [ ] SchedulePicker
- [ ] ReminderCard
- [ ] EventModal

### 5.4 Notification Center
- [ ] NotificationBell (with badge)
- [ ] NotificationPanel
- [ ] NotificationItem
- [ ] NotificationSettings
- [ ] Push notification permission prompt

---

## Phase 6: Theming & Customization

### 6.1 Theme System
```tsx
const customTheme = createTheme({
  colors: {
    primary: '#6366f1',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem'
    }
  },
  borderRadius: '0.5rem',
  spacing: (n) => `${n * 0.25}rem`
});
```
- [ ] Theme token system
- [ ] CSS custom properties
- [ ] Dark/Light mode toggle
- [ ] System preference detection
- [ ] Theme persistence

**📁 Deep Dive**: [Theming Architecture](../deepDive/uiComponents/theming.md)

### 6.2 Pre-built Themes
- [ ] Default Light theme
- [ ] Default Dark theme
- [ ] High Contrast theme
- [ ] Minimal theme
- [ ] Colorful theme

### 6.3 Component Customization
- [ ] Slot-based customization
- [ ] Render props support
- [ ] CSS class injection
- [ ] Style prop overrides
- [ ] Component composition patterns

### 6.4 Internationalization
- [ ] RTL support
- [ ] String externalization
- [ ] Date/time localization
- [ ] Number formatting
- [ ] Pluralization support

### 6.5 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Focus management
- [ ] ARIA attributes
- [ ] Color contrast compliance
- [ ] Reduced motion support

---

## Related Resources

### Deep Dive Documents
- [Build System](../deepDive/uiComponents/build-system.md)
- [Chat List Implementation](../deepDive/uiComponents/chat-list.md)
- [Message Components](../deepDive/uiComponents/message-components.md)
- [Video Call UI](../deepDive/uiComponents/video-call-ui.md)
- [Infinity Scroll](../deepDive/uiComponents/infinity-scroll.md)
- [Theming Architecture](../deepDive/uiComponents/theming.md)

### R&D Documents
- [Virtual Scrolling Performance](../rnd/virtual-scrolling.md)
- [React Component Performance](../rnd/react-performance.md)

### Flow Diagrams
- [Component Provider Architecture](../flowdiagram/component-provider-architecture.md)
- [Chat Window State Management](../flowdiagram/chat-window-state.md)
- [Whiteboard Collaboration Flow](../flowdiagram/whiteboard-flow.md)

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18+ |
| Language | TypeScript |
| Styling | CSS-in-JS (Emotion/Stitches) |
| Build | Rollup/Vite |
| Testing | Vitest + RTL + Playwright |
| Docs | Storybook |

---

## NPM Package Details

```json
{
  "name": "@caas/ui",
  "version": "1.0.0",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./themes/*": "./dist/themes/*"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

---

## Bundle Size Targets

| Export | Target Size |
|--------|-------------|
| Full Bundle | < 150KB (gzip) |
| Core Only | < 30KB (gzip) |
| Individual Component | < 10KB (gzip) |
