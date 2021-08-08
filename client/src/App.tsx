import React, { useEffect, useState } from "react";
import { getContainers } from "./api";
import { DockerContainer } from "./api/types/container.type";
import { ContainerContainer } from "./containers/ContainerContainer";

function App() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);

  useEffect(() => {
    getContainers()
      .then((data) => setContainers(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className=" bg-blue-200 min-h-screen">
      <h1 className="text-xl">Docker dashboard</h1>
      {containers.map(({ id, name, status, state, image }) => (
        <ContainerContainer
          key={id}
          id={id}
          name={name}
          image={image}
          status={status}
          state={state}
          onContainerRemove={(id) => {
            setContainers((oldContainers) => {
              return [
                ...oldContainers.filter((container) => container.id !== id),
              ];
            });
          }}
        />
      ))}
    </div>
  );
}

export default App;
