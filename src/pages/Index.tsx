// Enhanced welcome page with premium feel

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, Target, Zap, ArrowRight, Star, Trophy, 
  Timer, Users, Sparkles, Play, Award, CheckCircle,
  BarChart3, Mic, BookOpen, Lightbulb
} from "lucide-react";

const Index = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features = [
    { 
      icon: Brain, 
      title: "AI-Powered Content Generation", 
      description: "Transform your rough notes into professional talking points and scripts",
      details: "Our AI analyzes your experience and creates structured, compelling narratives"
    },
    { 
      icon: Mic, 
      title: "Practice Interview Simulation", 
      description: "Realistic mock interviews with AI interviewer and real-time feedback",
      details: "Practice with different interview types: technical, behavioral, and system design"
    },
    { 
      icon: BarChart3, 
      title: "Progress Analytics", 
      description: "Track your preparation progress and identify improvement areas",
      details: "Get personalized insights on your strengths and areas for growth"
    }
  ];

  const stats = [
    { value: "95%", label: "Success Rate", description: "of users report improved confidence" },
    { value: "3x", label: "Better Performance", description: "higher interview success rates" },
    { value: "50+", label: "Companies", description: "including FAANG and top startups" },
    { value: "24/7", label: "AI Support", description: "practice anytime, anywhere" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary-variant/10">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full text-primary font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Premium Interview Preparation Platform
          </div>
          
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary-variant bg-clip-text text-transparent mb-6">
            Ace Your Tech Interviews
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transform your interview preparation with AI-powered content generation, 
            realistic practice sessions, and personalized analytics. Join thousands 
            of engineers who landed their dream jobs.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              <Play className="w-5 h-5" />
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              View Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>10,000+ engineers</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>FAANG success stories</span>
            </div>
          </div>
        </div>

        {/* Interactive Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Succeed</h2>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all duration-300 ${
                      activeFeature === index 
                        ? 'border-primary shadow-lg bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setActiveFeature(index)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          activeFeature === index ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base mb-2">
                        {feature.description}
                      </CardDescription>
                      {activeFeature === index && (
                        <p className="text-sm text-primary font-medium">
                          {feature.details}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="relative">
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1">
                      <Timer className="w-3 h-3" />
                      Live Demo
                    </Badge>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">AI Content Generator</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-primary/30 rounded animate-pulse"></div>
                      <div className="h-2 bg-primary/20 rounded animate-pulse w-3/4"></div>
                      <div className="h-2 bg-primary/10 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    ✨ Generating personalized content for "Apache Kafka Experience"
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Proven Results</h2>
            <p className="text-muted-foreground">Join thousands of successful engineers</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-0 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Premium Features Grid */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Premium Features</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardHeader>
                <Lightbulb className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-center">Smart Content Generation</CardTitle>
                <CardDescription className="text-center">
                  AI transforms your notes into compelling interview stories with STAR method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Bullet points & talking scripts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Cross-questions preparation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Company-specific customization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-primary-variant/10 to-primary-variant/5 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardHeader>
                <Play className="w-12 h-12 text-primary-variant mx-auto mb-4" />
                <CardTitle className="text-center">Interactive Practice</CardTitle>
                <CardDescription className="text-center">
                  Realistic mock interviews with AI and voice recording capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>AI interview simulation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Voice recording & playback</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Real-time feedback</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-accent/30 to-accent/10 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardHeader>
                <Award className="w-12 h-12 text-accent-foreground mx-auto mb-4" />
                <CardTitle className="text-center">Progress Analytics</CardTitle>
                <CardDescription className="text-center">
                  Track your improvement with detailed analytics and personalized insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Readiness scoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Strength/weakness analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Improvement roadmap</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/20 via-primary-variant/20 to-primary/20 rounded-2xl p-12">
          <h2 className="text-4xl font-bold mb-4">Ready to Ace Your Next Interview?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of engineers who've successfully landed their dream jobs. 
            Start your premium preparation journey today.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="gap-2 text-lg px-8 py-6 shadow-lg">
              <Trophy className="w-5 h-5" />
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="text-sm text-muted-foreground">
              No credit card required • 7-day free trial
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
