// import React, { ButtonHTMLAttributes } from "react";

// export type ButtonVariant =
//   | "primary"
//   | "secondary"
//   | "success"
//   | "danger"
//   | "warning"
//   | "outline"
//   | "ghost";
// export type ButtonSize = "sm" | "md" | "lg";

// interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
//   variant?: ButtonVariant;
//   size?: ButtonSize;
//   fullWidth?: boolean;
//   isLoading?: boolean;
//   icon?: React.ReactNode;
// }

// export const Button: React.FC<ButtonProps> = ({
//   children,
//   variant = "primary",
//   size = "md",
//   fullWidth = false,
//   isLoading = false,
//   icon,
//   className = "",
//   ...props
// }) => {
//   const baseStyles =
//     "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

//   const variantStyles = {
//     primary:
//       "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
//     secondary:
//       "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
//     success:
//       "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500",
//     danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
//     warning:
//       "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
//     outline:
//       "border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500",
//     ghost: "bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500",
//   };

//   const sizeStyles = {
//     sm: "text-sm h-8 px-3",
//     md: "text-sm h-10 px-4",
//     lg: "text-base h-12 px-6",
//   };

//   const widthStyles = fullWidth ? "w-full" : "";

//   return (
//     <button
//       className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
//       disabled={isLoading || props.disabled}
//       {...props}
//     >
//       {isLoading && (
//         <svg
//           className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
//           xmlns="http://www.w3.org/2000/svg"
//           fill="none"
//           viewBox="0 0 24 24"
//         >
//           <circle
//             className="opacity-25"
//             cx="12"
//             cy="12"
//             r="10"
//             stroke="currentColor"
//             strokeWidth="4"
//           ></circle>
//           <path
//             className="opacity-75"
//             fill="currentColor"
//             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//           ></path>
//         </svg>
//       )}
//       {icon && !isLoading && <span className="mr-2">{icon}</span>}
//       {children}
//     </button>
//   );
// };
