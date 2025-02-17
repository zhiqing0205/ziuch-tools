import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
    return (
        <div className="container mx-auto px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold">关于 Ziuch Tools</h1>
                <p className="text-muted-foreground">
                    Ziuch Tools 是一个在线工具集，目前提供以下功能：
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>
                        <span className="font-medium text-foreground">文献查询</span>
                        {" - "}
                        查询期刊排名，追踪会议截止时间
                    </li>
                    <li>
                        <span className="font-medium text-foreground">公式识别</span>
                        {" - "}
                        基于图像识别的 LaTeX 公式转换工具
                    </li>
                </ul>
                <p className="text-sm text-muted-foreground pt-4">
                    2024 Ziuch Tools. All rights reserved.
                </p>
            </div>
        </div>
    );
}
