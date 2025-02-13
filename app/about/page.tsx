import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">关于项目</CardTitle>
                    {/* <CardDescription>LaTeX公式识别Web应用</CardDescription> */}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">技术栈</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><span className="font-medium">Next.js 14</span> - React框架，提供服务端渲染和路由功能</li>
                            <li><span className="font-medium">TypeScript</span> - 提供类型安全的JavaScript开发体验</li>
                            <li><span className="font-medium">Tailwind CSS</span> - 实用优先的CSS框架</li>
                            <li><span className="font-medium">shadcn/ui</span> - 基于Radix UI的精美组件库</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">核心功能</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>支持手写公式识别</li>
                            <li>支持截图公式识别</li>
                            <li>基于SimpleTex API提供高精度的公式识别服务</li>
                            <li>实时预览LaTeX渲染效果</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">API服务</h3>
                        <p>本项目使用 <a href="https://simpletex.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">SimpleTex</a> 提供的API服务进行公式识别。SimpleTex是一个专业的数学公式识别平台，提供高精度的手写和印刷体公式识别服务。</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
