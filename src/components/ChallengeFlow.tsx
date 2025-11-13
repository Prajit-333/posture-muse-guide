import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CameraView } from "./CameraView";
import { SessionSummary } from "./SessionSummary";
import { FinalSummary } from "./FinalSummary";
import { 
  similarityScore, 
  computeSessionScore, 
  scoreToGrade, 
  generateFeedback,
  computeAccuracy,
  computeSymmetry,
  type FrameScore 
} from "@/utils/scoring";
import { stabilityScore } from "@/utils/angles";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Play, RotateCcw, SkipForward } from "lucide-react";

interface PoseData {
  slug: string;
  name: string;
  difficulty: string;
  thumbnail: string;
  targetAngles: Record<string, number>;
  tolerances: Record<string, number>;
  weights: Record<string, number>;
  steps: string[];
  tips: string[];
  hold_seconds: number;
}

interface ChallengeFlowProps {
  challengeLevels: Array<{ level: number; slug: string; name: string; difficulty: string }>;
  poseLibrary: PoseData[];
  onComplete: () => void;
}

export function ChallengeFlow({ challengeLevels, poseLibrary, onComplete }: ChallengeFlowProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [holdProgress, setHoldProgress] = useState(0);
  const [liveSimilarity, setLiveSimilarity] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [levelScores, setLevelScores] = useState<number[]>(Array(challengeLevels.length).fill(0));
  const [levelFeedbacks, setLevelFeedbacks] = useState<string[][]>(() => Array.from({ length: challengeLevels.length }, () => []));
  
  const frameScoresRef = useRef<FrameScore[]>([]);
  const angleTimeSeriesRef = useRef<Record<string, number[]>>({});
  // Buffer angles collected during the current 1s window
  const lastSecondAnglesRef = useRef<Record<string, number[]>>({});
  const [liveAnglesAvg, setLiveAnglesAvg] = useState<Record<string, number>>({});
  const perSecondIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [sessionData, setSessionData] = useState<{
    accuracy: number;
    stability: number;
    symmetry: number;
    grade: string;
    feedback: string[];
    overallScore?: number;
  } | null>(null);

  const currentPose = poseLibrary.find(p => p.slug === challengeLevels[currentLevel]?.slug);
  const holdDuration = currentPose?.hold_seconds || 30;

  const resetLevel = useCallback(() => {
    setIsHolding(false);
    setCountdown(3);
    setHoldProgress(0);
    setLiveSimilarity(0);
    frameScoresRef.current = [];
    angleTimeSeriesRef.current = {};
    startTimeRef.current = 0;
  }, []);

  const handleBegin = useCallback(() => {
    if (!cameraActive) return;
    
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownInterval);
        setIsHolding(true);
        startTimeRef.current = Date.now();
      }
    }, 1000);
  }, [cameraActive]);

  const handlePoseDetected = useCallback((angles: Record<string, number>, _landmarks: NormalizedLandmark[]) => {
    if (!isHolding || !currentPose) return;

    const { score, deviations } = similarityScore(
      angles,
      currentPose.targetAngles,
      currentPose.tolerances,
      currentPose.weights
    );

    setLiveSimilarity(Math.round(score * 100));
  // Live feedback hints
  const hints = generateFeedback(deviations, currentPose.targetAngles, angles, 3);
  setLiveFeedback(hints);

    // Store frame score
    frameScoresRef.current.push({
      score,
      timestamp: Date.now(),
      angles
    });

    // Store angle time series for stability
    Object.keys(angles).forEach(angleName => {
      if (!angleTimeSeriesRef.current[angleName]) {
        angleTimeSeriesRef.current[angleName] = [];
      }
      angleTimeSeriesRef.current[angleName].push(angles[angleName]);
      // add to last-second buffer
      if (!lastSecondAnglesRef.current[angleName]) lastSecondAnglesRef.current[angleName] = [];
      lastSecondAnglesRef.current[angleName].push(angles[angleName]);
    });

    // Update hold progress
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(100, (elapsed / (holdDuration * 1000)) * 100);
    setHoldProgress(progress);

    // Complete when hold duration reached
    if (progress >= 100) {
      completeLevel();
    }
  }, [isHolding, currentPose, holdDuration]);

  // Start per-second aggregator when holding starts and stop when it ends
  useEffect(() => {
    if (isHolding) {
      // clear any previous buffer
      lastSecondAnglesRef.current = {};
      // Set interval every 1s to compute averages
      perSecondIntervalRef.current = window.setInterval(() => {
        const averages: Record<string, number> = {};
        Object.keys(lastSecondAnglesRef.current).forEach(angleName => {
          const vals = lastSecondAnglesRef.current[angleName];
          if (vals && vals.length > 0) {
            const sum = vals.reduce((a, b) => a + b, 0);
            averages[angleName] = Math.round(sum / vals.length);
          }
        });
        setLiveAnglesAvg(averages);
        // clear buffer for next second
        lastSecondAnglesRef.current = {};
      }, 1000) as unknown as number;
    } else {
      // stop interval
      if (perSecondIntervalRef.current) {
        clearInterval(perSecondIntervalRef.current);
        perSecondIntervalRef.current = null;
      }
      // clear live averages
      setLiveAnglesAvg({});
      lastSecondAnglesRef.current = {};
    }

    return () => {
      if (perSecondIntervalRef.current) {
        clearInterval(perSecondIntervalRef.current);
        perSecondIntervalRef.current = null;
      }
    };
  }, [isHolding]);

  const completeLevel = useCallback(() => {
    if (!currentPose) return;

    setIsHolding(false);

    // Compute final metrics
    const lastFrame = frameScoresRef.current[frameScoresRef.current.length - 1];
    const accuracy = lastFrame ? computeAccuracy(lastFrame.score) : 0;
    const symmetry = lastFrame ? computeSymmetry(lastFrame.angles) : 0;

    // Compute stability from angle time series
    const allStabilities = Object.values(angleTimeSeriesRef.current).map(series => stabilityScore(series));
    const avgStability = allStabilities.length > 0
      ? Math.round((allStabilities.reduce((a, b) => a + b, 0) / allStabilities.length) * 100)
      : 0;

    const sessionScore = computeSessionScore(frameScoresRef.current, avgStability / 100);
    const grade = scoreToGrade(sessionScore);
    const feedback = lastFrame
      ? generateFeedback(
          similarityScore(lastFrame.angles, currentPose.targetAngles, currentPose.tolerances, currentPose.weights).deviations,
          currentPose.targetAngles,
          lastFrame.angles
        )
      : [];

    setSessionData({
      accuracy,
      stability: avgStability,
      symmetry,
      grade,
      feedback,
      overallScore: Math.round(sessionScore)
    } as any);

    setShowSummary(true);
  }, [currentPose]);

  const handleNextLevel = useCallback(() => {
    // Store the score for this level
    if (sessionData) {
      // Prefer the already computed overallScore stored in sessionData (set in completeLevel).
      const sessionScore = typeof sessionData.overallScore === "number"
        ? sessionData.overallScore
        : computeSessionScore(frameScoresRef.current, sessionData.stability / 100);

      const newScores = [...levelScores];
      newScores[currentLevel] = Math.round(sessionScore);
      setLevelScores(newScores);

      const newFeedbacks = [...levelFeedbacks];
      newFeedbacks[currentLevel] = sessionData.feedback || [];
      setLevelFeedbacks(newFeedbacks);
    }

    setShowSummary(false);
    resetLevel();
    
    if (currentLevel < challengeLevels.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setShowFinalSummary(true);
    }
  }, [currentLevel, challengeLevels.length, resetLevel, sessionData, levelScores]);

  

  const handleSkipLevel = useCallback(() => {
    // Set score to 0 for skipped level
    const newScores = [...levelScores];
    newScores[currentLevel] = 0;
    setLevelScores(newScores);
    const newFeedbacks = [...levelFeedbacks];
    newFeedbacks[currentLevel] = [];
    setLevelFeedbacks(newFeedbacks);

    resetLevel();
    if (currentLevel < challengeLevels.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setShowFinalSummary(true);
    }
  }, [currentLevel, challengeLevels.length, resetLevel, levelScores]);

  if (!currentPose) return null;

  if (showFinalSummary) {
    return (
      <FinalSummary
        levelScores={levelScores}
        levelFeedbacks={levelFeedbacks}
        levelDetails={challengeLevels}
        poseLibrary={poseLibrary}
        onGoHome={onComplete}
      />
    );
  }

  if (showSummary && sessionData) {
    return (
      <SessionSummary
        poseName={currentPose.name}
        level={currentLevel + 1}
        accuracy={sessionData.accuracy}
        stability={sessionData.stability}
        symmetry={sessionData.symmetry}
        grade={sessionData.grade}
        feedback={sessionData.feedback}
        overallScore={sessionData.overallScore}
        onNextLevel={handleNextLevel}
        isLastLevel={currentLevel === challengeLevels.length - 1}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Level {currentLevel + 1} of {challengeLevels.length}
          </h2>
          <p className="text-muted-foreground mt-1">Hold the pose for {holdDuration} seconds</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {currentPose.difficulty}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Camera Feed Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Camera</CardTitle>
              <div className="text-right text-sm space-y-1">
                <div className="text-muted-foreground">
                  Similarity: <span className="font-bold text-accent">{liveSimilarity}%</span>
                </div>
                <div className="text-muted-foreground">
                  Hold: <span className="font-bold text-accent">{Math.round(holdProgress)}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] lg:aspect-video">
              <CameraView isActive={cameraActive} onPoseDetected={handlePoseDetected} />
            </div>

            {isHolding && (
              <Progress value={holdProgress} className="h-2" />
            )}

            {/* Live feedback (glass card) */}
            <div className="mt-3">
              <div className="glass-card p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Live Feedback</div>
                  <div className="text-xs text-muted-foreground">Similarity: <span className="font-bold text-accent">{liveSimilarity}%</span></div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {liveFeedback.length === 0 ? (
                    <div className="italic">Hold steady — awaiting pose analysis...</div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {liveFeedback.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Live angles per-second average */}
            <div className="mt-3">
              <div className="glass-card p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Live Angles (1s avg)</div>
                  <div className="text-xs text-muted-foreground">Updated every second</div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {Object.keys(liveAnglesAvg).length === 0 ? (
                    <div className="italic">No angle data yet</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(liveAnglesAvg).map(([angle, val]) => (
                        <div key={angle} className="flex items-center justify-between text-xs">
                          <div className="capitalize">{angle.replace(/_/g, " ")}</div>
                          <div className="font-semibold">{val}°</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCameraActive(true)}
                disabled={cameraActive}
                variant="default"
                size="sm"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
              <Button
                onClick={handleBegin}
                disabled={!cameraActive || isHolding}
                variant="default"
                size="sm"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                Begin ({countdown > 0 ? countdown : "Go!"})
              </Button>
              <Button
                onClick={resetLevel}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              {currentLevel < challengeLevels.length - 1 && (
                <Button
                  onClick={handleSkipLevel}
                  variant="ghost"
                  size="sm"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reference Pose Card */}
        <Card>
          <CardHeader>
            <CardTitle>{currentPose.name}</CardTitle>
            <CardDescription>Reference pose and instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] lg:aspect-video rounded-lg overflow-hidden">
              <img
                src={currentPose.thumbnail}
                alt={currentPose.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Steps:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  {currentPose.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {currentPose.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
