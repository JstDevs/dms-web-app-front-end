import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const [totalPages, setTotalPages] = useState(
    Math.ceil(totalItems / itemsPerPage)
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Update total pages when items or page size changes
    const newTotalPages = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(newTotalPages);

    // Adjust current page if it's now beyond the new total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      onPageChange(newTotalPages);
    }
  }, [totalItems, itemsPerPage, currentPage, onPageChange]);

  useEffect(() => {
    // Check if mobile on mount and resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = isMobile ? 3 : 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the start or end
      if (currentPage <= 3) {
        end = 3;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 2;
      }

      // Add ellipsis if needed
      if (start > 2) pages.push('...');

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) pages.push('...');

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
      {/* Rows per page selector */}
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-sm text-gray-700 whitespace-nowrap">
          Rows Per Page: {onItemsPerPageChange ? ' ' : ' 10'}
        </span>
        {onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
            className="px-3 py-1.5 border border-blue-200 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[5, 10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1 w-full sm:w-auto justify-center sm:justify-start">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-2 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((item, index) => (
          <React.Fragment key={index}>
            {item === '...' ? (
              <span className="px-2 text-blue-600">...</span>
            ) : (
              <button
                onClick={() => onPageChange(Number(item))}
                className={`px-3 py-1 rounded-md border text-sm ${
                  item === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {item}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export { PaginationControls };
