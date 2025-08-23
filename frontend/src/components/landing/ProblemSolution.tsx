"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

const problems = [
  {
    title: "Fragmented Systems",
    description:
      "Multiple disconnected tools create data silos and operational inefficiencies.",
  },
  {
    title: "Poor Visibility",
    description:
      "Lack of real-time insights leads to reactive decision-making and missed opportunities.",
  },
  {
    title: "Manual Processes",
    description:
      "Time-consuming manual tasks increase errors and reduce productivity.",
  },
  {
    title: "Scaling Challenges",
    description:
      "Growing operations become increasingly complex and difficult to manage.",
  },
];

const solutions = [
  {
    title: "Unified Platform",
    description:
      "All logistics operations managed from a single, integrated platform.",
  },
  {
    title: "Real-time Analytics",
    description:
      "Complete visibility with live dashboards and predictive insights.",
  },
  {
    title: "Automated Workflows",
    description:
      "Streamlined processes that reduce manual work and eliminate errors.",
  },
  {
    title: "Scalable Architecture",
    description:
      "Cloud-native solution that grows seamlessly with your business.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            From <span className="text-destructive">Logistics Chaos</span> to{" "}
            <span className="text-primary">Operational Excellence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your logistics challenges into competitive advantages with
            our comprehensive solution.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Problems */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Common Problems
              </div>
              <h3 className="font-serif font-bold text-2xl text-foreground mb-4">
                Logistics Challenges
              </h3>
            </div>
            {problems.map((problem, index) => (
              <Card
                key={index}
                className="border-destructive/20 bg-destructive/5"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                    {problem.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <ArrowRight className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Our Solutions
              </div>
              <h3 className="font-serif font-bold text-2xl text-foreground mb-4">
                Logiflow Advantages
              </h3>
            </div>
            {solutions.map((solution, index) => (
              <Card key={index} className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-primary mr-2" />
                    {solution.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {solution.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
