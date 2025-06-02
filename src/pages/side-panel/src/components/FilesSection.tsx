import React, { useState, useCallback, useEffect } from 'react';
import { fileService, FileMetadata } from '../services/FileService';

interface FilesSectionProps {
    isLight: boolean;
}

export const FilesSection: React.FC<FilesSectionProps> = ({ isLight }) => {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        setFiles(fileService.getFiles());
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);

        for (const file of droppedFiles) {
            try {
                const metadata = await fileService.uploadFile(file);
                setFiles(prev => [...prev, metadata]);
            } catch (error) {
                console.error('Error uploading file:', error);
                // TODO: Show error notification
            }
        }
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDelete = (id: string) => {
        fileService.deleteFile(id);
        setFiles(prev => prev.filter(file => file.id !== id));
    };

    return (
        <div className={`p-4 ${isLight ? 'bg-gray-50' : 'bg-gray-900'}`}>
            <div
                className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-colors
                    ${
                        isDragging
                            ? `${isLight ? 'border-purple-500 bg-purple-50' : 'border-purple-500 bg-purple-900 bg-opacity-20'}`
                            : `${
                                  isLight
                                      ? 'border-gray-300 hover:border-purple-400'
                                      : 'border-gray-700 hover:border-purple-500'
                              }`
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}>
                <div className="text-center">
                    <svg
                        className={`w-12 h-12 mx-auto mb-3 ${
                            isDragging ? 'text-purple-500' : isLight ? 'text-gray-400' : 'text-white'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <p className={`mb-2 text-sm ${isLight ? 'text-gray-500' : 'text-white'}`}>
                        <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white'}`}>Any file type accepted</p>
                </div>
            </div>

            <div className="space-y-3">
                {files.map(file => (
                    <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg shadow-sm border ${
                            isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
                        }`}>
                        <div className="flex items-center space-x-3">
                            <div
                                className={`p-2 rounded-lg ${
                                    isLight ? 'bg-purple-50' : 'bg-purple-900 bg-opacity-30'
                                }`}>
                                <svg
                                    className="w-6 h-6 text-purple-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                    {file.name}
                                </p>
                                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white'}`}>
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {file.status === 'uploading' && (
                                <div className={`w-24 h-2 rounded-full ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${file.progress}%` }}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => handleDelete(file.id)}
                                className={`p-1 rounded-full transition-colors ${
                                    isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                                }`}>
                                <svg
                                    className={`w-5 h-5 ${isLight ? 'text-gray-500' : 'text-white'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
