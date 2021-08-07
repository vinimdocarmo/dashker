import React, { useCallback, useEffect, useRef, useState } from "react";
import cls from "classnames";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { PlayIcon } from "./icons/PlayIcon";
import { PauseIcon } from "./icons/PauseIcon";

type ContainerProps = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  onRunClick: (id: string) => void;
  onStopClick: (id: string) => void;
};

export function Container({
  id,
  name,
  image,
  status,
  state,
  onRunClick,
  onStopClick,
}: ContainerProps) {
  const nop = () => {};
  const logBottomEl = useRef<HTMLDivElement>(null);
  const logTerminalEl = useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [socketOpen, setSocketOpen] = useState(false);
  const isRunning = useCallback(() => state === "running", [state]);
  const isCreated = useCallback(() => state === "created", [state]);
  const isExited = useCallback(() => state === "exited", [state]);
  const [logsHistory, setLogsLineHisoty] = useState<
    { message: string; timestamp: string }[] | null
  >(null);

  const { lastJsonMessage, readyState, sendMessage } = useWebSocket(
    "ws://localhost:3001/ws/container/logs",
    {
      onClose: () => console.warn("connection closed for container ", image),
      onOpen: () => {
        console.info("connection opened for container ", image);
        sendMessage(id);
      },
      // shouldReconnect: () => true // TODO: implement reconnect, but pass last timestamp as argument
    },
    socketOpen // TODO: implement closing the connection
  );

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    setLogsLineHisoty((oldLogsLineHistory) => {
      return oldLogsLineHistory
        ? [...oldLogsLineHistory, lastJsonMessage]
        : [lastJsonMessage];
    });
  }, [lastJsonMessage]);

  // Scroll terminal to bottom as soon as new logs arrive
  useEffect(() => {
    if (logsHistory && logsHistory.length > 0) {
      logTerminalEl.current?.scrollTo({ top: logBottomEl.current?.offsetTop });
    }
  }, [logsHistory]);

  return (
    <div
      key={id}
      className={cls(
        "p-6 bg-white rounded-md shadow-md mt-2 first:mt-0 border-l-8",
        {
          "border-green-600": isRunning(),
          "border-red-600": isCreated(),
          "border-gray-600": isExited(),
        }
      )}
    >
      <div className="flex items-center space-x-4 justify-between">
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <img
              className="h-12 w-12"
              src="/docker-icon.jpeg"
              alt="Container Logo"
            />
          </div>
          <div>
            <div
              className=" text-lg font-medium text-black"
              onClick={() => {
                setShowLogs(true);
              }}
            >
              <span>{image}</span>
              <span className="ml-1 text-xs text-gray-500">{name}</span>
            </div>
            <p className="text-gray-500" title={id}>
              {id.slice(0, 10)} <span>&#8226; </span>
              <span className="text-xs">{status}</span>
            </p>
          </div>
        </div>

        <div className="flex">
          <PlayIcon
            size="30"
            className={cls("mr-2", {
              "text-gray-400": isRunning(),
              "cursor-pointer text-gray-900": !isRunning(),
            })}
            onClick={!isRunning() ? () => onRunClick(id) : nop}
          />
          {/* TODO: change pause icon to stop icon */}
          <PauseIcon
            size="30"
            className={cls({
              "text-gray-400": !isRunning(),
              "cursor-pointer text-gray-900": isRunning(),
            })}
            onClick={isRunning() ? () => onStopClick(id) : nop}
          />
        </div>
      </div>

      {showLogs && (
        <div className="resize-y bg-gray-900 border-2 border-gray-500 p-2 mt-3 font-mono text-xs relative">
          <span
            className="flex h-3 w-3 absolute -top-1.5 -left-1.5"
            title="Streaming logs"
            onClick={() => setSocketOpen(false)}
          >
            <span
              className={cls(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                {
                  "bg-green-400": readyState === ReadyState.OPEN,
                  "bg-red-400": readyState === ReadyState.CLOSED,
                  "bg-blue-400":
                    readyState !== ReadyState.OPEN &&
                    readyState !== ReadyState.CLOSED,
                }
              )}
            ></span>
            <span
              className={cls("relative inline-flex rounded-full h-3 w-3", {
                "bg-green-500": readyState === ReadyState.OPEN,
                "bg-red-500": readyState === ReadyState.CLOSED,
                "bg-blue-500":
                  readyState !== ReadyState.OPEN &&
                  readyState !== ReadyState.CLOSED,
              })}
            ></span>
          </span>
          <span
            className="text-white underline hover:cursor-pointer absolute top-1 right-2"
            onClick={() => {
              setSocketOpen(true);
              setShowLogs(false);
              setLogsLineHisoty([]);
            }}
          >
            close
          </span>
          <div
            ref={logTerminalEl}
            className="min-h-60 h-80 text-green-500 flex flex-col overflow-y-auto"
          >
            {logsHistory === null
              ? "[Empty log]"
              : logsHistory.map((log, i) => (
                  <div
                    key={log.timestamp}
                    ref={i === logsHistory.length - 1 ? logBottomEl : null} // set ref of the last message element
                  >
                    {log.message}
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
