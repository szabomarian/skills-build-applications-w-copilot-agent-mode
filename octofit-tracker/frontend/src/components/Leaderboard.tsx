import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Ranking = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [rankings, setRankings] = useState<Ranking[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ leaderboard: Ranking[] }>('/api/leaderboard')
      .then((data) => setRankings(data.leaderboard))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        {error ? <p role="alert">Unable to load leaderboard: {error}</p> :
          rankings === null ? <p role="status">Loading leaderboard...</p> :
          rankings.length === 0 ? <p>No leaderboard scores available.</p> :
          <ol className="list-group list-group-numbered">
            {rankings.map((ranking) => (
              <li className="list-group-item" key={ranking.teamName}>
                {ranking.teamName}: {ranking.totalPoints} points
              </li>
            ))}
          </ol>}
      </div>
    </section>
  );
}
