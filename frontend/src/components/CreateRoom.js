import React, { useState } from "react";
import { createRoom } from "../utils/api";

const CreateRoom = () => {
    const [roomId, setRoomId] = useState(null);

    const handleCreateRoom = async () => {
        const data = await createRoom();
        setRoomId(data.roomId);
    };

    return (
        <div>
            <button onClick={handleCreateRoom}>Új szoba létrehozása</button>
            {roomId && <p>Szoba kódja: {roomId}</p>}
        </div>
    );
};

export default CreateRoom;
