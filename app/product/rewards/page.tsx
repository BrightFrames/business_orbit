'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Calendar, Zap } from 'lucide-react';
import { safeApiCall } from "@/lib/utils/api";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
    id: string;
    points: number;
    action_type: string;
    description: string;
    created_at: string;
}

interface RewardsData {
    currentPoints: number;
    transactions: Transaction[];
}

export default function RewardsPage() {
    const [data, setData] = useState<RewardsData | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await safeApiCall(
                    () => fetch('/api/rewards/history'),
                    'Failed to fetch rewards history'
                );
                if (result.success) {
                    setData(result.data as RewardsData);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAction = (action: string) => {
        return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href="/product/feed">
                        <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                            <ArrowLeft size={16} />
                            Back to Feed
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6">
                    {/* Header Card */}
                    <Card className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl border-none">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Orbit Rewards</h1>
                                <p className="text-slate-300">Earn points by engaging with the community and unlocking achievements.</p>
                            </div>
                            <div className="text-center md:text-right bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="text-sm text-slate-300 uppercase tracking-wider font-semibold mb-1">Current Balance</div>
                                <div className="text-5xl font-extrabold text-yellow-400 flex items-center justify-center md:justify-end gap-3">
                                    <div className="w-8 h-8 rounded-full border-4 border-yellow-400 flex items-center justify-center">
                                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                    </div>
                                    {loading ? "..." : (data?.currentPoints || user?.orbitPoints || 0)}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* History List */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Transaction History
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (data?.transactions || []).length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-accent/20 rounded-lg">
                                <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No transactions yet. Start engaging to earn points!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(data?.transactions || []).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {tx.points > 0 ? <TrendingUp size={18} /> : <TrendingUp size={18} className="rotate-180" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">{formatAction(tx.action_type)}</div>
                                                <div className="text-sm text-muted-foreground">{tx.description || 'Activity Reward'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold text-lg ${tx.points > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                                {tx.points > 0 ? '+' : ''}{tx.points}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                                <Calendar size={10} />
                                                {formatDate(tx.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
