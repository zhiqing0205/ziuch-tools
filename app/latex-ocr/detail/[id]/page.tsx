'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormulaRecord } from '@/lib/latex-ocr/types';
import { getAllFormulaRecords, getFormulaRecordById, deleteFormulaRecord } from '@/lib/latex-ocr/store';
import { InlineMath } from 'react-katex';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DetailPage({ params }: { params: { id: string } }) {
    const [record, setRecord] = useState<FormulaRecord | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const foundRecord = getFormulaRecordById(params.id);
        if (foundRecord) {
            setRecord(foundRecord);
        }
    }, [params.id]);

    const handleDelete = () => {
        if (record) {
            deleteFormulaRecord(record.id);
            router.push('/history');
        }
    };

    if (!record) {
        return <div className="container mx-auto py-8">记录不存在</div>;
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                >
                    返回
                </Button>
                <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除记录
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>公式详情</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2">原始图片</h3>
                        <img
                            src={record.image}
                            alt="公式图片"
                            className="max-w-[400px] h-auto border rounded-lg"
                        />
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-2">识别结果</h3>
                        <div className="bg-white rounded-lg border p-4">
                            <InlineMath math={record.latex} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-2">LaTeX 代码</h3>
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                            {record.latex}
                        </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">置信度</h3>
                            <p>{record.confidence.toFixed(1)}%</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">创建时间</h3>
                            <p>{formatDate(record.createdAt)}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">更新时间</h3>
                            <p>{formatDate(record.updatedAt)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将永久删除该记录，且不可恢复。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}