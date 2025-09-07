import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Briefcase, Target, Clock, Award } from 'lucide-react';

interface UserProfile {
  name: string;
  role: string;
  experience: string;
  targetCompanies: string[];
  interviewGoal: string;
  timeframe: string;
}

interface UserProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

const roles = [
  'Data Engineer',
  'Software Engineer',
  'Machine Learning Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Product Manager',
  'System Design Specialist'
];

const companies = [
  'Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Uber', 
  'Airbnb', 'Spotify', 'Stripe', 'Coinbase', 'OpenAI', 'Anthropic'
];

const experiences = [
  '0-2 years (Junior)',
  '2-5 years (Mid-level)',
  '5-8 years (Senior)',
  '8+ years (Staff/Principal)'
];

export const UserProfileSetup = ({ onComplete, onSkip }: UserProfileSetupProps) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    role: '',
    experience: '',
    targetCompanies: [],
    interviewGoal: '',
    timeframe: ''
  });
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (!profile.name || !profile.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least your name and role.",
        variant: "destructive"
      });
      return;
    }

    onComplete(profile);
    toast({
      title: "Profile Created!",
      description: "We'll customize your experience based on your goals.",
    });
  };

  const addTargetCompany = (company: string) => {
    if (!profile.targetCompanies.includes(company)) {
      setProfile(prev => ({
        ...prev,
        targetCompanies: [...prev.targetCompanies, company]
      }));
    }
  };

  const removeTargetCompany = (company: string) => {
    setProfile(prev => ({
      ...prev,
      targetCompanies: prev.targetCompanies.filter(c => c !== company)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary-variant/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary-variant bg-clip-text text-transparent">
            Let's Personalize Your Experience
          </CardTitle>
          <div className="mt-4">
            <Progress value={progress} className="w-full h-2" />
            <p className="text-sm text-muted-foreground mt-2">Step {step} of {totalSteps}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Briefcase className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Tell us about yourself</h3>
                <p className="text-muted-foreground">This helps us create targeted content for you</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Current/Target Role</Label>
                <Select onValueChange={(value) => setProfile(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select onValueChange={(value) => setProfile(prev => ({ ...prev, experience: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experiences.map(exp => (
                      <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Target Companies</h3>
                <p className="text-muted-foreground">Which companies are you targeting? (Optional)</p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {companies.map(company => (
                  <button
                    key={company}
                    onClick={() => 
                      profile.targetCompanies.includes(company) 
                        ? removeTargetCompany(company)
                        : addTargetCompany(company)
                    }
                    className={`p-2 text-sm rounded-lg border transition-all ${
                      profile.targetCompanies.includes(company)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted hover:bg-muted/80 border-border'
                    }`}
                  >
                    {company}
                  </button>
                ))}
              </div>

              {profile.targetCompanies.length > 0 && (
                <div className="mt-4">
                  <Label>Selected Companies:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.targetCompanies.map(company => (
                      <Badge key={company} variant="secondary" className="gap-1">
                        {company}
                        <button
                          onClick={() => removeTargetCompany(company)}
                          className="text-xs hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Interview Goals</h3>
                <p className="text-muted-foreground">What's your main interview preparation goal?</p>
              </div>

              <div className="space-y-3">
                {[
                  'Get my first tech job',
                  'Switch to a bigger company (FAANG)',
                  'Level up to senior role',
                  'Prepare for specific interviews',
                  'General interview skills improvement'
                ].map(goal => (
                  <button
                    key={goal}
                    onClick={() => setProfile(prev => ({ ...prev, interviewGoal: goal }))}
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      profile.interviewGoal === goal
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted hover:bg-muted/80 border-border'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Preparation Timeline</h3>
                <p className="text-muted-foreground">When are you planning to interview?</p>
              </div>

              <div className="space-y-3">
                {[
                  'Within 2 weeks (Intensive)',
                  'Within 1 month (Focused)',
                  'Within 3 months (Steady)',
                  'Within 6 months (Comprehensive)',
                  'No specific timeline (Casual)'
                ].map(timeframe => (
                  <button
                    key={timeframe}
                    onClick={() => setProfile(prev => ({ ...prev, timeframe }))}
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      profile.timeframe === timeframe
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted hover:bg-muted/80 border-border'
                    }`}
                  >
                    <div className="font-medium">{timeframe.split(' (')[0]}</div>
                    <div className="text-sm text-muted-foreground">
                      {timeframe.split(' (')[1]?.replace(')', '')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={step === 1 ? onSkip : () => setStep(step - 1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Skip Setup' : 'Previous'}
            </Button>

            <Button
              onClick={handleNext}
              className="gap-2"
            >
              {step === totalSteps ? 'Complete Setup' : 'Next Step'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};