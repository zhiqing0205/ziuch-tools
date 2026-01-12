import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
    return (
        <div className="container mx-auto px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold">关于 Ziuch Tools</h1>

                <Card>
                    <CardHeader className="space-y-2">
                        <CardTitle>功能概览</CardTitle>
                        <CardDescription>Ziuch Tools 是一个面向学术场景的在线工具集。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                            <li>
                                <span className="font-medium text-foreground">文献查询</span>
                                {" - "}
                                查询期刊/会议排名，追踪会议截止时间
                            </li>
                            <li>
                                <span className="font-medium text-foreground">公式识别</span>
                                {" - "}
                                基于图像识别的 LaTeX 公式转换工具
                            </li>
                            <li>
                                <span className="font-medium text-foreground">学术日历</span>
                                {" - "}
                                可视化展示全年学术会议与时间线，支持导出图片
                            </li>
                            <li>
                                <span className="font-medium text-foreground">科研绘图</span>
                                {" - "}
                                使用 Gemini 图像模型生成科研风格图像，支持参考图与多轮对话
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="space-y-2">
                        <CardTitle>数据与隐私</CardTitle>
                        <CardDescription>默认仅在本地保存，不会上传你的生图 API Key。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p>
                            大部分历史记录与配置会保存在浏览器本地（LocalStorage/IndexedDB），用于便捷使用。
                        </p>
                        <p>
                            使用“科研绘图”上传参考图/生成图片时，图片会上传到配置的图床并返回直链。
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
