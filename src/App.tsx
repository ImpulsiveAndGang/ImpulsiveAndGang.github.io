import React, { useState } from 'react';
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { Sortable } from '@shopify/draggable';

declare global {
  interface Window {
    bracketsViewer: any;
  }
}


interface TeamProps {
  teamName: string;
  onDelete: () => void;
}

interface Team {
  name: string;
}


const createTournament = async (teams: string[], manager:BracketsManager, double_elimination:Boolean): Promise<any> => {
  try {

    // fill up the teams array with the NO_TEAM string to the next power of 2
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)));
    const noTeam = 'NO_TEAM';
    const noTeamCount = nextPowerOf2 - teams.length;
    const noTeams = Array.from({ length: noTeamCount }, (_, i) => `${noTeam}_${i + 1}`);

    // if there are more then 2 NO_TEAM teams, card shuffle the teams
    let allTeams: string[] = [];
    if (noTeams.length >= 2) {
      let teamsleft = teams.length;
      for (let i = 0; i < noTeams.length; i++) {
        allTeams.push(teams[i]);
        allTeams.push(noTeams[i]);
        teamsleft--;
      }
      for (let i = 0; i < teamsleft; i++) {
        allTeams.push(teams[i + noTeams.length]);
      }
    }
    else {
      allTeams = [...teams, ...noTeams];
    }

    
    console.log(allTeams);

    const typee: 'single_elimination' | 'double_elimination' = double_elimination ? 'double_elimination' : 'single_elimination';

    await manager.create.stage({
      tournamentId: 0,
      name: 'Spike rush tournament',
      type: typee,
      seeding: allTeams,
      settings: { seedOrdering: ['natural'], grandFinal: 'simple' },
    });
    //console.log(JSON.stringify(storage, null, 2));
    return manager;
  } catch (error) {
    console.error(error);
  } 
}

const getManager = async (manager: BracketsManager): Promise<any> => {
  return manager;
}

const Team: React.FC<TeamProps> = ({ teamName, onDelete }) => {
  return (
    <li >
      <div className='mb-1 flex justify-between items-center border p-1'>
      <span>{teamName}</span>
      <button className="ml-2 bg-red-500 rounded text-white p-1" onClick={onDelete}>Delete</button>
      </div>
    </li>
  );
};

