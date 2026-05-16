import React, { useEffect } from 'react';
import './FORTE_Crawl.css';
import credits from './FORTE_Credits.json';

export default function FORTELoader({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete && onComplete(), 25000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="forte-loader">
      <div className="grid-background"></div>
      <div className="star-wars">
        <p className="intro">{credits.intro}</p>
        <h1 className="title">{credits.title}</h1>
        {credits.story.map((line, index) => <p key={index}>{line}</p>)}
        <div className="credits">
          {credits.credits.map((person, index) => (
            <p key={index}><strong>{person.name}</strong> – {person.role}</p>
          ))}
        </div>
      </div>
    </div>
  );
}