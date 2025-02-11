'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormulaRecord } from '@/lib/types';
import { getPaginatedRecords, deleteFormulaRecord } from '@/lib/store';
import { InlineMath } from 'react-katex';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 15;

export default function HistoryPage() {
    const [records, setRecords] = useState<FormulaRecord[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();

    const refreshRecords = useCallback(() => {
        const { records, total } = getPaginatedRecords(currentPage, PAGE_SIZE);
        setRecords(records);
        setTotalRecords(total);
    }, [currentPage]);

    useEffect(() => {
        refreshRecords();
    }, [currentPage, refreshRecords]);

    const handleDelete = (id: string) => {
        deleteFormulaRecord(id);
        refreshRecords();
        setDeleteId(null);
    };

    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">历史记录</h1>

            <div className="rounded-md border">
                <Table>
                    <TableCaption>共 {totalRecords} 条记录</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>预览</TableHead>
                            <TableHead>公式</TableHead>
                            <TableHead>置信度</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead>更新时间</TableHead>
                            <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell>
                                    <img
                                        src={record.image}
                                        alt="公式图片"
                                        className="w-20 h-auto"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-[200px] overflow-hidden">
                                        <InlineMath math={record.latex} />
                                    </div>
                                </TableCell>
                                <TableCell>{record.confidence.toFixed(1)}%</TableCell>
                                <TableCell>{formatDate(record.createdAt)}</TableCell>
                                <TableCell>{formatDate(record.updatedAt)}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            onClick={() => router.push(`/detail/${record.id}`)}
                                            variant="secondary"
                                            size="sm"
                                        >
                                            查看详情
                                        </Button>
                                        <Button
                                            onClick={() => setDeleteId(record.id)}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-center">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => handlePageChange(currentPage - 1)}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    onClick={() => handlePageChange(page)}
                                    isActive={currentPage === page}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => handlePageChange(currentPage + 1)}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将永久删除该记录，且不可恢复。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
