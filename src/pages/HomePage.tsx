import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Settings } from "lucide-react";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      bg: "bg-blue-100",
      title: "Document Management",
      description: "Upload, organize, and manage all your documents.",
      path: "/dashboard",
    },
    // {
    //   icon: <Settings className="h-8 w-8 text-teal-600" />,
    //   bg: "bg-teal-100",
    //   title: "Accounting",
    //   description: "Manage your financial records and transactions.",
    //   path: "/accounting",
    // },
    // {
    //   icon: <Users className="h-8 w-8 text-amber-600" />,
    //   bg: "bg-amber-100",
    //   title: "RPT Module",
    //   description: "Real Property Tax management and assessment.",
    //   path: "/rpt",
    // },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-white to-blue-50 px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-800">Welcome to DMS</h1>
        <p className="mt-3 text-lg text-gray-600">
          Select a module to begin working with your documents
        </p>
      </div>

      <div className="w-full max-w-md">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => navigate(card.path)}
            className="cursor-pointer transition-transform transform hover:scale-[1.03] hover:shadow-xl border border-gray-200 rounded-3xl bg-white shadow-md"
          >
            <div className="h-full">
              <div className="p-8 text-center flex flex-col items-center">
                <div
                  className={`${card.bg} p-4 rounded-full mb-5 shadow-inner`}
                >
                  {card.icon}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
