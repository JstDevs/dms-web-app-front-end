import React, { useRef, useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading, error, refreshNotifications } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const resolveNotificationPath = (notif: any): string | null => {
        // If it's a comment or collaboration, prioritize going to the document
        const link = notif.link || '';

        // 1. Try to extract Document ID from various link formats
        // Format A: /documents/view-document/LINK_ID/DOCUMENT_ID/...
        // Format B: /documents/141
        // Format C: any string containing /document/ followed by numbers

        const docIdMatch = link.match(/\/documents\/view-document\/[^/]+\/(\d+)/) ||
            link.match(/\/documents\/(\d+)/) ||
            link.match(/\/document\/(\d+)/);

        if (docIdMatch && docIdMatch[1]) {
            const docId = docIdMatch[1];
            // If it's a comment, add the tab parameter
            if (notif.type === 'COMMENT') {
                return `/documents/${docId}?tab=collaboration`;
            }
            return `/documents/${docId}`;
        }

        // 2. If no Match but we have metadata
        if (notif.metadata?.documentId) {
            return `/documents/${notif.metadata.documentId}${notif.type === 'COMMENT' ? '?tab=collaboration' : ''}`;
        }

        // 3. Fallback to the link provided if it looks like an internal path
        if (link.startsWith('/')) {
            return link;
        }

        return null;
    };

    const handleNotificationClick = async (id: string, notif: any) => {
        await markAsRead(id);
        const targetPath = resolveNotificationPath(notif);
        if (targetPath) {
            setIsOpen(false);
            navigate(targetPath);
        }
    };

    const getNotificationIcon = (type: string) => {
        // You can add different icons based on type here
        return <Bell className="h-5 w-5 text-blue-500" />;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative transition-all"
                aria-label="Notifications"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] bg-white ring-1 ring-gray-200 z-50 animate-fade-in overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-800">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            >
                                <Check className="h-3 w-3" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {error ? (
                            <div className="flex flex-col items-center justify-center py-8 text-red-500 p-4 text-center">
                                <p className="text-sm font-semibold">Unable to load notifications</p>
                                <p className="text-xs mt-1 text-gray-500">Please check your connection or try again later.</p>
                                <button
                                    onClick={() => refreshNotifications()}
                                    className="mt-3 text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 hover:bg-red-100"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : loading && notifications.length === 0 ? (
                            <div className="flex justify-center items-center py-8 text-gray-400">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span className="text-sm">Loading...</span>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n.id, n)}
                                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors relative group ${!n.read ? "bg-blue-50/50" : ""
                                            }`}
                                    >
                                        {!n.read && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-full bg-blue-500 rounded-r"></div>
                                        )}
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1.5 flex justify-between items-center">
                                                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                                                    {!n.read && <span className="text-blue-600 font-medium text-[10px]">New</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="bg-gray-100 p-3 rounded-full mb-3">
                                    <Bell className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-900">No notifications yet</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    We'll notify you when something important happens.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
                        <button className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