function App() {
  const [teams, setTeams] = useState<string[]>(['Team 1', 'Team 2', 'Team 3']);
  const [doubleElimination, setDoubleElimination] = useState<boolean>(false);

  const storage = new InMemoryDatabase();
  const manager = new BracketsManager(storage);
  
  const handleDelete = (teamName: string) => {
    setTeams(teams.filter(team => team !== teamName));
  };

  const handleAdd = (teamName: string) => {
    setTeams([...teams, teamName]);
  };

  const rerendering = async (manager:any) => {
    const bracketviewernode = document.querySelector('.brackets-viewer');
    bracketviewernode?.replaceChildren();

    //before rerenndering get all the matches from the manager
    let matchese = await manager.storage.select('match');
    let all_participants = await storage.select('participant');
    let no_team_ids = all_participants ? all_participants.filter((participant: any) => participant.name.includes('NO_TEAM')).map((participant: any) => participant.id) : [];
    let no_team_matches = matchese ? matchese.filter((match: any) => no_team_ids.includes(match.opponent1.id) || no_team_ids.includes(match.opponent2.id)) : [];
    console.log(no_team_matches);
    //update these matches so that the NO_TEAM participant is the loser
    for (let match of no_team_matches) {
      try {
        // check if the opponent1 is a NO_TEAM participant
        if (match.opponent1 && no_team_ids.includes(match.opponent1.id)) {
          await manager.update.match({
            id: match.id,
            opponent1: { score: 0 },
            opponent2: { score: 1, result: "win" },
          });
        } else {
          await manager.update.match({
            id: match.id,
            opponent1: { score: 1, result: "win" },
            opponent2: { score: 0 },
          });
        }
      } catch (error) {
        console.error(error);
      }
    }

    let new_manager_data = await getManager(manager);
    console.log(new_manager_data);
    let stages = [new_manager_data.storage.data.stage[new_manager_data.storage.data.stage.length - 1]];
    let matches = new_manager_data.storage.data.match;
    let matchGames = new_manager_data.storage.data.match_game;
    let participants = new_manager_data.storage.data.participant;

    window.bracketsViewer.render(
      { stages, matches, matchGames, participants },
      { onMatchClick: (match: any) => makeModal(match,manager)}
    );
  }
  
  const makeModal = async(match:any, manager:any) => {
    console.log(match);
    let p1 = match.opponent1.id;
    let p2 = match.opponent2.id;

    // if status is not 2 (finished) return
    if (match.status !== 2) {
      return;
    }

    // get the names from the teams from the manager storage by looking for the participants ids
    let storage = manager.storage;
    let participants = await storage.select('participant');
    let participant1 = participants.find((participant: any) => participant.id === p1);
    let participant2 = participants.find((participant: any) => participant.id === p2);
    let p1name = participant1 ? participant1.name : 'TBD';
    let p2name = participant2 ? participant2.name : 'TBD';

    const modal = document.createElement('div');
    modal.classList.add('fixed', 'top-0', 'left-0', 'w-full', 'h-full', 'bg-black', 'bg-opacity-50', 'flex', 'justify-center', 'items-center');
    modal.innerHTML = `
      <div class="bg-white p-8 rounded-md w-1/2">
        <div class="flex justify-between mt-4">
          <span class="text-xl">${p1name}</span>
          <button class="bg-green-500 text-white p-2 rounded " id="winner1">Winner</button>
        </div>
        <div class="flex justify-between mt-4">
          <span class="text-xl">${p2name}</span>
          <button class="bg-green-500 text-white p-2 rounded " id="winner2">Winner</button>
        </div>
        <div class="flex justify-between mt-4">
          <button class="bg-gray-600 text-white p-2 rounded w-full" id="closeModal">Close</button>
        </div>
      </div>
    `;

    modal.querySelector('#winner1')?.addEventListener('click', async () => {
      console.log(p1);
      // update the match with the winner
      await manager.update.match({
      id: match.id,
      opponent1: { score: 1, result: "win" },
      opponent2: { score: 0 },
      });

      //rerender the brackets
      await rerendering(manager);
      
      //close the modal
      modal.remove();
    });

    modal.querySelector('#winner2')?.addEventListener('click', async () => {
      console.log(p2);
      // update the match with the winner
      await manager.update.match({
      id: match.id,
      opponent1: { score: 0 },
      opponent2: { score: 1, result: "win" },
      });

      //rerender the brackets
      await rerendering(manager);

      //close the modal
      modal.remove();
    });

    modal.querySelector('#closeModal')?.addEventListener('click', () => {
      modal.remove();
    });
    document.body.appendChild(modal);
  }

  const handleCreateTournament = async () => {
    const tournamentdata = await createTournament(teams,manager,doubleElimination);

    //get all the matches from the manager
    let storage = manager.storage
    let matchese = await storage.select('match');
    let all_participants = await storage.select('participant');
    let no_team_ids = all_participants ? all_participants.filter((participant: any) => participant.name.includes('NO_TEAM')).map((participant: any) => participant.id) : [];
    console.log(no_team_ids);      
    console.log(matchese);
    // get all matches where one the participants is a NO_TEAM id
    let no_team_matches = matchese ? matchese.filter((match: any) => no_team_ids.includes(match.opponent1.id) || no_team_ids.includes(match.opponent2.id)) : [];
    console.log(no_team_matches);
    //update these matches so that the NO_TEAM participant is the loser
    for (let match of no_team_matches) {
      // check if the opponent1 is a NO_TEAM participant
      if (match.opponent1 && no_team_ids.includes(match.opponent1.id)) {
        await manager.update.match({
          id: match.id,
          opponent1: { score: 0 },
          opponent2: { score: 1, result: "win" },
        });
      } else {
        await manager.update.match({
          id: match.id,
          opponent1: { score: 1, result: "win" },
          opponent2: { score: 0 },
        });
      }
    }

    // get the matches again and now look for matches where both participants are NO_TEAM
    matchese = await storage.select('match');
    no_team_matches = matchese ? matchese.filter((match: any) => no_team_ids.includes(match.opponent1.id) && no_team_ids.includes(match.opponent2.id)) : [];
    console.log(no_team_matches);
    //update these matches so that the first participant is the winner
    for (let match of no_team_matches) {
      await manager.update.match({
        id: match.id,
        opponent1: { score: 1, result: "win" },
        opponent2: { score: 0 },
      });
    }

    rerendering(manager);
  };

  React.useEffect(() => {
    handleCreateTournament();
  }, []);

  React.useEffect(() => {
    const eliminations = document.querySelectorAll('.elimination');
    if (eliminations.length > 1) {
      eliminations.forEach((elimination, index) => {
        if (index < eliminations.length - 1) {
          elimination.remove();
        }
      });
    }
  }, [teams]);

  React.useEffect(() => {
    const draggableElement = document.getElementById('draggableteams');
    if (draggableElement) {
      const sortable = new Sortable(draggableElement, {
        draggable: 'li',
      });

      sortable.on('sortable:stop', () => {
        let newTeams = Array.from(draggableElement.children).map((child) => {
          //get the innerhtml of the span of the child
          let span = child.querySelector('span');
          let teamname = span ? span.innerHTML : '';
          return teamname;
        });
        //get unique values
        newTeams = Array.from(new Set(newTeams));
        setTeams(newTeams);
      });

      return () => {
        sortable.destroy();
      };
    }
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
              <input
                type="checkbox"
                id="doubleElimination"
                name="doubleElimination"
                checked={doubleElimination}
                onChange={(e) => setDoubleElimination(e.target.checked)}
              />
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
              <ul id="draggableteams">
                {teams.map(team => (
                  <Team key={team} teamName={team} onDelete={() => handleDelete(team)} />
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <button
                className="w-full bg-red-600 text-white p-2 rounded"
                onClick={handleCreateTournament}
              >
                Reset Tournament Bracket
              </button>
            </div>
          </div>
          <div className='w-9/12 p-4'>
            {/* Right Column */}
            <div>
              <div id="tournamentdiv">
                <div className="brackets-viewer"></div>
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

