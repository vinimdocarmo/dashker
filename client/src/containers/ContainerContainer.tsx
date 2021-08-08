import React, { useState } from "react";
import { Container } from "../components/Container";
import { removeContainer, startContainer, stopContainer } from "../api";

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
    "starting" | "stoping" | "removing" | "default"
  >();

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
    />
  );
}
