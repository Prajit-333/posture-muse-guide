import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home } from "lucide-react";
import { motion } from "framer-motion";

interface FinalSummaryProps {
  levelScores: number[];
  onGoHome: () => void;
}

export function FinalSummary({ levelScores, onGoHome }: FinalSummaryProps) {
  const totalScore = Math.round(
    levelScores.reduce((sum, score) => sum + score, 0) / levelScores.length
  );

  const getFeedback = (score: number) => {
    if (score >= 90) return {
      grade: "Superb",
      label: "🌟 Pose Master",
      message: "You nailed it! Strength, control, and grace — beautifully done.",
      color: "text-success"
    };
    if (score >= 80) return {
      grade: "Great",
      label: "🌞 Flowing Smoothly",
      message: "Your focus is shining through — just a few tweaks to perfect it!",
      color: "text-accent"
    };
    if (score >= 65) return {
      grade: "Healthy",
      label: "🌿 Steady & Centered",
      message: "Strong form and great balance — stay mindful of your breathing.",
      color: "text-accent"
    };
    if (score >= 50) return {
      grade: "Improving",
      label: "🌤 Getting Stronger",
      message: "Nice progress! Keep refining your alignment — you're leveling up.",
      color: "text-warning"
    };
    return {
      grade: "Needs Focus",
      label: "🌱 Just Beginning",
      message: "Every expert starts here — your consistency will make magic!",
      color: "text-muted-foreground"
    };
  };

  const feedback = getFeedback(totalScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Trophy className="w-20 h-20 mx-auto text-success" />
        </motion.div>
        <h2 className="text-4xl font-bold text-foreground">Challenge Complete!</h2>
        <p className="text-lg text-muted-foreground">Here's how you performed across all levels</p>
      </div>

      {/* Overall Score Card */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Total Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <div className={`text-7xl font-bold ${feedback.color}`}>
              {totalScore}
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2">
              {feedback.label}
            </div>
          </motion.div>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {feedback.message}
          </p>
        </CardContent>
      </Card>

      {/* Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {levelScores.map((score, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="text-center space-y-2"
              >
                <div className="text-sm text-muted-foreground font-semibold">
                  Level {idx + 1}
                </div>
                <Badge
                  variant={score === 0 ? "secondary" : "default"}
                  className="text-2xl px-4 py-2 w-full justify-center"
                >
                  {score === 0 ? "—" : score}
                </Badge>
                {score === 0 && (
                  <div className="text-xs text-muted-foreground">Skipped</div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex justify-center"
      >
        <Button
          onClick={onGoHome}
          size="lg"
          className="gap-2"
        >
          <Home className="w-5 h-5" />
          Go to Home Page
        </Button>
      </motion.div>
    </motion.div>
  );
}
