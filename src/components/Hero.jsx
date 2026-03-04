import React from 'react';

export default function Hero() {
  return (
    <section className="hero">
      <h1 className="hero-title">
        Turn Ugly Commits Into{' '}
        <span className="hero-gradient">Beautiful Release Notes</span>
      </h1>
      <p className="hero-subtitle">
        Paste your git commits (or connect to GitHub) and instantly generate 
        user-friendly changelogs your customers will actually understand.
      </p>
      <div className="hero-flow">
        <div className="flow-box ugly">
          <span>fix: resolve null pointer in auth flow</span>
        </div>
        <span className="flow-arrow">→</span>
        <div className="flow-box beautiful">
          <span>🐛 Fixed a bug preventing some users from logging in</span>
        </div>
      </div>
    </section>
  );
}
