'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RankCard } from "@/components/pub-finder/rank-card";
import { DeadlineCard } from "@/components/pub-finder/deadline-card";
import { DetailedDeadlineCard } from "@/components/pub-finder/detailed-deadline-card";
import { SearchHistory, addSearchHistory } from "@/components/pub-finder/search-history";
import { getPublicationRank } from "@/app/api/pub-finder";
import { fetchConferenceData, getUpcomingDeadlines, searchConferenceDeadlines, findRecentAcceptanceRate } from "@/lib/pub-finder/conference";
import { DeadlineInfo } from "@/lib/pub-finder/types";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Conference, RankResponse, RankData, FAQ_ITEMS, AcceptanceRate } from "@/lib/pub-finder/types";
import { Suspense } from "react"

// 期刊排名字段映射表
const RANK_FIELD_MAP: Record<string, string> = {
    // swufe: "西南财经大学",
    // cufe: "中央财经大学",
    // uibe: "对外经济贸易大学",
    // sdufe: "山东财经大学",
    // xdu: "西安电子科技大学",
    // swjtu: "西南交通大学",
    // ruc: "中国人民大学",
    // xmu: "厦门大学",
    // sjtu: "上海交通大学",
    // fdu: "复旦大学",
    // hhu: "河海大学",
    // pku: "北大核心",
    // scu: "四川大学",
    // cqu: "重庆大学",
    // nju: "南京大学",
    // xju: "新疆大学",
    // cug: "中国地质大学",
    ccf: "CCF中国计算机学会",
    // cju: "长江大学",
    // zju: "浙江大学",
    // zhongguokejihexin: "中国科技核心期刊",
    // fms: "FMS",
    // utd24: "UTD24",
    eii: "EI检索",
    // cssci: "南大核心",
    sciUpTop: "中科院升级版Top分区",
    sciif: "SCI影响因子-JCR",
    sci: "SCI分区-JCR",
    ssci: "SSCI分区-JCR",
    jci: "JCI指数-JCR",
    sciif5: "SCI五年影响因子-JCR",
    sciwarn: "中科院预警",
    sciBase: "SCI基础版分区-中科院",
    sciUp: "SCI升级版分区-中科院",
    // ajg: "ABS学术期刊指南",
    // ft50: "FT50",
    // cscd: "中国科学引文数据库",
    // ahci: "A&HCI",
    // esi: "ESI学科分类",
    // cpu: "中国药科大学",
    sciUpSmall: "中科院升级版小类分区"
};

const RANK_VALUE_MAP: Record<string, Record<string, string>> = {
    'sci': {
        'Q1': '1区',
        'Q2': '2区',
        'Q3': '3区',
        'Q4': '4区'
    },
    'jcr': {
        'Q1': '1区',
        'Q2': '2区',
        'Q3': '3区',
        'Q4': '4区'
    }
};

