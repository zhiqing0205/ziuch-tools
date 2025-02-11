'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Image } from 'lucide-react';

interface UploadProps {
    onUpload: (file: File) => Promise<void>;
}

export function Upload({ onUpload }: UploadProps) {
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            await onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif']
        },
        maxFiles: 1,
    });

    return (
        <div className="space-y-4">
            <Alert>
                <AlertDescription>
                    支持拖拽或点击上传包含公式的图片文件。
                </AlertDescription>
            </Alert>

            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-8
                    flex flex-col items-center justify-center
                    cursor-pointer transition-colors
                    ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
                `}
            >
                <input {...getInputProps()} />
                <Image className="h-12 w-12 text-gray-400 mb-4" />
                <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {isDragActive ? '松开鼠标上传文件' : '拖拽文件到此处，或'}
                    </p>
                    <Button type="button" variant="secondary">
                        选择文件
                    </Button>
                </div>
            </div>
        </div>
    );
}
