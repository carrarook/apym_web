'use client';

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from 'react';
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { cn } from "@/lib/utils";

const logger = createLogger("dashboard-challenges");

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  targetValue: number | null;
  prize: string | null;
  participants: Array<{
    id: string;
    currentValue: number;
    rank: number | null;
    isWinner: boolean;
    member: {
      id: string;
      name: string;
      phone: string;
      photo: string | null;
    };
  }>;
}

interface LeaderboardEntry {
  rank: number;
  member: {
    id: string;
    name: string;
    phone: string;
    photo: string | null;
  };
  value: number;
  label: string;
  totalCalories?: number;
  totalDuration?: number;
}

export default function ChallengesPage() {
  const tStatic = useStaticUiTranslations("static");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard'>('challenges');
  const [leaderboardType, setLeaderboardType] = useState<'attendance' | 'workouts' | 'challenges'>('attendance');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'year' | 'all-time'>('month');

  useEffect(() => {
    if (activeTab === 'challenges') {
      fetchChallenges();
    } else {
      fetchLeaderboard();
    }
  }, [activeTab, leaderboardType, leaderboardPeriod]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/challenges');
      if (!response.ok) throw new Error('Failed to fetch challenges');

      const data = await response.json();
      // The API wraps payloads in { success, data: { challenges } }. Normalize the
      // envelope and the Prisma relation names (ChallengeParticipant/Member) to the
      // shape the UI expects, guarding against undefined so empty data renders cleanly.
      const rawList = data?.data?.challenges ?? data?.challenges ?? [];
      const normalized = (Array.isArray(rawList) ? rawList : []).map((c: any) => ({
        ...c,
        participants: (c.participants ?? c.ChallengeParticipant ?? []).map((p: any) => ({
          ...p,
          member: p.member ?? p.Member,
        })),
      }));
      setChallenges(normalized);
    } catch (error) {
      logger.error('Error fetching challenges:', error as Error);
      alert('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${leaderboardType}&period=${leaderboardPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      const list = data?.leaderboard ?? data?.data?.leaderboard ?? [];
      setLeaderboard(Array.isArray(list) ? list : []);
    } catch (error) {
      logger.error('Error fetching leaderboard:', error as Error);
      alert('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("4eeb1624b8be")}
        description={tStatic("a85e5e5f1083")}
      />

      <div className="mb-2 flex gap-1 border-b border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab('challenges')}
          className={cn(
            "h-auto rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm font-medium shadow-none hover:bg-transparent",
            activeTab === 'challenges'
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LocalizedText id="ff38765fb13e" leading={""} trailing={"\n        "} /></Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            "h-auto rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-sm font-medium shadow-none hover:bg-transparent",
            activeTab === 'leaderboard'
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LocalizedText id="0381247a6987" leading={""} trailing={"\n        "} /></Button>
      </div>

      {activeTab === 'challenges' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
              <LocalizedText id="cfd3c00c7dca" leading={""} trailing={"\n            "} /></div>
          ) : challenges.length === 0 ? (
            <div className="bg-card p-8 rounded-lg shadow text-center text-muted-foreground">
              <LocalizedText id="063505ded264" leading={""} trailing={"\n            "} /></div>
          ) : (
            challenges.map((challenge) => (
              <div key={challenge.id} className="bg-card p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{challenge.name}</h3>
                    <p className="text-muted-foreground">{challenge.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(challenge.status)}`}>
                    {challenge.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-muted-foreground"><LocalizedText id="3deb74565196" leading={""} trailing={""} /></div>
                    <div className="font-semibold">{challenge.type.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground"><LocalizedText id="9d7ab1a55796" leading={""} trailing={""} /></div>
                    <div className="font-semibold">{formatDate(challenge.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground"><LocalizedText id="84b147812589" leading={""} trailing={""} /></div>
                    <div className="font-semibold">{formatDate(challenge.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground"><LocalizedText id="cd56e0839d06" leading={""} trailing={""} /></div>
                    <div className="font-semibold">{challenge.participants.length}</div>
                  </div>
                </div>

                {challenge.targetValue && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <span className="text-sm font-medium text-blue-800">
                      <LocalizedText id="652ac2cbbafc" leading={""} trailing={" "} />{challenge.targetValue}
                    </span>
                  </div>
                )}

                {challenge.prize && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded">
                    <span className="text-sm font-medium text-yellow-800">
                      <LocalizedText id="d1b310bffdec" leading={""} trailing={" "} />{challenge.prize}
                    </span>
                  </div>
                )}

                {challenge.participants.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3"><LocalizedText id="356a25c4134e" leading={""} trailing={""} /></h4>
                    <div className="space-y-2">
                      {challenge.participants.slice(0, 5).map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between bg-muted p-3 rounded">
                          <div className="flex items-center space-x-3">
                            {participant.rank && (
                              <span className="text-lg font-bold w-8">
                                {getMedalEmoji(participant.rank)}
                              </span>
                            )}
                            <div>
                              <div className="font-medium">{participant.member.name}</div>
                              <div className="text-sm text-muted-foreground">{participant.member.phone}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{participant.currentValue}</div>
                            {participant.isWinner && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                <LocalizedText id="4e3adcfe37c3" leading={""} trailing={"\n                              "} /></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          {/* Leaderboard Filters */}
          <div className="bg-card p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2"><LocalizedText id="3deb74565196" leading={""} trailing={""} /></label>
                <SelectNative
                  value={leaderboardType}
                  onChange={(e) => setLeaderboardType(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="attendance"><LocalizedText id="b689313fc18c" leading={""} trailing={""} /></option>
                  <option value="workouts"><LocalizedText id="ccb58b229959" leading={""} trailing={""} /></option>
                  <option value="challenges"><LocalizedText id="1d98078f49f5" leading={""} trailing={""} /></option>
                </SelectNative>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2"><LocalizedText id="170a28a9db6d" leading={""} trailing={""} /></label>
                <SelectNative
                  value={leaderboardPeriod}
                  onChange={(e) => setLeaderboardPeriod(e.target.value as any)}
                  className="w-full p-2 border rounded"
                >
                  <option value="week"><LocalizedText id="4e68dca8ab90" leading={""} trailing={""} /></option>
                  <option value="month"><LocalizedText id="0f6cc3a89ce9" leading={""} trailing={""} /></option>
                  <option value="year"><LocalizedText id="77528c94d9a3" leading={""} trailing={""} /></option>
                  <option value="all-time"><LocalizedText id="4745c5dce5e8" leading={""} trailing={""} /></option>
                </SelectNative>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-card rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground"><LocalizedText id="f91bd71edebe" leading={""} trailing={""} /></div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground"><LocalizedText id="0cfc430ad519" leading={""} trailing={""} /></div>
            ) : (
              <div className="divide-y">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="p-4 hover:bg-muted flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold w-12 text-center">
                        {getMedalEmoji(entry.rank)}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{entry.member.name}</div>
                        <div className="text-sm text-muted-foreground">{entry.member.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {entry.value}
                      </div>
                      <div className="text-sm text-muted-foreground">{entry.label}</div>
                      {entry.totalCalories !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {entry.totalCalories} <LocalizedText id="443a301c6126" leading={""} trailing={"\n                        "} /></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
