import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'CAAS — Authentication',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-screen">
            {/* Left: branding panel */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center gradient-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwSDI4VjBoNHYzNHptLTggMEgyMFYwaDR2MzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
                <div className="relative z-10 max-w-md text-center text-white px-8">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Chat-as-a-Service</h1>
                    <p className="text-lg text-blue-100 leading-relaxed">
                        Enterprise-grade real‑time chat infrastructure. Build messaging features in minutes, not months.
                    </p>
                    <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
                        <div className="glass rounded-lg p-3">
                            <div className="text-2xl font-bold">99.9%</div>
                            <div className="text-blue-200 mt-1">Uptime SLA</div>
                        </div>
                        <div className="glass rounded-lg p-3">
                            <div className="text-2xl font-bold">&lt;50ms</div>
                            <div className="text-blue-200 mt-1">Latency</div>
                        </div>
                        <div className="glass rounded-lg p-3">
                            <div className="text-2xl font-bold">E2E</div>
                            <div className="text-blue-200 mt-1">Encrypted</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: form panel */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
