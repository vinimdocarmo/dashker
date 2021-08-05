import React, { useEffect, useState } from "react";
import { Container } from "./components/Container";

interface IContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

function startContainer(id: string): Promise<string> {
  return fetch(`http://localhost:3001/container/${id}/start`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Error trying to start container");
        }

        return res.text();
      });
}

function stopContainer(id: string) {
  return fetch(`http://localhost:3001/container/${id}/stop`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Error trying to start container");
        }
      });
}

function App() {
  const [containers, setContainers] = useState<IContainer[]>([]);
  const onRunClick = async (id: string): Promise<void> => {
    try {
      const logs = await startContainer(id);

      console.log(logs);
    } catch (error) {
      console.error(error);
    }
  }

  const onStopClick = async (id: string): Promise<void> => {
    try {
      await stopContainer(id);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetch("http://localhost:3001/container")
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Error trying to fetch data");
        }

        return res.json();
      })
      .then((data) =>
        setContainers(
          data.map(
            (container: { Names: string[]; Id: string; Status: string, State: string; Image: string; }) => ({
              name: container.Names[0],
              image: container.Image,
              id: container.Id,
              status: container.Status,
              state: container.State,
            })
          )
        )
      )
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className=" bg-blue-200 min-h-screen">
      <h1 className="text-xl">Docker dashboard</h1>
      {containers.map(({ id, name, status, state, image }) => (
        <Container key={id} id={id} name={name} image={image} status={status} state={state} onRunClick={onRunClick} onStopClick={onStopClick} />
      ))}
    </div>
  );
}

export default App;
