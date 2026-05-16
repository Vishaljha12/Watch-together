import { useState } from 'react';
import Join from './components/Join';
import Room from './components/Room';
import './App.css';

function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomData, setRoomData] = useState(null);

  const handleJoin = (data) => {
    setRoomData(data);
    setInRoom(true);
  };

  const handleLeave = () => {
    setInRoom(false);
    setRoomData(null);
  };

  return (
    <div className="app-container">
      {inRoom ? (
        <Room roomData={roomData} onLeave={handleLeave} />
      ) : (
        <Join onJoin={handleJoin} />
      )}
    </div>
  );
}

export default App;
