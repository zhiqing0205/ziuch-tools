'use client';

import { useState, useEffect } from 'react';
import { fetchConferenceData, getUpcomingDeadlines, findRecentAcceptanceRate } from "@/lib/pub-finder/conference";
import { DetailedDeadlineCard } from "@/components/pub-finder/detailed-deadline-card";
import { DeadlineInfo, Conference, AcceptanceRate } from "@/lib/pub-finder/types";
import { Skeleton } from "@/components/ui/skeleton";
import Masonry from "react-masonry-css";

export default function DeadlinePage() {
    const [loading, setLoading] = useState(true);
    const [deadlines, setDeadlines] = useState<DeadlineInfo[]>([]);
    const [conferenceData, setConferenceData] = useState<{ conferences: Conference[]; acceptances: AcceptanceRate[] }>({ conferences: [], acceptances: [] });

    useEffect(() => {
        const loadConferences = async () => {
            try {
                const data = await fetchConferenceData();
                setConferenceData(data);
                const upcomingDeadlines = getUpcomingDeadlines(data.conferences);
                setDeadlines(upcomingDeadlines);
            } catch (error) {
                console.error('Failed to load conference data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadConferences();
    }, []);

    return (
        <div className="container max-w-[1600px] px-4 lg:px-8 py-8">
            <h1 className="text-2xl font-bold mb-8">即将截止会议</h1>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(9).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-[200px]" />
                    ))}
                </div>
            ) : deadlines.length > 0 ? (
                <Masonry
                    breakpointCols={{
                        default: 3,
                        1600: 3,
                        1200: 2,
                        700: 1
                    }}
                    className="flex -ml-6 w-auto"
                    columnClassName="pl-6 bg-transparent"
                >
                    {deadlines.map((deadline) => (
                        <div key={deadline.title + deadline.deadline.toString()} className="mb-6">
                            <DetailedDeadlineCard
                                deadline={deadline}
                                acceptanceRate={findRecentAcceptanceRate(conferenceData.acceptances, deadline)}
                            />
                        </div>
                    ))}
                </Masonry>
            ) : (
                <div className="text-center text-muted-foreground mt-8">
                    暂无即将截止的会议
                </div>
            )}
        </div>
    );
}
