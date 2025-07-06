'use client';

import React, { useState, useMemo } from 'react';
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { getAllFormulaRecords, deleteFormulaRecord } from '@/lib/latex-ocr/store';
import { FormulaRecord } from '@/lib/latex-ocr/types';

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<FormulaRecord[]>(() => getAllFormulaRecords());
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);

    const currentRecords = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return records.slice(start, start + ITEMS_PER_PAGE);
    }, [records, currentPage]);

    const handleDelete = async () => {
        if (deleteId) {
            await deleteFormulaRecord(deleteId);
            setRecords(records.filter(record => record.id !== deleteId));
            setDeleteId(null);
            router.refresh();
        }
    };

    const renderPaginationItems = () => {
        const items = [];
        const maxVisiblePages = 5;

        // 计算显示的页码范围
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // 添加首页
        if (startPage > 1) {
            items.push(
                <PaginationItem key="first">
                    <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                </PaginationItem>
            );
            if (startPage > 2) {
                items.push(
                    <PaginationItem key="ellipsis-start">
                        <PaginationEllipsis />
                    </PaginationItem>
                );
            }
        }

        // 添加中间页码
        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        onClick={() => setCurrentPage(i)}
                        isActive={currentPage === i}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        // 添加末页
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                items.push(
                    <PaginationItem key="ellipsis-end">
                        <PaginationEllipsis />
                    </PaginationItem>
                );
            }
            items.push(
                <PaginationItem key="last">
                    <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        return items;
    };

    return (
        <div className="container mx-auto px-6 py-6">
            <Card>
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-center mt-6">
                        <h1 className="text-2xl font-bold">历史记录</h1>
                        <Button variant="outline" asChild>
                            <Link href="/latex-ocr">返回</Link>
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>图片</TableHead>
                                <TableHead>公式</TableHead>
                                <TableHead>置信度</TableHead>
                                <TableHead>新增时间</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentRecords.map((record) => (
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

                    {totalPages > 1 && (
                        <div className="flex justify-center py-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            aria-disabled={currentPage === 1}
                                        />
                                    </PaginationItem>
                                    {renderPaginationItems()}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            aria-disabled={currentPage === totalPages}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </Card>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
