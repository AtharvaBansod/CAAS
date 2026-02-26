'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/providers/ToastProvider';
import {
    Users, Plus, Mail, Shield, Pencil, Trash2, UserPlus,
} from 'lucide-react';

const mockMembers = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'owner', status: 'active', joined_at: '2024-01-15' },
    { id: '2', name: 'Developer', email: 'dev@example.com', role: 'developer', status: 'active', joined_at: '2024-03-10' },
    { id: '3', name: 'Viewer', email: 'viewer@example.com', role: 'viewer', status: 'pending', joined_at: '2024-06-01' },
];

const roleColors: Record<string, string> = {
    owner: 'default',
    admin: 'default',
    developer: 'secondary',
    viewer: 'outline',
};

export default function TeamPage() {
    const { toast } = useToast();
    const [members] = React.useState(mockMembers);
    const [showInvite, setShowInvite] = React.useState(false);
    const [inviteEmail, setInviteEmail] = React.useState('');
    const [inviteRole, setInviteRole] = React.useState('developer');

    const handleInvite = () => {
        toast({ type: 'success', title: 'Invitation sent', description: `Invite sent to ${inviteEmail}` });
        setInviteEmail('');
        setShowInvite(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="mt-1 text-muted-foreground">Manage team members and roles for your tenant.</p>
                </div>
                <Button onClick={() => setShowInvite(!showInvite)}>
                    <UserPlus className="h-4 w-4" /> Invite Member
                </Button>
            </div>

            {/* Invite Form */}
            {showInvite && (
                <Card className="border-primary/30 animate-fade-in">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <Input
                                    label="Email address"
                                    type="email"
                                    placeholder="colleague@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="w-40">
                                <label className="text-sm font-medium text-foreground">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="developer">Developer</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <Button onClick={handleInvite} disabled={!inviteEmail}>
                                <Mail className="h-4 w-4" /> Send Invite
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Members List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Members ({members.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                        {m.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{m.name}</p>
                                        <p className="text-sm text-muted-foreground">{m.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={roleColors[m.role] as any || 'secondary'} className="capitalize">
                                        {m.role}
                                    </Badge>
                                    <Badge variant={m.status === 'active' ? 'success' : 'warning'} className="capitalize">
                                        {m.status}
                                    </Badge>
                                    {m.role !== 'owner' && (
                                        <div className="flex gap-1">
                                            <button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Roles Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Role Permissions
                    </CardTitle>
                    <CardDescription>What each role can do:</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                        {[
                            { role: 'Admin', perms: ['Full access', 'Manage members', 'Manage API keys', 'View audit logs', 'Update settings'] },
                            { role: 'Developer', perms: ['View API keys', 'View audit logs', 'View settings', 'Access documentation'] },
                            { role: 'Viewer', perms: ['View dashboard', 'View audit logs', 'Access documentation'] },
                        ].map((r) => (
                            <div key={r.role} className="rounded-lg border p-4">
                                <h4 className="font-semibold text-foreground mb-2">{r.role}</h4>
                                <ul className="space-y-1">
                                    {r.perms.map((p) => (
                                        <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
