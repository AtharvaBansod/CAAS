'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import {
    BookOpen, Code, Zap, MessageSquare, Shield, Key, Globe, Terminal, ExternalLink,
} from 'lucide-react';

const sections = [
    {
        title: 'Getting Started',
        icon: Zap,
        items: [
            { title: 'Quick Start Guide', desc: 'Set up your first chat integration in 5 minutes', tag: 'Beginner' },
            { title: 'Authentication', desc: 'Understand API key and token-based auth', tag: 'Essential' },
            { title: 'SDK Installation', desc: 'Install the CAAS SDK in your project', tag: 'Beginner' },
        ],
    },
    {
        title: 'Core Concepts',
        icon: MessageSquare,
        items: [
            { title: 'Conversations', desc: 'Create and manage chat conversations', tag: 'Core' },
            { title: 'Messages', desc: 'Send, receive, and manage messages', tag: 'Core' },
            { title: 'Users & Sessions', desc: 'User identity and session management', tag: 'Core' },
            { title: 'Webhooks', desc: 'Real-time event notifications', tag: 'Advanced' },
        ],
    },
    {
        title: 'Security',
        icon: Shield,
        items: [
            { title: 'API Key Management', desc: 'Rotate, promote, and revoke API keys', tag: 'Security' },
            { title: 'IP Whitelisting', desc: 'Restrict API access by IP address', tag: 'Security' },
            { title: 'Origin Whitelisting', desc: 'Configure CORS for your domains', tag: 'Security' },
            { title: 'End-to-End Encryption', desc: 'Message encryption best practices', tag: 'Security' },
        ],
    },
];

export default function DocsPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
                <p className="mt-1 text-muted-foreground">Everything you need to integrate CAAS into your application.</p>
            </div>

            {/* Quick Code Example */}
            <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Quick Start</span>
                    <Badge variant="secondary" className="ml-auto">JavaScript</Badge>
                </div>
                <CardContent className="p-0">
                    <pre className="p-6 text-sm font-mono overflow-x-auto leading-relaxed">
                        <code className="text-foreground">{`// 1. Install the SDK
npm install @caas/sdk

// 2. Initialize the client
import { ChatClient } from '@caas/sdk';

const chat = new ChatClient({
  apiKey: process.env.CAAS_API_KEY,
  tenantId: '${user?.tenantId || '<your-tenant-id>'}',
});

// 3. Create a conversation
const conversation = await chat.conversations.create({
  type: 'direct',
  participants: ['user-alice', 'user-bob'],
});

// 4. Send a message
await chat.messages.send({
  conversationId: conversation.id,
  content: 'Hello from CAAS! 🚀',
  senderId: 'user-alice',
});

// 5. Listen for real-time updates
chat.on('message:received', (message) => {
  console.log('New message:', message.content);
});`}</code>
                    </pre>
                </CardContent>
            </Card>

            {/* Documentation Sections */}
            {sections.map((section) => (
                <Card key={section.title}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <section.icon className="h-5 w-5 text-primary" />
                            {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2">
                            {section.items.map((item) => (
                                <a
                                    key={item.title}
                                    href="#"
                                    className="group flex items-start gap-3 rounded-lg border p-4 transition-all hover:bg-accent hover:border-primary/20 hover:shadow-sm"
                                >
                                    <Code className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{item.title}</h4>
                                            <Badge variant="outline" className="text-[10px]">{item.tag}</Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* API Reference */}
            <Card>
                <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-white">
                        <Globe className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Full API Reference</h3>
                        <p className="text-sm text-muted-foreground">Complete REST API documentation with examples and schemas.</p>
                    </div>
                    <a
                        href="#"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        View API Docs <ExternalLink className="h-4 w-4" />
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
