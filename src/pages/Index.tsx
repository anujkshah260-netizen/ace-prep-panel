// Welcome page for new users or landing

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, Zap, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary-variant/10">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-variant bg-clip-text text-transparent mb-6">
            Welcome to Ace Prep Panel
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered interview preparation dashboard for data engineers. 
            Transform your experience into compelling interview stories.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Brain className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>AI-Generated Content</CardTitle>
              <CardDescription>
                Transform your rough notes into professional talking points and scripts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Organized Topics</CardTitle>
              <CardDescription>
                Structure your knowledge by technology, behavioral, and system design
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle>Practice Ready</CardTitle>
              <CardDescription>
                Get bullet points, scripts, and cross-questions for every topic
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <a href="/">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
