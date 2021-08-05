import React, { useEffect, useState } from "react";
import { getContainers, startContainer, stopContainer } from "./api";
import { DockerContainer } from "./api/types/container.type";
import { Container } from "./components/Container";

function App() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const onRunClick = async (id: string): Promise<void> => {
    try {
      await startContainer(id);
    } catch (error) {
      console.error(error);
    }
  };

  const onStopClick = async (id: string): Promise<void> => {
    try {
      await stopContainer(id);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getContainers()
      .then((data) => setContainers(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className=" bg-blue-200 min-h-screen">
      <h1 className="text-xl">Docker dashboard</h1>
      {containers.map(({ id, name, status, state, image }) => (
        <Container
          key={id}
          id={id}
          name={name}
          image={image}
          status={status}
          state={state}
          onRunClick={onRunClick}
          onStopClick={onStopClick}
        />
      ))}
    </div>
  );
}

export default App;
