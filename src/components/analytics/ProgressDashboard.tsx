import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, Target, Clock, Award, Brain, 
  BarChart3, Calendar, Star, ArrowUp, Trophy,
  CheckCircle2, AlertCircle, Timer
} from 'lucide-react';

interface PracticeSession {
  id: string;
  topicId: string;
  topicTitle: string;
  category: string;
  duration: number;
  confidence: number;
  date: string;
  questionsAttempted: number;
}

interface TopicProgress {
  topicId: string;
  title: string;
  category: string;
  sessions: number;
  avgConfidence: number;
  totalTime: number;
  lastPracticed: string;
  readinessScore: number;
}

interface ProgressDashboardProps {
  userId: string;
}

export const ProgressDashboard = ({ userId }: ProgressDashboardProps) => {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration - in real app, fetch from Supabase
  useEffect(() => {
    const mockSessions: PracticeSession[] = [
      {
        id: '1',
        topicId: 'kafka',
        topicTitle: 'Apache Kafka',
        category: 'Technology',
        duration: 480,
        confidence: 4,
        date: '2024-01-07',
        questionsAttempted: 5
      },
      {
        id: '2',
        topicId: 'spark',
        topicTitle: 'Apache Spark',
        category: 'Technology',
        duration: 360,
        confidence: 3,
        date: '2024-01-06',
        questionsAttempted: 4
      },
      {
        id: '3',
        topicId: 'leadership',
        topicTitle: 'Leadership Experience',
        category: 'Behavioral',
        duration: 420,
        confidence: 5,
        date: '2024-01-05',
        questionsAttempted: 3
      }
    ];

    const mockProgress: TopicProgress[] = [
      {
        topicId: 'kafka',
        title: 'Apache Kafka',
        category: 'Technology',
        sessions: 3,
        avgConfidence: 4.2,
        totalTime: 1440,
        lastPracticed: '2024-01-07',
        readinessScore: 85
      },
      {
        topicId: 'spark',
        title: 'Apache Spark',
        category: 'Technology',
        sessions: 2,
        avgConfidence: 3.5,
        totalTime: 720,
        lastPracticed: '2024-01-06',
        readinessScore: 72
      },
      {
        topicId: 'leadership',
        title: 'Leadership Experience',
        category: 'Behavioral',
        sessions: 4,
        avgConfidence: 4.8,
        totalTime: 1680,
        lastPracticed: '2024-01-05',
        readinessScore: 92
      }
    ];

    setSessions(mockSessions);
    setTopicProgress(mockProgress);
    setLoading(false);
  }, [userId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadinessIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return AlertCircle;
    return AlertCircle;
  };

  const totalPracticeTime = sessions.reduce((sum, session) => sum + session.duration, 0);
  const avgConfidence = sessions.length > 0 
    ? sessions.reduce((sum, session) => sum + session.confidence, 0) / sessions.length 
    : 0;
  const totalSessions = sessions.length;
  const overallReadiness = topicProgress.length > 0
    ? topicProgress.reduce((sum, topic) => sum + topic.readinessScore, 0) / topicProgress.length
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24 bg-muted/50 rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Readiness</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(overallReadiness)}%
                </p>
              </div>
              <Trophy className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Practice Time</p>
                <p className="text-2xl font-bold">{formatTime(totalPracticeTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{avgConfidence.toFixed(1)}/5</p>
              </div>
              <Star className="w-8 h-8 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="topics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="topics">Topic Progress</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Topic Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topicProgress.map((topic) => {
                  const ReadinessIcon = getReadinessIcon(topic.readinessScore);
                  return (
                    <div key={topic.topicId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{topic.title}</h3>
                          <Badge variant="outline">{topic.category}</Badge>
                        </div>
                        <div className="space-y-1">
                          <Progress value={topic.readinessScore} className="h-2" />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{topic.sessions} sessions • {formatTime(topic.totalTime)}</span>
                            <span>Confidence: {topic.avgConfidence.toFixed(1)}/5</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <ReadinessIcon className={`w-5 h-5 ${getReadinessColor(topic.readinessScore)}`} />
                        <span className={`font-semibold ${getReadinessColor(topic.readinessScore)}`}>
                          {topic.readinessScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Practice Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{session.topicTitle}</h3>
                        <Badge variant="outline">{session.category}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {formatTime(session.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {session.confidence}/5
                        </span>
                        <span>{session.questionsAttempted} questions</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(session.date)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Strong in Behavioral topics (4.8/5 avg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Consistent practice schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Good confidence in practiced topics</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Target className="w-5 h-5" />
                  Growth Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">Practice more System Design topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">Increase session duration for depth</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">Focus on cross-question preparation</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Next Steps</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Practice System Design topics to balance your preparation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Schedule longer sessions (8-10 minutes) for deeper practice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Review and practice more cross-questions for Apache Spark</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button className="gap-2">
                  <Target className="w-4 h-4" />
                  Start Recommended Practice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};