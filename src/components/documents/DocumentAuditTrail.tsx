import React, { useState } from 'react';
import { AuditTrail, CurrentDocument } from '@/types/Document';
import { format } from 'date-fns';
import {
  Clock,
  Search,
  UserCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@chakra-ui/react';

interface DocumentAuditTrailProps {
  document: CurrentDocument | null;
}

const DocumentAuditTrail: React.FC<DocumentAuditTrailProps> = ({
  document,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });

  if (!document) return null;

  // Sort audit trails by date
  const allAuditEntries: AuditTrail[] = document.auditTrails.sort(
    (a, b) =>
      new Date(b.ActionDate).getTime() - new Date(a.ActionDate).getTime()
  );

  // Filter entries based on search and filters
  const filteredEntries = allAuditEntries.filter((entry) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !entry.Action.toLowerCase().includes(searchLower) &&
        !entry.actor.userName.toLowerCase().includes(searchLower) &&
        !(entry.Description?.toLowerCase().includes(searchLower) ?? false)
      ) {
        return false;
      }
    }

    // User filter
    if (selectedUser && entry.actor.id.toString() !== selectedUser) {
      return false;
    }

    // Action filter
    if (selectedAction && entry.Action !== selectedAction) {
      return false;
    }

    // Date range filter
    // const actionDate = new Date(entry.ActionDate);
    // if (dateRange.from && actionDate <= new Date(dateRange.from)) {
    //   return false;
    // }
    // if (dateRange.to && actionDate >= new Date(dateRange.to)) {
    //   return false;
    // }
    const actionDate = new Date(entry.ActionDate);
    const actionDateOnly = new Date(
      actionDate.getFullYear(),
      actionDate.getMonth(),
      actionDate.getDate()
    );

    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      const fromDateOnly = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate()
      );
      if (actionDateOnly < fromDateOnly) {
        return false;
      }
    }

    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      const toDateOnly = new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate() + 1
      ); // +1 to include the entire day
      if (actionDateOnly >= toDateOnly) {
        return false;
      }
    }
    return true;
  });

  // Get unique users and actions for filters
  const uniqueUsers = Array.from(
    new Set(
      allAuditEntries.map((entry) => {
        console.log({ entry });
        return entry.actor.id.toString();
      })
    )
  );
  // console.log({ uniqueUsers });
  const uniqueUserNames = allAuditEntries.reduce((acc, entry) => {
    if (!acc.some((user) => user.id === entry.actor.id.toString())) {
      acc.push({ id: entry.actor.id.toString(), name: entry.actor.userName });
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  const uniqueActions = Array.from(
    new Set(allAuditEntries.map((entry) => entry.Action))
  );

  // Group entries by date
  const entriesByDate: { [date: string]: AuditTrail[] } = {};
  filteredEntries.forEach((entry) => {
    const date = format(new Date(entry.ActionDate), 'yyyy-MM-dd');
    if (!entriesByDate[date]) {
      entriesByDate[date] = [];
    }
    entriesByDate[date].push(entry);
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedUser(null);
    setSelectedAction(null);
    setDateRange({ from: '', to: '' });
  };

  // Format changed fields if they exist
  const formatChanges = (entry: AuditTrail) => {
    if (!entry.ChangedFields) return null;

    try {
      const changedFields = JSON.parse(entry.ChangedFields);
      const oldValues = entry.OldValues ? JSON.parse(entry.OldValues) : {};
      const newValues = entry.NewValues ? JSON.parse(entry.NewValues) : {};

      return Object.keys(changedFields).map((field) => (
        <div key={field} className="text-xs">
          <span className="text-gray-700">{field}: </span>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 mt-1">
            <div className="bg-red-50 p-1 rounded text-red-800 line-through">
              {oldValues[field]?.toString() || 'null'}
            </div>
            <div className="hidden sm:block text-gray-400">→</div>
            <div className="bg-green-50 p-1 rounded text-green-800">
              {newValues[field]?.toString() || 'null'}
            </div>
          </div>
        </div>
      ));
    } catch (e) {
      console.error('Error parsing changed fields:', e);
      return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <h2 className="text-xl font-medium text-gray-900">Audit Trail</h2>
        <p className="text-sm text-gray-500 mt-1">
          View the complete history of changes to this document
        </p>
      </div>

      {/* Search and filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <div>
                <label
                  htmlFor="user-filter"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  User
                </label>
                <select
                  id="user-filter"
                  className="block w-full pl-3 pr-2 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={selectedUser || ''}
                  onChange={(e) => setSelectedUser(e.target.value || null)}
                >
                  <option value="" hidden>
                    All Users
                  </option>
                  {uniqueUserNames?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="action-filter"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Action
                </label>
                <select
                  id="action-filter"
                  className="block w-full pl-3 pr-2 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={selectedAction || ''}
                  onChange={(e) => setSelectedAction(e.target.value || null)}
                >
                  <option value="" hidden>
                    All Actions
                  </option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="date-from"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  From Date
                </label>
                <input
                  type="date"
                  id="date-from"
                  className="block w-full px-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, from: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="date-to"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  To Date
                </label>
                <input
                  type="date"
                  id="date-to"
                  className="block w-full px-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, to: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleClearFilters}
                className="text-sm border border-gray-300 px-2 bg-gray-100 hover:bg-gray-200 text-black"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit trail timeline */}
      <div className="p-6 overflow-y-auto max-h-[calc(100vh-350px)]">
        {Object.keys(entriesByDate).length > 0 ? (
          Object.keys(entriesByDate)
            .sort()
            .reverse()
            .map((date) => (
              <div key={date} className="mb-8 last:mb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-4">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </h3>

                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-200"></div>

                  <div className="space-y-6">
                    {entriesByDate[date].map((entry, entryIndex) => (
                      <div
                        key={entry.ID}
                        className="relative pl-10 animate-fade-in"
                      >
                        <div className="absolute left-0 top-0 mt-1.5 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center z-10">
                          <UserCircle className="h-5 w-5 text-blue-600" />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div>
                            <p className="text-sm text-gray-900">
                              <span className="font-medium">
                                {entry.actor.userName}
                              </span>{' '}
                              {entry.Action.toLowerCase()}
                              {entry.Description && (
                                <span className="text-gray-600">
                                  {' '}
                                  - {entry.Description}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {/* {format(
                                new Date(entry.ActionDate).toLocaleDateString(),
                                'dd-MM-yyyy, h:mm a'
                              )} */}
                              {new Date(entry.ActionDate)
                                .toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                                .replace(',', '')}
                            </p>
                          </div>

                          {entry.ChangedFields && (
                            <div className="mt-3 sm:mt-0 bg-gray-50 p-3 rounded-md max-w-md">
                              <p className="text-xs font-medium text-gray-700 mb-2">
                                Changes:
                              </p>
                              <div className="space-y-2">
                                {formatChanges(entry)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No audit records found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ||
              selectedUser ||
              selectedAction ||
              dateRange.from ||
              dateRange.to
                ? 'Try adjusting your filters'
                : 'Changes to this document will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAuditTrail;
