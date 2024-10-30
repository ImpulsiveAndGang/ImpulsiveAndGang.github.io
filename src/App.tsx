import React, { useState } from 'react';

interface TeamProps {
  teamName: string;
  onDelete: () => void;
}

/*
interface here defining matches , matches is a list of dicts
each dict has the bracket name, match id, winner, and next match id, t1 and t2 are the teams
*/
// Removed redundant Match interface

interface Matches {
  matches: Match[];
}

interface Team {
  name: string;
}

interface Match {
  id: number;
  round: number;
  isWinnerBracket: boolean;
  teams: Team[];
  winnerTo: number | null;
  loserTo: number | null;
  previousMatchIds: number[];
  winner: Team | null; // To store the winner after the match is completed
}

interface Bracket {
  matches: Match[];
}

function createDoubleEliminationBracket(teamNames: string[]): Bracket {
  const totalTeams = teamNames.length;
  const bracket: Bracket = { matches: [] };
  let matchCounter = 1;

  // Helper to create a match with connections
  function createMatch(round: number, isWinnerBracket: boolean, previousMatchIds: number[] = []): Match {
      const match: Match = {
          id: matchCounter++,
          round,
          isWinnerBracket,
          winnerTo: null,
          loserTo: null,
          teams: [],
          previousMatchIds,
          winner: null // Placeholder to assign the winner
      };
      bracket.matches.push(match);
      return match;
  }

  // Convert team names to Team objects
  const teams: Team[] = teamNames.map((name) => ({ name }));

  // Set up the Winners Bracket
  const winnersRounds = Math.ceil(Math.log2(totalTeams));
  let currentWinnersMatches: Match[] = [];

  // Initial round matches
  for (let i = 0; i < totalTeams / 2; i++) {
      const match = createMatch(1, true);
      match.teams = [teams[i * 2], teams[i * 2 + 1]];
      currentWinnersMatches.push(match);
  }

  // Winners bracket progression
  for (let round = 2; round <= winnersRounds; round++) {
      const nextRoundMatches: Match[] = [];
      for (let i = 0; i < currentWinnersMatches.length / 2; i++) {
          const match = createMatch(round, true, [
              currentWinnersMatches[i * 2].id,
              currentWinnersMatches[i * 2 + 1].id,
          ]);
          currentWinnersMatches[i * 2].winnerTo = match.id;
          currentWinnersMatches[i * 2 + 1].winnerTo = match.id;
          nextRoundMatches.push(match);
      }
      currentWinnersMatches = nextRoundMatches;
  }

  // Set up the Losers Bracket
  const losersRounds = winnersRounds * 2 - 1;
  let currentLosersMatches: Match[] = [];

  for (let round = 1; round <= losersRounds; round++) {
      const nextRoundMatches: Match[] = [];
      const numMatches = round % 2 === 1 ? currentLosersMatches.length + 1 : currentLosersMatches.length / 2;

      for (let i = 0; i < numMatches; i++) {
          const match = createMatch(round, false);
          nextRoundMatches.push(match);

          // Connect to previous Losers Bracket match
          if (round % 2 === 0 && i < currentLosersMatches.length / 2) {
              if (currentLosersMatches[i * 2] && currentLosersMatches[i * 2 + 1]) {
                  currentLosersMatches[i * 2].winnerTo = match.id;
                  currentLosersMatches[i * 2 + 1].winnerTo = match.id;
                  match.previousMatchIds = [
                      currentLosersMatches[i * 2].id,
                      currentLosersMatches[i * 2 + 1].id,
                  ];
              }
          }
      }
      currentLosersMatches = nextRoundMatches;
  }

  // Connect Winners Bracket losers to Losers Bracket
  for (let i = 0; i < winnersRounds - 1; i++) {
      const losersMatch = bracket.matches.find(
          (m) => m.round === i * 2 + 1 && !m.isWinnerBracket
      );
      const winnersMatch = bracket.matches.find(
          (m) => m.round === i + 1 && m.isWinnerBracket
      );
      if (winnersMatch && losersMatch) {
          winnersMatch.loserTo = losersMatch.id;
          losersMatch.previousMatchIds.push(winnersMatch.id);
      }
  }

  // Grand Final match
  const finalWinnerMatch = currentWinnersMatches[0];
  const finalLoserMatch = currentLosersMatches[0];
  const grandFinal = createMatch(winnersRounds + 1, true, [
      finalWinnerMatch.id,
      finalLoserMatch.id,
  ]);
  finalWinnerMatch.winnerTo = grandFinal.id;
  finalLoserMatch.winnerTo = grandFinal.id;

  return bracket;
}

const Team: React.FC<TeamProps> = ({ teamName, onDelete }) => {
  return (
    <li className='m-1'>
      {teamName} <button className="ml-2 bg-red-500 rounded text-white p-1" onClick={onDelete}>Delete</button>
    </li>
  );
};

function App() {
  const [teams, setTeams] = useState<string[]>(['Team 1', 'Team 2', 'Team 3']);

  const handleDelete = (teamName: string) => {
    setTeams(teams.filter(team => team !== teamName));
  };

  const handleAdd = (teamName: string) => {
    setTeams([...teams, teamName]);
  };

  const [matches, setMatches] = useState<Matches>({ matches: [] });

  React.useEffect(() => {
    setMatches(createDoubleEliminationBracket(teams));
  }, [teams]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-blue-600 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="text-xl font-semibold">Impulsive tournament site</div>
        </div>
      </nav>

      <div className='container'>
        <div className='flex'>
          <div className='w-3/12 p-4 border border-black rounded-md m-3'>
            {/* Left Column */}
            <div>
              <input type="checkbox" id="doubleElimination" name="doubleElimination" />
              <label htmlFor="doubleElimination"> Double Elimination</label>
            </div>
            <div className='flex'>
              <input id="teamadd" type="text" placeholder="Name of team" className="mt-2 p-2 border" />
              <button
              className="ml-2 bg-blue-600 text-white p-1 rounded"
              onClick={() => {
                const teamInput = document.getElementById('teamadd') as HTMLInputElement;
                const newTeam = teamInput.value.trim();
                if (newTeam) {
                handleAdd(newTeam);
                teamInput.value = '';
                }
              }}
              >
              Add
              </button>
            </div>
            <div className="mt-4">
              <ul>
                {teams.map(team => (
                  <Team key={team} teamName={team} onDelete={() => handleDelete(team)} />
                ))}
              </ul>
            </div>
          </div>
          <div className='w-9/12 p-4'>
            {/* Right Column */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Matches</h2>
              <p>Number of teams: {teams.length}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.matches.map((match) => (
                <div key={match.id} className="border p-4 rounded shadow">
                  <h3 className="text-lg font-semibold">Match ID: {match.id}</h3>
                  <p>T1: {match.teams[0]?.name || 'TBD'}</p>
                  <p>T2: {match.teams[1]?.name || 'TBD'}</p>
                  <p>{match.isWinnerBracket ? 'Winner Bracket' : 'Loser Bracket'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-600 text-white py-4 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-sm">&copy; 2024 Imp tournament maker site. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

