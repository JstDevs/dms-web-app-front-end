import React from "react";
import { Card, CardContent } from "../components/ui/Card";

export const RPTPage: React.FC = () => {
  return (
    <div className="py-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800">
          Real Property Tax Module
        </h1>
        <p className="mt-2 text-gray-600">
          Manage real property tax assessments and collections
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">
            The RPT module is under development. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
