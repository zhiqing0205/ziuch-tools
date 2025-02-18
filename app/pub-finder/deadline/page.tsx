'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchConferenceData, getUpcomingDeadlines, findRecentAcceptanceRate } from "@/lib/pub-finder/conference";
import { DetailedDeadlineCard } from "@/components/pub-finder/detailed-deadline-card";
import { DeadlineInfo, Conference, AcceptanceRate, CONFERENCE_CATEGORIES } from "@/lib/pub-finder/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Masonry from "react-masonry-css";

const RANK_OPTIONS = [
    { value: 'ALL', label: '全部' },
    { value: 'A', label: 'CCF A' },
    { value: 'B', label: 'CCF B' },
    { value: 'C', label: 'CCF C' },
    { value: 'N', label: '非CCF' },
];

export default function DeadlinePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [deadlines, setDeadlines] = useState<DeadlineInfo[]>([]);
    const [filteredDeadlines, setFilteredDeadlines] = useState<DeadlineInfo[]>([]);
    const [conferenceData, setConferenceData] = useState<{ conferences: Conference[]; acceptances: AcceptanceRate[] }>({ conferences: [], acceptances: [] });
    
    // 修改初始状态，只选中 ALL
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['ALL']);
    const [selectedRanks, setSelectedRanks] = useState<string[]>(['ALL']);

    // 处理领域筛选变化
    const handleCategoryChange = (checked: boolean | "indeterminate", key: string) => {
        if (key === 'ALL') {
            if (checked) {
                // 选中全选时，只保留 ALL
                setSelectedCategories(['ALL']);
            } else {
                setSelectedCategories([]);
            }
        } else {
            let newCategories: string[];
            if (checked) {
                // 选中其他选项时，移除 ALL
                newCategories = [...selectedCategories.filter(k => k !== 'ALL'), key];
            } else {
                newCategories = selectedCategories.filter(k => k !== key);
            }
            setSelectedCategories(newCategories);
        }
    };

    // 处理等级筛选变化
    const handleRankChange = (value: string[]) => {
        if (value.includes('ALL') && !selectedRanks.includes('ALL')) {
            // 从其他状态选中 ALL 时，只保留 ALL
            setSelectedRanks(['ALL']);
        } else if (selectedRanks.includes('ALL')) {
            // 当前有 ALL，切换到其他选项时，移除 ALL
            setSelectedRanks(value.filter(v => v !== 'ALL'));
        } else {
            // 正常多选
            setSelectedRanks(value);
        }
    };

    useEffect(() => {
        const loadConferences = async () => {
            try {
                const data = await fetchConferenceData();
                setConferenceData(data);
                const upcomingDeadlines = getUpcomingDeadlines(data.conferences);
                setDeadlines(upcomingDeadlines);
                setFilteredDeadlines(upcomingDeadlines);
            } catch (error) {
                console.error('Failed to load conference data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadConferences();
    }, []);

    // 修改筛选逻辑
    useEffect(() => {
        const filtered = deadlines.filter(deadline => {
            const categoryMatch = selectedCategories.includes('ALL') || 
                (deadline.sub && selectedCategories.includes(deadline.sub));
            const rankMatch = selectedRanks.includes('ALL') || 
                (deadline.rank && selectedRanks.includes(deadline.rank));
            return categoryMatch && rankMatch;
        });
        setFilteredDeadlines(filtered);
    }, [selectedCategories, selectedRanks, deadlines]);

    return (
        <div className="container max-w-[1600px] px-4 lg:px-8 py-8">
            {/* 返回按钮 */}
            <Button
                variant="ghost"
                className="mb-4 -ml-2 hover:bg-transparent"
                onClick={() => router.push('/pub-finder')}
            >
                <ChevronLeft className="mr-2 h-4 w-4" />
                返回
            </Button>

            <h1 className="text-2xl font-bold mb-8">即将截止会议</h1>
            
            {/* 筛选区域 */}
            <div className="mb-8 space-y-6">
                {/* 领域筛选 */}
                <div className="space-y-2">
                    <Label className="text-base font-semibold">领域筛选</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ALL"
                                checked={selectedCategories.includes('ALL')}
                                onCheckedChange={(checked) => handleCategoryChange(checked, 'ALL')}
                            />
                            <Label htmlFor="ALL" className="text-sm font-medium">全部领域</Label>
                        </div>
                        {Object.entries(CONFERENCE_CATEGORIES).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                    id={key}
                                    checked={selectedCategories.includes(key)}
                                    onCheckedChange={(checked) => handleCategoryChange(checked, key)}
                                />
                                <Label htmlFor={key} className="text-sm">{value}</Label>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* 等级筛选 - 修改样式 */}
                <div className="space-y-2">
                    <Label className="text-base font-semibold">CCF等级筛选</Label>
                    <ToggleGroup 
                        type="multiple" 
                        value={selectedRanks}
                        onValueChange={handleRankChange}
                        className="flex flex-wrap gap-2"
                    >
                        {RANK_OPTIONS.map((rank) => (
                            <ToggleGroupItem 
                                key={rank.value} 
                                value={rank.value}
                                className="data-[state=on]:bg-primary/20 data-[state=on]:text-primary hover:bg-primary/10"
                            >
                                {rank.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            </div>

            {/* 会议列表 */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(9).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-[200px]" />
                    ))}
                </div>
            ) : filteredDeadlines.length > 0 ? (
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
                    {filteredDeadlines.map((deadline) => (
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
                    暂无符合筛选条件的会议
                </div>
            )}
        </div>
    );
}
