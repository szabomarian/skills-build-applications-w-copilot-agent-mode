import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  name: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        {error ? <p role="alert">Unable to load teams: {error}</p> :
          teams === null ? <p role="status">Loading teams...</p> :
          teams.length === 0 ? <p>No teams available.</p> :
          <ul className="list-group">
            {teams.map((team) => (
              <li className="list-group-item" key={team.name}>
                {team.name} - {team.members.length} members
              </li>
            ))}
          </ul>}
      </div>
    </section>
  );
}
