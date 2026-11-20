import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = {
  title: string;
  reason: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ suggestions: Workout[] }>('/api/workouts/suggestions/mona%40example.com')
      .then((data) => setSuggestions(data.suggestions))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        {error ? <p role="alert">Unable to load workout suggestions: {error}</p> :
          suggestions === null ? <p role="status">Loading workout suggestions...</p> :
          suggestions.length === 0 ? <p>No workout suggestions available.</p> :
          <ul className="list-group">
            {suggestions.map((suggestion) => (
              <li className="list-group-item" key={suggestion.title}>
                {suggestion.title} - {suggestion.reason}
              </li>
            ))}
          </ul>}
      </div>
    </section>
  );
}
