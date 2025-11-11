"use client";

import { ProblemInput } from "@/components/ProblemInput";

export default function TestProblemInputPage() {
  const handleSubmit = (problem: { type: "text" | "image"; content: string }) => {
    console.log("Problem submitted:", problem);
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Problem Input Test</h1>
      <ProblemInput onSubmit={handleSubmit} />
    </div>
  );
}
