import { MessageType, MessageDestination } from '@extension/shared/lib/types/runtime';

export interface FileMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: Date;
    status: 'uploading' | 'completed' | 'error';
    progress?: number;
}

class FileService {
    private files: Map<string, FileMetadata> = new Map();

    async uploadFile(file: File): Promise<FileMetadata> {
        const fileId = crypto.randomUUID();
        const metadata: FileMetadata = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            status: 'uploading',
            progress: 0,
        };

        this.files.set(fileId, metadata);

        try {
            // TODO: Implement actual file upload to backend
            // For now, we'll simulate an upload
            await this.simulateUpload(fileId);

            metadata.status = 'completed';
            metadata.progress = 100;
            this.files.set(fileId, metadata);

            // Notify background script about new file
            chrome.runtime.sendMessage({
                type: MessageType.FILE_UPLOAD,
                to: MessageDestination.background,
                data: metadata,
            });

            return metadata;
        } catch (error) {
            metadata.status = 'error';
            this.files.set(fileId, metadata);
            throw error;
        }
    }

    private async simulateUpload(fileId: string): Promise<void> {
        const steps = 10;
        const stepTime = 500; // 0.5 second per step

        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            const progress = (i / steps) * 100;
            const metadata = this.files.get(fileId);
            if (metadata) {
                metadata.progress = progress;
                this.files.set(fileId, { ...metadata });
            }
        }
    }

    getFiles(): FileMetadata[] {
        return Array.from(this.files.values());
    }

    getFile(id: string): FileMetadata | undefined {
        return this.files.get(id);
    }

    deleteFile(id: string): boolean {
        return this.files.delete(id);
    }
}

export const fileService = new FileService();
