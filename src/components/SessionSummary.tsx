import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface SessionSummaryProps {
  poseName: string;
  level: number;
  accuracy: number;
  stability: number;
  symmetry: number;
  grade: string;
  feedback: string[];
  onNextLevel: () => void;
  isLastLevel: boolean;
}

export function SessionSummary({
  poseName,
  level,
  accuracy,
  stability,
  symmetry,
  grade,
  feedback,
  onNextLevel,
  isLastLevel
}: SessionSummaryProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "Advanced":
        return "bg-success text-white";
      case "Intermediate":
        return "bg-warning text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 className="w-16 h-16 mx-auto text-success" />
        </motion.div>
        <h2 className="text-3xl font-bold text-foreground">Level {level} Complete!</h2>
        <p className="text-lg text-muted-foreground">{poseName}</p>
      </div>

      {/* Grade Card */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Your Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Badge className={`text-2xl px-6 py-3 ${getGradeColor(grade)}`}>
            {grade}
          </Badge>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <div className="text-3xl font-bold text-accent">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <div className="text-3xl font-bold text-accent">{stability}%</div>
              <div className="text-sm text-muted-foreground">Stability</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <div className="text-3xl font-bold text-accent">{symmetry}%</div>
              <div className="text-sm text-muted-foreground">Symmetry</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Card */}
      {feedback.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Improvement Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedback.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-accent mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center"
      >
        <Button
          onClick={onNextLevel}
          size="lg"
          className="gap-2"
        >
          {isLastLevel ? (
            <>
              <Trophy className="w-5 h-5" />
              Complete Challenge
            </>
          ) : (
            <>
              Next Level
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
