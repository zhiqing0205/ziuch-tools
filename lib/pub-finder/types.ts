export interface Conference {
    title: string;
    description: string;
    sub: string;
    rank: {
        ccf?: string;
        core?: string;
        thcpl?: string;
    };
    dblp: string;
    confs: ConferenceInstance[];
}

export interface ConferenceInstance {
    year: number;
    id: string;
    link: string;
    timeline: {
        deadline: string;
        comment: string;
    }[];
    timezone: string;
    date: string;
    place: string;
}

export interface AcceptanceRate {
    year: number;
    submitted: number;
    accepted: number;
    str: string;
    rate: number;
    source: string;
}

export interface ConferenceAcceptance {
    title: string;
    accept_rates: AcceptanceRate[];
}

export const CONFERENCE_CATEGORIES: Record<string, string> = {
    'DS': '计算机体系结构/并行与分布计算/存储系统',
    'NW': '计算机网络',
    'SC': '网络与信息安全',
    'SE': '软件工程/系统软件/程序设计语言',
    'DB': '数据库/数据挖掘/内容检索',
    'CT': '计算机科学理论',
    'CG': '计算机图形学与多媒体',
    'AI': '人工智能',
    'HI': '人机交互与普适计算',
    'MX': '交叉/综合/新兴'
};

export interface DeadlineInfo {
    title: string;
    description: string;
    year: number;
    rank?: string;
    sub?: string;
    deadline: Date;
    link: string;
    comment: string;
    diff: number;
}

export interface RankInfo {
    uuid: string;
    abbName: string;
    oneRankText: string;
    twoRankText: string;
    threeRankText?: string;
}

export interface CustomRank {
    rankInfo: RankInfo[];
    rank: string[];
}

export interface OfficialRank {
    all: Record<string, string>;
    select: Record<string, string>;
}

export interface RankResponse {
    code: number;
    msg: string;
    data: {
        customRank: CustomRank;
        officialRank: OfficialRank;
    };
}

export interface RankData {
    [key: string]: string;
}

export const FAQ_ITEMS = [
    {
        question: "什么是CCF推荐会议/期刊？",
        answer: "CCF（中国计算机学会）推荐的国际学术会议和期刊目录是计算机领域重要的学术评价参考标准。分为A、B、C三类，其中A类为最高级别。"
    },
    {
        question: "什么是SCI期刊？",
        answer: "SCI（Science Citation Index）是科学引文索引，是国际上最权威的科技文献检索工具之一。被SCI收录是期刊质量的重要标志。"
    },
    {
        question: "什么是影响因子（IF）？",
        answer: "影响因子是期刊的平均被引用次数，反映期刊的学术影响力。计算方式为前两年发表的论文在该年的被引用次数除以论文总数。"
    },
    {
        question: "什么是中科院分区？",
        answer: "中科院分区是由中国科学院文献情报中心开发的期刊分区方法，将期刊分为1-4区，其中1区水平最高。分区依据包括期刊的影响因子、他引率等指标。"
    }
];
