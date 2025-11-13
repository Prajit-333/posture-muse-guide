import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PoseCard } from "@/components/PoseCard";
import { ChallengeFlow } from "@/components/ChallengeFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Library, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PoseData {
  slug: string;
  name: string;
  difficulty: string;
  thumbnail: string;
  targetAngles: Record<string, number>;
  tolerances: Record<string, number>;
  weights: Record<string, number>;
  criticalJoints: string[];
  short: string;
  steps: string[];
  tips: string[];
  hold_seconds: number;
}

interface PosesJson {
  library: PoseData[];
  challenge: Array<{ level: number; slug: string; name: string; difficulty: string }>;
}

const Index = () => {
  const [view, setView] = useState<"landing" | "main" | "challenge">("landing");
  const [posesData, setPosesData] = useState<PosesJson | null>(null);
  const [selectedPose, setSelectedPose] = useState<string | null>(null);

  useEffect(() => {
    fetch("/poses.json")
      .then(res => res.json())
      .then(data => setPosesData(data))
      .catch(err => console.error("Failed to load poses:", err));
  }, []);

  if (!posesData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl w-full text-center space-y-8"
        >
          {/* Hero Section */}
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-6xl font-bold text-foreground tracking-tight">
                Pose Perfect
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground"
            >
              Master the pose. Pose yourself.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap"
            >
              <span className="flex items-center gap-2">
                <Library className="w-4 h-4" />
                10+ poses
              </span>
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                5-level Expert Challenge
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                On-device & Private
              </span>
            </motion.div>
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => setView("challenge")}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Start Challenge
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("main")}
              className="text-lg px-8 py-6"
            >
              <Library className="w-5 h-5 mr-2" />
              Explore Poses
            </Button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-8 space-y-3 text-sm text-muted-foreground"
          >
            <p className="flex items-center justify-center gap-2">
              ✓ Real-time skeletal overlay & 3D joint tracking
            </p>
            <p className="flex items-center justify-center gap-2">
              ✓ Personalized feedback — no camera data uploaded
            </p>
            <p className="flex items-center justify-center gap-2">
              ✓ Gamified progression: hold, earn, level up
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (view === "challenge") {
    const isSinglePractice = !!selectedPose;
    // build challenge levels: either full challenge or a single pose practice
    const challengeLevelsToUse = isSinglePractice
      ? (() => {
          const p = posesData.library.find(pl => pl.slug === selectedPose);
          return p ? [{ level: 1, slug: p.slug, name: p.name, difficulty: p.difficulty }] : posesData.challenge;
        })()
      : posesData.challenge;

    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setView(isSinglePractice ? "main" : "landing")}
            className="mb-6"
          >
            ← Back
          </Button>

          <ChallengeFlow
            challengeLevels={challengeLevelsToUse}
            poseLibrary={posesData.library}
            onComplete={() => {
              // after practice/challenge complete, return to appropriate view
              setView(isSinglePractice ? "main" : "landing");
              setSelectedPose(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pose Perfect</h1>
            <p className="text-sm text-muted-foreground">Master your yoga practice</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setView("challenge")}>
              <Trophy className="w-4 h-4 mr-2" />
              Challenge
            </Button>
            <Button variant="ghost" onClick={() => setView("landing")}>
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="library" className="space-y-6">
          <TabsList>
            <TabsTrigger value="library">
              <Library className="w-4 h-4 mr-2" />
              Practice Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">10+ Yoga Poses</h2>
              <p className="text-muted-foreground">
                Practice individual poses with real-time feedback and guidance
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {posesData.library.map(pose => (
                <PoseCard
                  key={pose.slug}
                  {...pose}
                  onSelect={() => {
                    // Start single-pose practice
                    setSelectedPose(pose.slug);
                    setView("challenge");
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
