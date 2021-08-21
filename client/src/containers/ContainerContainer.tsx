import React, { useState } from "react";
import { Container } from "../components/Container";
import {
  removeContainer,
  restartContainer,
  startContainer,
  stopContainer,
} from "../api";
import useWebSocket from "react-use-websocket";

type ContainerContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  onContainerRemove: (id: string) => void;
};

export function ContainerContainer({
  id,
  name,
  image,
  status,
  state,
  onContainerRemove = () => {},
}: ContainerContainerProps) {
  const [loadingState, setLoadingState] = useState<
    "starting" | "stoping" | "removing" | "restarting" | "default"
  >();
  const { lastJsonMessage } = useWebSocket(
    `ws://localhost:3001/ws/container/${id}/stats`,
    {
      onClose: () => console.warn("connection closed for container ", id),
      onOpen: () => {
        console.info("connection opened for container ", id);
      },
      shouldReconnect: () => true,
      reconnectAttempts: 3,
      reconnectInterval: 500,
    },
    state === "running"
  );

  const onStartClick = async (id: string): Promise<void> => {
    try {
      setLoadingState("starting");
      await startContainer(id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState("default");
    }
  };

  const onStopClick = async (id: string): Promise<void> => {
    try {
      setLoadingState("stoping");
      await stopContainer(id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState("default");
    }
  };

  const onRemoveClick = async (id: string): Promise<void> => {
    try {
      setLoadingState("removing");
      await removeContainer(id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState("default");
      onContainerRemove(id);
    }
  };

  const onRestartClick = async (id: string): Promise<void> => {
    try {
      setLoadingState("restarting");
      await restartContainer(id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState("default");
    }
  };

  return (
    <Container
      id={id}
      name={name}
      image={image}
      status={status}
      state={state}
      loadingState={loadingState}
      onStartClick={onStartClick}
      onStopClick={onStopClick}
      onRemoveClick={onRemoveClick}
      onRestartClick={onRestartClick}
      stats={{
        cpuUsage: lastJsonMessage?.cpuUsagePerc,
        usedMemory: lastJsonMessage?.usedMemory,
        availableMemory: lastJsonMessage?.availableMemory,
      }}
    />
  );
}
