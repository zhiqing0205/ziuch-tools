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
    title: string;
    accept_rates: AcceptanceRateItem[];
}

export interface AcceptanceRateItem {
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
    comment?: string;
    diff: number;
    timezone?: string;
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
        question: "CCF推荐会议/期刊与SCI期刊有什么区别？",
        answer: "CCF推荐目录主要面向计算机科学领域，分为A、B、C三类，重点关注学术质量和创新性。SCI期刊范围更广，涵盖自然科学各领域，通过影响因子和分区评价期刊水平。CCF-A类会议/期刊通常代表领域最高水平，而SCI的Q1区期刊则表示在该领域处于前25%。两者评价体系独立但可能重叠，如部分CCF-A类期刊也是SCI Q1区期刊。"
    },
    {
        question: "如何理解JCR分区与中科院分区的差异？",
        answer: "JCR分区基于期刊影响因子，将同领域期刊按影响因子降序排列并等分为4区。中科院分区则采用更复杂的综合评价体系，除了影响因子，还考虑他引率、被引半衰期等多个指标，并分为基础版和升级版。升级版更能反映期刊的学术影响力，特别是对于快速发展的新兴交叉领域。一般而言，中科院一区期刊相当于或严于JCR的Q1区期刊。"
    },
    {
        question: "影响因子（IF）与五年影响因子有什么不同？",
        answer: "传统影响因子计算期刊前两年发表的论文在该年的平均被引次数，而五年影响因子则考虑前五年的数据。五年影响因子能更好地反映期刊的长期影响力，特别是对于成果发展周期较长的领域（如理论计算机科学）。五年影响因子通常更稳定，不容易受单一年份异常值的影响，但可能低估新兴领域期刊的实际影响力。"
    },
    {
        question: "如何看待期刊的预警信息？",
        answer: "中科院期刊预警是基于期刊近期表现的预警机制，主要关注：1) 影响因子大幅波动；2) 自引率异常；3) 引证期刊高度集中；4) 论文数量剧变等情况。被预警并不意味着期刊质量差，但提醒研究者需要谨慎评估。预警期刊可能存在引用操纵或其他不规范行为，投稿时建议结合具体领域和研究方向综合考虑。"
    }
];
