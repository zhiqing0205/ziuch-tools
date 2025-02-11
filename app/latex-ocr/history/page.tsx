'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InlineMath } from 'react-katex';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { getAllFormulaRecords, deleteFormulaRecord } from '@/lib/latex-ocr/store';
import { FormulaRecord } from '@/lib/latex-ocr/types';

export default function HistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<FormulaRecord[]>(() => getAllFormulaRecords());
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteId) {
            await deleteFormulaRecord(deleteId);
            setRecords(records.filter(record => record.id !== deleteId));
            setDeleteId(null);
            router.refresh();
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">历史记录</h1>
                    <Button variant="outline" asChild>
                        <Link href="/latex-ocr">返回</Link>
                    </Button>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">图片</TableHead>
                                <TableHead className="text-center">公式</TableHead>
                                <TableHead className="text-center">置信度</TableHead>
                                <TableHead className="text-center">新增时间</TableHead>
                                <TableHead className="text-center">更新时间</TableHead>
                                <TableHead className="text-center">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>
                                        <img
                                            src={record.image}
                                            alt="Formula"
                                            className="max-h-16 object-contain"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-xs overflow-hidden">
                                            <InlineMath math={record.latex} />
                                        </div>
                                    </TableCell>
                                    <TableCell>{record.confidence.toFixed(1)}%</TableCell>
                                    <TableCell>
                                        {new Date(record.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(record.updatedAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={`/latex-ocr/detail/${record.id}`}>
                                                    详情
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setDeleteId(record.id)}
                                            >
                                                删除
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将永久删除该记录，且不可恢复。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>确认</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
