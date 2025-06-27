import React from 'react';

type HeaderProps = {
  score: number;
  level: number;
  title?: string;
};

export default function Header({ score, level, title = "🎮 Mouse Practice Game! 🎮" }: HeaderProps) {
  const progress = score % 100;

  return (
    <div className="header">
      <h1 className="title">{title}</h1>
      <div className="score">
        Score: <span>{score}</span> | Level: <span>{level}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
} 