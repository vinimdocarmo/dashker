export interface DockerContainerEvent {
  from: string;
  Action: "start" | "stop" | "destroy";
  Actor: {
    ID: string;
  };
}