export default function PubFinderPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [rankData, setRankData] = useState<Record<string, string> | null>(null);
    const [deadlines, setDeadlines] = useState<DeadlineInfo[]>([]);
    const [loadingDeadlines, setLoadingDeadlines] = useState(true);
    const [searchDeadlines, setSearchDeadlines] = useState<DeadlineInfo[]>([]);
    const [conferenceData, setConferenceData] = useState<{ conferences: Conference[]; acceptances: AcceptanceRate[] }>({ conferences: [], acceptances: [] });
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    // const location = useLocation();

    // 加载会议数据
    useEffect(() => {
        async function loadConferences() {
            try {
                const data = await fetchConferenceData();
                setConferenceData(data);
                const upcomingDeadlines = getUpcomingDeadlines(data.conferences);
                setDeadlines(upcomingDeadlines.slice(0, 10));
            } catch (error) {
                console.error('Failed to load conference data:', error);
            } finally {
                setLoadingDeadlines(false);
            }
        }
        loadConferences();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            loadConferences();
        }, 60000); // 每分钟更新一次
        return () => clearInterval(timer);
    }, []);

    // 监听路径变化，重置搜索状态
    useEffect(() => {
        if (pathname === '/pub-finder' && !searchParams.get('query')) {
            setSearchTerm('');
            setHasSearched(false);
            setRankData(null);
            setSearchDeadlines([]);
        }
    }, [pathname, searchParams]);

    // 检查 URL 参数并执行搜索
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('query');
        // console.log("searchQuery", searchQuery);
        if (searchQuery) {
            setSearchTerm(searchQuery);
            handleSearch(searchQuery);
            setHasSearched(true);
        } else {
            setHasSearched(false);
        }

        // 从localStorage加载搜索历史
        const history = localStorage.getItem('searchHistory');
        if (history) {
            setSearchHistory(JSON.parse(history));
        }
    }, []);

    const processCustomRank = (customRank: any) => {
        const result: Record<string, string> = {};
        customRank.rank.forEach(rankStr => {
            const [uuid, rank] = rankStr.split('&&&');
            const rankInfo = customRank.rankInfo.find(info => info.uuid === uuid);
            if (!rankInfo) return;

            let rankText = '';
            switch (rank) {
                case '1': rankText = rankInfo.oneRankText; break;
                case '2': rankText = rankInfo.twoRankText; break;
                case '3': rankText = rankInfo.threeRankText || ''; break;
                default: return;
            }
            result[rankInfo.abbName.toLowerCase()] = rankText;
        });
        return result;
    };

    const formatRankValue = (key: string, value: string) => {
        const rankMap = RANK_VALUE_MAP[key.toLowerCase()];
        return rankMap ? rankMap[value] || value : value;
    };

    const handleSearch = async (term: string = searchTerm) => {
        if (!term.trim()) {
            toast({
                title: "请输入期刊或会议名称",
                description: "搜索内容不能为空",
                variant: "destructive",
            });
            return;
        }

        // 更新 URL
        router.push(`${pathname}?query=${encodeURIComponent(term)}`);

        setLoading(true);
        setHasSearched(true);

        try {
            addSearchHistory(term);
            const data = await getPublicationRank(term);

            if (data.code === 200 && data.data) {
                let dataValue = data.data.officialRank.all;
                if (dataValue != undefined) {
                    // 只显示在RANK_FIELD_MAP内的数据
                    dataValue = Object.fromEntries(
                        Object.entries(dataValue).filter(([key]) => RANK_FIELD_MAP[key])
                    );
                }

                const customRanks = processCustomRank(data.data.customRank);
                const combinedRanks = { ...dataValue, ...customRanks };

                // 格式化分区显示
                const formattedRanks = Object.entries(combinedRanks).reduce((acc, [key, value]) => {
                    acc[key] = formatRankValue(key, value);
                    return acc;
                }, {} as Record<string, string>);

                if (Object.keys(formattedRanks).length === 0) {
                    toast({
                        title: "未找到等级信息",
                        description: "该期刊/会议暂无等级信息",
                    });
                }

                setRankData(formattedRanks);

                console.log("conferenceData", conferenceData);
                // 搜索会议信息
                if (conferenceData.conferences.length > 0) {
                    const matchedDeadlines = searchConferenceDeadlines(conferenceData.conferences, term);
                    setSearchDeadlines(matchedDeadlines);
                }
            } else {
                toast({
                    title: "查询失败",
                    description: data.msg || "未找到相关数据",
                    variant: "destructive",
                });
                setRankData(null);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "查询失败",
                description: "网络请求错误",
                variant: "destructive",
            });
            setRankData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <Suspense>
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                    {/* 左侧会议信息 - 在移动设备上隐藏 */}
                    {!hasSearched && (
                        <div className="hidden lg:block space-y-3 self-center">
                            {loadingDeadlines ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Skeleton key={i} className="h-[120px]" />
                                ))
                            ) : deadlines.slice(0, 3).map((deadline) => (
                                <DeadlineCard
                                    key={deadline.title + deadline.deadline.toString()}
                                    deadline={deadline}
                                />
                            ))}
                        </div>
                    )}

                    {/* 中间搜索区域 */}
                    <div className={cn(
                        "max-w-2xl mx-auto w-full transition-all duration-500",
                        hasSearched ? "pt-6 lg:col-span-2" : "pt-[5vh]"
                    )}>
                        {!hasSearched && (
                            <div className="flex justify-center mb-8">
                                <Image
                                    src="https://img.ziuch.top/i/2025/02/14/vmhgnu.png"
                                    alt="Logo"
                                    width={180}
                                    height={180}
                                    priority
                                    loader={() => "https://img.ziuch.top/i/2025/02/14/vmhgnu.png"}
                                />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="请输入期刊或会议名称..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="flex-1"
                            />
                            <Button onClick={() => handleSearch()} disabled={loading}>
                                {loading ? (
                                    "查询中..."
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        查询
                                    </>
                                )}
                            </Button>
                        </div>

                        <SearchHistory
                            onSelect={handleSearch}
                            visible={!hasSearched && !loading}
                            history={searchHistory}
                        />

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                                {Array(6).fill(0).map((_, i) => (
                                    <Skeleton key={i} className="h-[100px]" />
                                ))}
                            </div>
                        ) : rankData && Object.keys(rankData).length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                                    {Object.entries(rankData).map(([key, value]) => (
                                        <RankCard
                                            key={key}
                                            title={RANK_FIELD_MAP[key] || key}
                                            value={value}
                                        />
                                    ))}
                                </div>
                                {searchDeadlines.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-lg font-semibold mb-4">相关会议截止时间</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {searchDeadlines.map((deadline) => (
                                                <DetailedDeadlineCard
                                                    key={deadline.title + deadline.deadline.toString()}
                                                    deadline={deadline}
                                                    acceptanceRate={findRecentAcceptanceRate(conferenceData.acceptances, deadline.title)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}

                        {/* 移动设备上的会议信息 */}
                        {!hasSearched && (
                            <div className="lg:hidden mt-8 mb-4">
                                <div className="text-sm font-medium mb-2">即将截止会议</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {loadingDeadlines ? (
                                        Array(6).fill(0).map((_, i) => (
                                            <Skeleton key={i} className="h-[120px]" />
                                        ))
                                    ) : deadlines.map((deadline) => (
                                        <DeadlineCard
                                            key={deadline.title + deadline.deadline.toString()}
                                            deadline={deadline}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧常见问题 */}
                    {hasSearched && (
                        <div className="hidden lg:block mt-8">
                            <h3 className="text-lg font-semibold mb-4">常见问题</h3>
                            <Accordion type="single" collapsible className="w-full">
                                {FAQ_ITEMS.map((item, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger>{item.question}</AccordionTrigger>
                                        <AccordionContent>{item.answer}</AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    )}

                    {/* 右侧会议信息 - 在移动设备上隐藏 */}
                    {!hasSearched && (
                        <div className="hidden lg:block space-y-3 self-center">
                            {loadingDeadlines ? (
                                Array(3).fill(0).map((_, i) => (
                                    <Skeleton key={i} className="h-[120px]" />
                                ))
                            ) : deadlines.slice(3, 6).map((deadline) => (
                                <DeadlineCard
                                    key={deadline.title + deadline.deadline.toString()}
                                    deadline={deadline}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Suspense>
    );
}
