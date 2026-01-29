import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Folder, ChevronRight, ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FolderSidebarProps {
    departments: any[];
    currentDeptId?: string;
    currentSubDeptId?: string;
}

const DroppableFolder: React.FC<{
    label: string;
    deptId: string;
    subDeptId: string;
    isActive: boolean;
}> = ({ label, deptId, subDeptId, isActive }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `drop-${deptId}-${subDeptId}`,
        data: {
            deptId,
            subDeptId,
            label
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all text-sm min-h-[44px]",
                isOver ? "bg-blue-100 border-2 border-dashed border-blue-400 scale-[1.02] shadow-sm" : "hover:bg-gray-100",
                isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600"
            )}
        >
            <Folder className={cn("w-4 h-4 flex-shrink-0", isOver ? "text-blue-600 animate-bounce" : isActive ? "text-blue-500" : "text-gray-400")} />
            <span className="truncate">{label}</span>
        </div>
    );
};

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
    departments,
    currentDeptId,
    currentSubDeptId
}) => {
    const [expandedDepts, setExpandedDepts] = React.useState<Record<string, boolean>>({});

    // Automatically expand the current department
    React.useEffect(() => {
        if (currentDeptId) {
            setExpandedDepts(prev => ({ ...prev, [currentDeptId]: true }));
        }
    }, [currentDeptId]);

    const toggleDept = (id: string) => {
        setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Library Folders
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-medium">Drag documents to move</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {departments?.map((dept) => (
                    <div key={dept.ID} className="space-y-1">
                        <button
                            onClick={() => toggleDept(String(dept.ID))}
                            className={cn(
                                "flex items-center w-full gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-left",
                                currentDeptId === String(dept.ID) ? "text-blue-600" : "text-gray-700"
                            )}
                        >
                            {expandedDepts[String(dept.ID)] ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{dept.Name}</span>
                        </button>

                        {expandedDepts[String(dept.ID)] && (
                            <div className="ml-4 pl-2 border-l border-gray-100 space-y-1 mt-1">
                                {dept.SubDepartments && dept.SubDepartments.length > 0 ? (
                                    dept.SubDepartments.map((sub: any) => (
                                        <DroppableFolder
                                            key={sub.ID}
                                            label={sub.Name}
                                            deptId={String(dept.ID)}
                                            subDeptId={String(sub.ID)}
                                            isActive={currentDeptId === String(dept.ID) && currentSubDeptId === String(sub.ID)}
                                        />
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 p-2 italic">No document types</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
