import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, User, Clock, Play, Pause, Square, 
  MessageSquare, Star, CheckCircle, 
  ArrowRight, RotateCcw, Award
} from 'lucide-react';

interface InterviewConfig {
  type: 'technical' | 'behavioral' | 'system-design' | 'mixed';
  difficulty: 'junior' | 'mid' | 'senior' | 'staff';
  duration: number; // in minutes
  company?: string;
}

interface InterviewQuestion {
  id: string;
  type: string;
  question: string;
  followUp?: string[];
  hints?: string[];
  expectedPoints?: string[];
}

interface InterviewSimulatorProps {
  onComplete: (results: InterviewResults) => void;
  onExit: () => void;
}

interface InterviewResults {
  duration: number;
  questionsAnswered: number;
  averageResponseTime: number;
  feedback: string[];
  overallScore: number;
}

type InterviewStage = 'setup' | 'introduction' | 'questions' | 'feedback' | 'complete';

export const InterviewSimulator = ({ onComplete, onExit }: InterviewSimulatorProps) => {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [config, setConfig] = useState<InterviewConfig>({
    type: 'technical',
    difficulty: 'mid',
    duration: 45
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  
  const { toast } = useToast();

  // Mock interview questions based on configuration
  const generateQuestions = (config: InterviewConfig): InterviewQuestion[] => {
    const questionSets = {
      technical: [
        {
          id: '1',
          type: 'technical',
          question: 'Can you explain how you would design a data pipeline to process streaming data from multiple sources?',
          followUp: ['How would you handle late-arriving data?', 'What about data quality issues?'],
          hints: ['Consider batch vs streaming', 'Think about fault tolerance'],
          expectedPoints: ['Stream processing frameworks', 'Data validation', 'Error handling', 'Monitoring']
        },
        {
          id: '2',
          type: 'technical',
          question: 'Walk me through your approach to debugging a slow-performing database query.',
          followUp: ['How would you identify the bottleneck?', 'What tools would you use?'],
          hints: ['Query execution plan', 'Indexing strategy'],
          expectedPoints: ['EXPLAIN plans', 'Index analysis', 'Query optimization', 'Performance monitoring']
        }
      ],
      behavioral: [
        {
          id: '3',
          type: 'behavioral',
          question: 'Tell me about a time when you had to work with a difficult stakeholder. How did you handle the situation?',
          followUp: ['What was the outcome?', 'What would you do differently?'],
          hints: ['Use STAR method', 'Focus on your actions'],
          expectedPoints: ['Communication skills', 'Conflict resolution', 'Stakeholder management', 'Results']
        },
        {
          id: '4',
          type: 'behavioral',
          question: 'Describe a project where you had to learn a new technology quickly. How did you approach it?',
          followUp: ['How did you ensure quality while learning?', 'How did you share knowledge with your team?'],
          hints: ['Learning strategy', 'Implementation approach'],
          expectedPoints: ['Learning methodology', 'Resource utilization', 'Knowledge sharing', 'Delivery']
        }
      ],
      'system-design': [
        {
          id: '5',
          type: 'system-design',
          question: 'Design a real-time analytics system for an e-commerce platform that can handle millions of events per day.',
          followUp: ['How would you ensure scalability?', 'What about data consistency?'],
          hints: ['Lambda/Kappa architecture', 'Event streaming'],
          expectedPoints: ['Architecture patterns', 'Scalability', 'Data consistency', 'Real-time processing']
        }
      ]
    };

    let selectedQuestions: InterviewQuestion[] = [];
    
    if (config.type === 'mixed') {
      selectedQuestions = [
        ...questionSets.technical.slice(0, 1),
        ...questionSets.behavioral.slice(0, 1),
        ...questionSets['system-design'].slice(0, 1)
      ];
    } else {
      selectedQuestions = questionSets[config.type] || questionSets.technical;
    }

    return selectedQuestions.slice(0, Math.ceil(config.duration / 15)); // ~15 min per question
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const startInterview = () => {
    const generatedQuestions = generateQuestions(config);
    setQuestions(generatedQuestions);
    setStage('introduction');
    setIsActive(true);
    setQuestionStartTime(Date.now());
    toast({
      title: "Interview Started",
      description: `${config.type} interview with ${generatedQuestions.length} questions`
    });
  };

  const nextQuestion = () => {
    // Record response time
    const responseTime = (Date.now() - questionStartTime) / 1000;
    setResponseTimes([...responseTimes, responseTime]);
    setResponses([...responses, currentResponse]);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentResponse('');
      setQuestionStartTime(Date.now());
    } else {
      endInterview();
    }
  };

  const endInterview = () => {
    setIsActive(false);
    setStage('feedback');
  };

  const completeInterview = () => {
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    const results: InterviewResults = {
      duration: timer,
      questionsAnswered: responses.length,
      averageResponseTime: avgResponseTime,
      feedback: [
        'Good technical depth in responses',
        'Consider providing more specific examples',
        'Strong communication throughout the interview'
      ],
      overallScore: 85 // Mock score
    };

    onComplete(results);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-variant/5 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Setup Stage */}
        {stage === 'setup' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                AI Interview Simulator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Interview Type</label>
                    <Select onValueChange={(value: any) => setConfig({...config, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interview type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Deep Dive</SelectItem>
                        <SelectItem value="behavioral">Behavioral Questions</SelectItem>
                        <SelectItem value="system-design">System Design</SelectItem>
                        <SelectItem value="mixed">Mixed Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                    <Select onValueChange={(value: any) => setConfig({...config, difficulty: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                        <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
                        <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                        <SelectItem value="staff">Staff+ (8+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                    <Select onValueChange={(value) => setConfig({...config, duration: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-primary mb-3">What to Expect</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Realistic interview scenario with AI interviewer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Follow-up questions based on your responses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Real-time feedback and performance tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Detailed analysis and improvement suggestions</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onExit}>
                  Cancel
                </Button>
                <Button onClick={startInterview} size="lg" className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Introduction Stage */}
        {stage === 'introduction' && (
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle>AI Interviewer</CardTitle>
                    <p className="text-sm text-muted-foreground">Senior Engineering Manager</p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(timer)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-card border-2 border-primary/20 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <Bot className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-lg leading-relaxed">
                      "Hello! I'm excited to interview you today. This will be a {config.type} interview 
                      lasting about {config.duration} minutes. I'll be asking you questions about your 
                      experience and technical knowledge. Please feel free to think out loud and ask 
                      clarifying questions if needed. Are you ready to get started?"
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStage('questions')} size="lg" className="gap-2">
                  I'm Ready
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions Stage */}
        {stage === 'questions' && questions.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                    <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-32 h-2 mt-1" />
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(timer)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Question */}
              <div className="bg-card border-2 border-primary/20 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <Bot className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-lg leading-relaxed mb-4">
                      {questions[currentQuestionIndex]?.question}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {questions[currentQuestionIndex]?.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Response Area */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Your Response:</span>
                </div>
                <textarea
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  placeholder="Type your response here... Think out loud and be specific with examples."
                  className="w-full h-32 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Hints (collapsible) */}
              {questions[currentQuestionIndex]?.hints && (
                <details className="group">
                  <summary className="cursor-pointer text-primary font-medium hover:text-primary/80">
                    💡 Need a hint? ▼
                  </summary>
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <ul className="text-sm space-y-1">
                      {questions[currentQuestionIndex].hints?.map((hint, index) => (
                        <li key={index}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={endInterview} className="gap-2">
                  <Square className="w-4 h-4" />
                  End Interview
                </Button>
                <Button 
                  onClick={nextQuestion} 
                  disabled={!currentResponse.trim()}
                  className="gap-2"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Stage */}
        {stage === 'feedback' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                Interview Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">85%</div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatTime(timer)}</div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{responses.length}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-4">AI Feedback</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Strengths</p>
                      <p className="text-sm text-muted-foreground">
                        Clear communication and good technical depth. Strong use of specific examples.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Areas for Improvement</p>
                      <p className="text-sm text-muted-foreground">
                        Consider structuring responses with STAR method for behavioral questions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onExit} className="gap-2">
                  Return to Dashboard
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setStage('setup')} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button onClick={completeInterview} className="gap-2">
                    Save Results
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};