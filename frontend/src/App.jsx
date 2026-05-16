import { useState } from 'react';
import Landing from './components/Landing';
import Room from './components/Room';
import './App.css';

function App() {
  const [roomData, setRoomData] = useState(null);

  return (
    <div className="app">
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      {roomData ? (
        <Room roomData={roomData} onLeave={() => setRoomData(null)} />
      ) : (
        <Landing onJoin={setRoomData} />
      )}
    </div>
  );
}

export default App;
