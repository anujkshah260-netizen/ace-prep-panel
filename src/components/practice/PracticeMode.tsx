import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, Pause, Square, Mic, MicOff, Clock, 
  CheckCircle, XCircle, ArrowRight, ArrowLeft,
  Target, Brain, Award, Timer
} from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  category: string;
}

interface ContentVersion {
  bullets: string[];
  script: string;
  cross_questions: Array<{ q: string; a: string; }>;
}

interface PracticeModeProps {
  topic: Topic;
  content: ContentVersion;
  onComplete: (results: PracticeResults) => void;
  onExit: () => void;
}

interface PracticeResults {
  topicId: string;
  duration: number;
  questionsAttempted: number;
  confidence: number;
  recordingUrl?: string;
  notes: string;
}

type PracticeStage = 'preparation' | 'speaking' | 'questions' | 'review';

export const PracticeMode = ({ topic, content, onComplete, onExit }: PracticeModeProps) => {
  const [stage, setStage] = useState<PracticeStage>('preparation');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetTimer = () => {
    setTimer(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // In a real app, you'd upload this to storage
        console.log('Recording completed', audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startTimer();
      
      toast({
        title: "Recording Started",
        description: "Practice speaking naturally. Take your time!"
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Please allow microphone access to practice speaking.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    pauseTimer();
  };

  const togglePause = () => {
    if (isPaused) {
      startTimer();
      setIsPaused(false);
    } else {
      pauseTimer();
      setIsPaused(true);
    }
  };

  const nextStage = () => {
    const stages: PracticeStage[] = ['preparation', 'speaking', 'questions', 'review'];
    const currentIndex = stages.indexOf(stage);
    if (currentIndex < stages.length - 1) {
      setStage(stages[currentIndex + 1]);
      if (stages[currentIndex + 1] === 'speaking') {
        resetTimer();
      }
    }
  };

  const completeSession = () => {
    const results: PracticeResults = {
      topicId: topic.id,
      duration: timer,
      questionsAttempted: currentQuestionIndex + 1,
      confidence,
      notes
    };
    onComplete(results);
  };

  const getStageProgress = () => {
    const stages = ['preparation', 'speaking', 'questions', 'review'];
    return ((stages.indexOf(stage) + 1) / stages.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-variant/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Practice Interview</h1>
              <p className="text-muted-foreground">Topic: {topic.title}</p>
            </div>
            <Button variant="outline" onClick={onExit} className="gap-2">
              <XCircle className="w-4 h-4" />
              Exit Practice
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Progress value={getStageProgress()} className="flex-1 h-2" />
            <Badge variant="secondary" className="gap-1">
              <Timer className="w-3 h-3" />
              {formatTime(timer)}
            </Badge>
          </div>
        </div>

        {/* Preparation Stage */}
        {stage === 'preparation' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Preparation Phase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Review Your Key Points</h3>
                <ul className="space-y-2">
                  {content.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Speaking Practice Tips</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Speak clearly and at a comfortable pace</li>
                  <li>• Use the STAR method for behavioral questions</li>
                  <li>• Include specific numbers and results when possible</li>
                  <li>• Practice maintaining eye contact (imagine the interviewer)</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button onClick={nextStage} className="gap-2">
                  Start Speaking Practice
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Speaking Stage */}
        {stage === 'speaking' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Speaking Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="mb-6">
                  <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center ${
                    isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-primary/20'
                  }`}>
                    {isRecording ? (
                      <Mic className="w-12 h-12 text-red-500" />
                    ) : (
                      <MicOff className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-2xl font-mono font-bold mt-4">{formatTime(timer)}</p>
                </div>

                <div className="bg-card p-6 rounded-lg border-2 border-dashed border-primary/30 mb-6">
                  <h3 className="font-semibold mb-3">Practice Prompt:</h3>
                  <p className="text-lg leading-relaxed">
                    "Tell me about your experience with {topic.title}. 
                    Walk me through a specific project where you used this technology 
                    and the impact it had."
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  {!isRecording ? (
                    <Button onClick={startRecording} size="lg" className="gap-2">
                      <Play className="w-5 h-5" />
                      Start Recording
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={togglePause} 
                        variant="outline" 
                        size="lg" 
                        className="gap-2"
                      >
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button 
                        onClick={stopRecording} 
                        variant="destructive" 
                        size="lg" 
                        className="gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Stop & Continue
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {!isRecording && timer > 0 && (
                <div className="flex justify-end">
                  <Button onClick={nextStage} className="gap-2">
                    Continue to Q&A
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions Stage */}
        {stage === 'questions' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Cross Questions Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {content.cross_questions.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      Question {currentQuestionIndex + 1} of {content.cross_questions.length}
                    </Badge>
                    <Progress 
                      value={((currentQuestionIndex + 1) / content.cross_questions.length) * 100} 
                      className="w-32 h-2" 
                    />
                  </div>

                  <div className="bg-card p-6 rounded-lg border-2 border-primary/20">
                    <h3 className="font-semibold text-primary mb-4">Question:</h3>
                    <p className="text-lg mb-6">
                      {content.cross_questions[currentQuestionIndex]?.q}
                    </p>
                    
                    <details className="group">
                      <summary className="cursor-pointer text-primary font-medium hover:text-primary/80">
                        View Suggested Answer ▼
                      </summary>
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-muted-foreground">
                          {content.cross_questions[currentQuestionIndex]?.a}
                        </p>
                      </div>
                    </details>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    {currentQuestionIndex < content.cross_questions.length - 1 ? (
                      <Button
                        onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                        className="gap-2"
                      >
                        Next Question
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={nextStage} className="gap-2">
                        Finish Practice
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No cross questions available for this topic.
                  </p>
                  <Button onClick={nextStage} className="gap-2">
                    Continue to Review
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Stage */}
        {stage === 'review' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Practice Session Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h3 className="font-semibold text-primary mb-2">Session Stats</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Practice Duration:</span>
                        <Badge variant="secondary">{formatTime(timer)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Questions Reviewed:</span>
                        <Badge variant="secondary">{currentQuestionIndex + 1}</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Confidence Level</h3>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          onClick={() => setConfidence(level)}
                          className={`w-10 h-10 rounded-full border-2 font-semibold ${
                            confidence >= level
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-muted text-muted-foreground'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Rate your confidence (1-5) for this topic
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Practice Notes</h3>
                  <textarea
                    placeholder="What went well? What would you improve next time?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-32 p-3 rounded-lg border border-border bg-background resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onExit} className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Exit Without Saving
                </Button>
                <Button onClick={completeSession} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Save Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};