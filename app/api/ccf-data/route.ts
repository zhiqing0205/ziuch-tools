import { NextResponse } from 'next/server';
import { load } from 'js-yaml';

export async function GET() {
    try {
        console.log('API: 开始获取CCF数据...');
        
        // 并行请求两个远程数据源，添加缓存控制头部
        const [confResponse, accResponse] = await Promise.all([
            fetch('https://ccfddl.com/conference/allconf.yml', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            }),
            fetch('https://ccfddl.com/conference/allacc.yml', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            })
        ]);

        // 检查响应状态
        if (!confResponse.ok || !accResponse.ok) {
            console.error('API: 远程请求失败', {
                confStatus: confResponse.status,
                accStatus: accResponse.status
            });
            return NextResponse.json({ 
                error: '远程数据获取失败', 
                details: `Conference: ${confResponse.status}, Acceptance: ${accResponse.status}` 
            }, { status: 502 });
        }

        // 获取YAML文本
        const [confYaml, accYaml] = await Promise.all([
            confResponse.text(),
            accResponse.text()
        ]);

        console.log('API: YAML文本获取成功', {
            confLength: confYaml.length,
            accLength: accYaml.length
        });

        // 解析YAML
        let conferences, acceptances;
        try {
            conferences = load(confYaml);
            acceptances = load(accYaml);
        } catch (yamlError) {
            console.error('API: YAML解析失败', yamlError);
            return NextResponse.json({ 
                error: 'YAML解析失败', 
                details: yamlError instanceof Error ? yamlError.message : 'Unknown error' 
            }, { status: 500 });
        }

        // 验证解析结果
        if (!Array.isArray(conferences) || !Array.isArray(acceptances)) {
            console.error('API: 解析的数据不是数组格式', {
                conferencesType: typeof conferences,
                conferencesIsArray: Array.isArray(conferences),
                acceptancesType: typeof acceptances,
                acceptancesIsArray: Array.isArray(acceptances)
            });
            return NextResponse.json({ 
                error: '数据格式错误', 
                details: '解析的数据不是数组格式' 
            }, { status: 500 });
        }

        console.log('API: 数据解析成功', {
            conferencesCount: conferences.length,
            acceptancesCount: acceptances.length,
            timestamp: new Date().toISOString()
        });

        // 返回成功的数据，添加时间戳
        return NextResponse.json({
            success: true,
            data: {
                conferences,
                acceptances
            },
            timestamp: Date.now(),
            fetchTime: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

    } catch (error) {
        console.error('API: 获取CCF数据时发生错误', error);
        return NextResponse.json({ 
            error: '服务器内部错误', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}