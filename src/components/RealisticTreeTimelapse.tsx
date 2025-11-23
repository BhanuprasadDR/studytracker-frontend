import React, { useEffect, useRef, useState } from 'react';
import { Clock, Target, Sparkles, Play, Pause, RotateCcw, Settings } from 'lucide-react';

interface RealisticTreeTimelapseProps {
  studyHours: number;
  dailyTargetHours: number;
}

const RealisticTreeTimelapse: React.FC<RealisticTreeTimelapseProps> = ({
  studyHours,
  dailyTargetHours
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const treeRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);

  const progress = Math.min((studyHours / dailyTargetHours) * 100, 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 550;
    const H = 480;
    canvas.width = W;
    canvas.height = H;

    // Colors
    const TREE_COLOR = '#52351a';
    const LEAF_COLOR = '#598030';
    const FLOWER_PETAL = '#f5b4cd';
    const FLOWER_CORE = '#fff';
    const SEED_COLOR = '#98754d';

    // Branch class
    function Branch(x: number, y: number, angle: number, len: number, width: number, gen: number) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.len = len;
      this.width = width;
      this.gen = gen;
      this.grown = 0;
      this.children = [];
      this.leaf = null;
      this.flower = null;
      this.isTerminal = false;
    }

    function plantSeed(x: number, y: number) {
      treeRef.current = {
        x: x,
        y: y,
        age: 0,
        stage: 0,
        branches: [],
        leaves: [],
        flowers: []
      };
      treeRef.current.branches.push(new Branch(x, y, -Math.PI/2, 70, 13, 0));
    }

    function drawGround() {
      ctx.save();
      ctx.fillStyle = "#e2e7d8";
      ctx.fillRect(0, H-30, W, 40);
      ctx.restore();
    }

    function drawSeed(x: number, y: number) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y-4, 4, 8, 0, 0, Math.PI*2);
      ctx.fillStyle = SEED_COLOR;
      ctx.shadowColor = "#b79567";
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.restore();
    }

    function drawBranch(br: any) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(br.x, br.y);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, br.width * br.grown);
      let ex = br.x + Math.cos(br.angle) * br.len * br.grown;
      let ey = br.y + Math.sin(br.angle) * br.len * br.grown;
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = TREE_COLOR;
      ctx.shadowColor = "#856239";
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();
    }

    function drawLeaf(leaf: any) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.a - Math.PI/2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 15, 0, 0, Math.PI*2);
      ctx.fillStyle = LEAF_COLOR;
      ctx.globalAlpha = 0.97;
      ctx.shadowColor = "#78976e";
      ctx.shadowBlur = 7;
      ctx.fill();
      ctx.restore();
    }

    function drawFlower(fl: any) {
      ctx.save();
      ctx.translate(fl.x, fl.y);
      let t = Date.now()/800 + fl.t;
      ctx.rotate(Math.sin(t)*0.06);
      let petalL = 10, petalW = 5;
      for(let i=0; i<5; ++i) {
        ctx.rotate(Math.PI*2/5);
        ctx.beginPath();
        ctx.ellipse(0, -petalL/1.2, petalW, petalL, 0, 0, Math.PI*2);
        ctx.fillStyle = FLOWER_PETAL;
        ctx.globalAlpha = 0.95;
        ctx.shadowColor = "#dfa5cc";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      // Flower center
      ctx.beginPath();
      ctx.arc(0,0,3,0,Math.PI*2);
      ctx.fillStyle = FLOWER_CORE;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.restore();
    }

    function growTree() {
      const tree = treeRef.current;
      if (!tree) return;

      ctx.clearRect(0, 0, W, H);
      drawGround();
      
      let proceed = false;

      // Force growth based on progress
      if (progress >= 10 && tree.stage < 1) {
        tree.stage = 1;
        setCurrentStage(1);
      }
      if (progress >= 40 && tree.stage < 2) {
        tree.stage = 2;
        setCurrentStage(2);
      }
      if (progress >= 70 && tree.stage < 3) {
        tree.stage = 3;
        setCurrentStage(3);
      }

      // Grow branches
      tree.branches.forEach(function growBranch(branch: any) {
        if (branch.grown < 1) {
          const speed = isPlaying ? Math.max(0.02, progress / 500) : 0;
          branch.grown += speed * (1 - 0.05 * branch.gen);
          if (branch.grown > 1) branch.grown = 1;
          proceed = true;
        }
        
        drawBranch(branch);
        
        // Spawn children
        if (branch.grown > 0.72 && branch.children.length === 0 && branch.gen < 3) {
          let splits = (branch.gen === 0) ? 3 : Math.random() < 0.7 ? 2 : 3;
          let spread = branch.gen === 0 ? 1 : 0.7;
          for (let i = 0; i < splits; i++) {
            let a = branch.angle + (i - (splits - 1) / 2) * Math.PI * 0.24 * spread;
            let l = branch.len * (0.86 + Math.random() * 0.08);
            let w = branch.width * 0.65;
            let child = new Branch(
              branch.x + Math.cos(branch.angle) * branch.len,
              branch.y + Math.sin(branch.angle) * branch.len,
              a, l, w, branch.gen + 1
            );
            branch.children.push(child);
            tree.branches.push(child);
          }
          if (branch.gen === 3) branch.isTerminal = true;
        }
        
        // Grow children
        branch.children.forEach(growBranch);
      });

      // Add leaves on terminal branches
      if (tree.stage >= 2) {
        tree.branches.filter((b: any) => (b.isTerminal || b.gen >= 2) && b.grown >= 0.9 && !b.leaf)
          .forEach((b: any) => {
            b.leaf = {
              x: b.x + Math.cos(b.angle) * b.len,
              y: b.y + Math.sin(b.angle) * b.len,
              a: b.angle
            };
            tree.leaves.push(b.leaf);
          });
      }

      // Add flowers on tips
      if (tree.stage >= 3) {
        tree.branches.filter((b: any) => (b.isTerminal || b.gen >= 2) && b.grown >= 0.9 && !b.flower)
          .forEach((b: any) => {
            b.flower = {
              x: b.x + Math.cos(b.angle) * b.len,
              y: b.y + Math.sin(b.angle) * b.len,
              angle: b.angle,
              t: Math.random() * Math.PI * 2
            };
            tree.flowers.push(b.flower);
          });
      }

      // Draw leaves and flowers
      tree.leaves.forEach(drawLeaf);
      tree.flowers.forEach(drawFlower);

      // Draw seed if stage 0
      if (tree.stage === 0) drawSeed(tree.x, tree.y);

      // Stage transitions
      if (tree.stage === 1 && tree.branches.every((b: any) => b.grown >= 1)) {
        tree.stage = 2;
        proceed = true;
      }
      if (tree.stage === 2 && tree.leaves.length >= 5) {
        tree.stage = 3;
        proceed = true;
      }

      // Continue animation
      if (proceed || tree.stage < 3 || isPlaying) {
        animationRef.current = requestAnimationFrame(growTree);
      }
    }

    function drawTree() {
      const tree = treeRef.current;
      if (!tree) return;
      
      ctx.clearRect(0, 0, W, H);
      drawGround();
      tree.branches.forEach(drawBranch);
      tree.leaves.forEach(drawLeaf);
      tree.flowers.forEach(drawFlower);
      if (tree.stage === 0) drawSeed(tree.x, tree.y);
    }

    // Initialize tree
    plantSeed(W / 2, H - 32);
    
    // Start growing if there's progress
    if (progress > 0) {
      treeRef.current.stage = 1;
      setCurrentStage(1);
    }
    
    // Start animation
    growTree();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress, isPlaying]);

  const getStageDescription = () => {
    if (currentStage === 0) return { emoji: '🌱', name: 'Seed', desc: 'Start studying to see your tree grow!' };
    if (currentStage === 1) return { emoji: '🌿', name: 'Sapling', desc: 'Your tree is beginning to grow!' };
    if (currentStage === 2) return { emoji: '🍃', name: 'Young Tree', desc: 'Excellent! Your tree has beautiful leaves.' };
    if (currentStage === 3) return { emoji: '🌸', name: 'Blooming', desc: 'Perfect! Your tree is blooming with flowers!' };
    return { emoji: '🌱', name: 'Seed', desc: 'Start studying to see your tree grow!' };
  };

  const stage = getStageDescription();

  const resetTree = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setCurrentStage(0);
    // Trigger re-render
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Beautiful Blossom Tree
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Watch your beautiful blossom tree grow as you study throughout the day
        </p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Study Hours Today</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {studyHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Target</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {dailyTargetHours}h
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth Progress</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {progress.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <button
              onClick={resetTree}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Info</span>
            </button>
          </div>
          
          {showControls && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Growth Stages:</strong></p>
                <p>• 0-10%: Seed planted in soil</p>
                <p>• 10-40%: Sapling with trunk and branches</p>
                <p>• 40-70%: Young tree with green leaves</p>
                <p>• 70-100%: Mature tree with pink blossoms</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tree Canvas */}
      <div className="flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-2xl bg-white"
            style={{ boxShadow: '0 6px 32px #b0bea6' }}
          />
          
          {/* Progress Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-800 font-medium">Growth Progress</span>
              <span className="text-gray-800 font-bold">{progress.toFixed(1)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className="h-3 rounded-full transition-all duration-1000 bg-gradient-to-r from-green-400 to-pink-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-600">
              <span className={progress >= 10 ? 'text-green-600 font-bold' : ''}>🌱 Seed</span>
              <span className={progress >= 40 ? 'text-green-600 font-bold' : ''}>🌿 Sapling</span>
              <span className={progress >= 70 ? 'text-green-600 font-bold' : ''}>🍃 Leaves</span>
              <span className={progress >= 100 ? 'text-pink-600 font-bold' : ''}>🌸 Blossoms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Stage Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Current Growth Stage
        </h3>
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{stage.emoji}</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{stage.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stage.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealisticTreeTimelapse;