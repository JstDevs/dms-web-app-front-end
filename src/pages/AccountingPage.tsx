import React from "react";
import { Card, CardContent } from "../components/ui/Card";

export const AccountingPage: React.FC = () => {
  return (
    <div className="py-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Accounting Module</h1>
        <p className="mt-2 text-gray-600">
          Manage financial records and transactions
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">
            The Accounting module is under development. Check back soon for
            updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
