import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface MarkdownProps extends React.HTMLAttributes<HTMLDivElement> {
    content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className, ...props }) => (
    <div className={`markdown-body ${className ? className : ''}`} {...props}>
        <ReactMarkdown>{content}</ReactMarkdown>
    </div>
);

export default Markdown;
