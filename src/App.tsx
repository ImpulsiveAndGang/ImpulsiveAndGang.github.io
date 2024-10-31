import React, { useState } from 'react';
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { clear } from 'console';

declare global {
  interface Window {
    bracketsViewer: any;
  }
}
const storage = new InMemoryDatabase();
const manager = new BracketsManager(storage);

interface TeamProps {
  teamName: string;
  onDelete: () => void;
}

interface Team {
  name: string;
}

interface tournamentData {
  participant: {
    id: number;
    tournament_id: number;
    name: string;
  }[];
  stage: {
    id: number;
    tournament_id: number;
    name: string;
    type: string;
    number: number;
    settings: {
      seedOrdering: string[];
      grandFinal: string;
      matchesChildCount: number;
      size: number;
    };
  }[];
  group: {
    id: number;
    stage_id: number;
    number: number;
  }[];
  round: {
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
  }[];
  match: {
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
    round_id: number;
    child_count: number;
    status: number;
    opponent1: {
      id: number | null;
      position?: number;
    };
    opponent2: {
      id: number | null;
      position?: number;
    };
  }[];
  match_game: any[];
}


const createTournament = async (teams: string[]): Promise<any> => {
  try {

    // fill up the teams array with the NO_TEAM string to the next power of 2
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)));
    const noTeam = 'NO_TEAM';
    const noTeamCount = nextPowerOf2 - teams.length;
    const noTeams = Array.from({ length: noTeamCount }, (_, i) => `${noTeam}_${i + 1}`);
    const allTeams = [...teams, ...noTeams];
    
    console.log(allTeams);

    const tournament = await manager.create.stage({
      tournamentId: 0,
      name: 'Spike rush tournament',
      type: 'double_elimination',
      seeding:allTeams,
      settings: { seedOrdering: ['natural'], grandFinal: 'simple' },
    });
    //console.log(JSON.stringify(storage, null, 2));
    return storage;
  } catch (error) {
    console.error(error);
  } 
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
  const [tournament, setTournament] = useState<tournamentData | null>(null);


  const handleDelete = (teamName: string) => {
    setTeams(teams.filter(team => team !== teamName));
  };

  const handleAdd = (teamName: string) => {
    setTeams([...teams, teamName]);
  };

  React.useEffect(() => {
    let initializeTournament = async () => {
      let tournamentdata = await createTournament(teams);
      setTournament(tournamentdata.data);
      console.log(tournamentdata.data);
      let stages = [tournamentdata.data.stage[tournamentdata.data.stage.length - 1]];
      let matches = tournamentdata.data.match;
      let matchGames = tournamentdata.data.match_game;
      let participants = tournamentdata.data.participant;
      //if there is a <div className="brackets-viewer"></div>
      // delete it
      const bracketsViewer = document.querySelector('.brackets-viewer');
      if (bracketsViewer) {
        bracketsViewer.remove();
      }
      // make a new <div className="brackets-viewer"></div>
      const bracketDiv = document.createElement('div');
      bracketDiv.className = 'brackets-viewer';
      // set content of the div to hello
      bracketDiv.innerHTML = 'Hello';
      document.getElementById('tournamentdiv')?.appendChild(bracketDiv);
      window.bracketsViewer.render(
        { stages, matches, matchGames, participants },
        { onMatchClick: (match: any) => console.log(match) }
      );

      //update the match one 


    };
    initializeTournament();
  }, [teams, tournament]);

  React.useEffect(() => {
    const eliminations = document.querySelectorAll('.elimination');
    if (eliminations.length > 1) {
      eliminations.forEach((elimination, index) => {
        if (index < eliminations.length - 1) {
          elimination.remove();
        }
      });
    }
  }, [tournament]);

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
              <div id="tournamentdiv">
              </div>
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

