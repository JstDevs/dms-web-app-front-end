import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageNumbers = [];

  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
      {/* Rows per page selector - stays on top on mobile */}
      <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-sm text-gray-700 whitespace-nowrap">
          Rows Per Page:
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1.5 border border-blue-200 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 20, 50].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Pagination controls - becomes compact on mobile */}
      <div className="flex items-center space-x-1 w-full sm:w-auto justify-center sm:justify-start">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-2 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Show limited page numbers on mobile */}
        {window.innerWidth < 640 ? (
          <>
            {currentPage > 2 && <span className="px-2 text-blue-600">...</span>}
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1 rounded-md border text-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                {currentPage - 1}
              </button>
            )}
            <button className="px-3 py-1 rounded-md border text-sm bg-blue-600 text-white border-blue-600">
              {currentPage}
            </button>
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1 rounded-md border text-sm bg-white text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                {currentPage + 1}
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <span className="px-2 text-blue-600">...</span>
            )}
          </>
        ) : (
          // Show all page numbers on desktop
          pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`px-3 py-1 rounded-md border text-sm ${
                num === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-600 border-blue-200 hover:bg-blue-100"
              }`}
            >
              {num}
            </button>
          ))
        )}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export { PaginationControls };
