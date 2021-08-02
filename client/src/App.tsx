import React, { useEffect, useState } from "react";
import { Container } from "./Container";

interface IContainer {
  name: string;
  id: string;
}

function App() {
  const [containers, setContainers] = useState<IContainer[]>([]);

  useEffect(() => {
    fetch("http://localhost:3001/container")
      .then((res) => {
        if (res.status !== 200) {
          throw new Error('Error trying to fetch data')
        }

        return res.json();
      })
      .then((data) =>
        setContainers(
          data.map((container: { Names: string[]; Id: string; }) => ({
            name: container.Names[0],
            id: container.Id,
          }))
        )
      )
      .catch(err => console.error(err));
  }, []);

  return (
    <div className=" bg-blue-200 h-screen">
      <h1 className="text-xl">Docker dashboard</h1>
      {containers.map(({id, name}) => (
        <Container key={id} id={id} name={name} />
      ))}
    </div>
  );
}

export default App;
