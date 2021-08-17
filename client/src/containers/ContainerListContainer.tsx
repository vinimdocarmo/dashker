import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { getContainer, getContainers } from "../api";
import { DockerContainerEvent } from "../api/types/container-event.type";
import { DockerContainer } from "../api/types/container.type";
import { ContainerContainer } from "./ContainerContainer";

const ContainerListContainer: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const { lastJsonMessage } = useWebSocket(
    `ws://localhost:3001/ws/container/events`,
    {
      onClose: () => console.warn("connection closed for container events"),
      onOpen: () => console.info("connection opened for container events"),
      shouldReconnect: () => true,
      reconnectAttempts: 5,
    },
    true
  );

  useEffect(() => {
    getContainers()
      .then((data) => setContainers(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const event = lastJsonMessage as DockerContainerEvent;

    if (event?.Action === "start" || event?.Action === "stop") {
      // update container started/stoped
      getContainer(event.Actor.ID)
        .then((container) => {
          setContainers((oldContainers) =>
            oldContainers.map((c) => {
              if (c.id === container.id) {
                return { ...container };
              }
              return { ...c };
            })
          );
        })
        .catch((err) => console.error(err));
    } else if (event?.Action === "destroy") {
      // remove container detroyed from list
      setContainers((oldContainers) =>
        oldContainers
          .filter((c) => c.id !== event.Actor.ID)
          .map((c) => ({ ...c }))
      );
    }
  }, [lastJsonMessage]);

  return (
    <>
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
    </>
  );
};

export default ContainerListContainer;
